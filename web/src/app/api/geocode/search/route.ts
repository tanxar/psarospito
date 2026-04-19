import { NextResponse } from "next/server";

import {
  geocodeCacheGet,
  geocodeCacheSet,
  getClientIp,
  normalizeGeocodeQuery,
  takeGeocodeRateLimit,
} from "@/lib/geocode-cache-rate-limit";

export const dynamic = "force-dynamic";

/** Bump when ranking / Mapbox strategy changes — avoids stale cached ordering. */
const GEOCODE_CACHE_KEY_PREFIX = "v4-merge-house:";

type MapboxFeature = {
  id?: string;
  place_name?: string;
  place_name_el?: string;
  text?: string;
  place_type?: string[];
  relevance?: number;
  center?: [number, number];
  geometry?: { type?: string; coordinates?: unknown };
};

function labelFromMapboxFeature(r: MapboxFeature): string {
  const pn = typeof r.place_name === "string" ? r.place_name.trim() : "";
  if (pn) return pn;
  const el = typeof r.place_name_el === "string" ? r.place_name_el.trim() : "";
  if (el) return el;
  const tx = typeof r.text === "string" ? r.text.trim() : "";
  return tx;
}

function lngLatFromMapboxFeature(r: MapboxFeature): { lat: number; lng: number } | null {
  const c0 = Number(r.center?.[0]);
  const c1 = Number(r.center?.[1]);
  if (Number.isFinite(c0) && Number.isFinite(c1)) return { lng: c0, lat: c1 };
  const coords = r.geometry?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lng, lat };
  }
  return null;
}

function numberTokensFromText(input: string) {
  const matches = input.match(/\b\d+[a-zA-Zα-ωΑ-Ω]?\b/g);
  return matches ? matches.map((m) => m.toLowerCase()) : [];
}

const MAPBOX_TYPES_ADDRESS_ONLY = "address";
const MAPBOX_TYPES_BROAD =
  "address,neighborhood,locality,place,postcode,district,region";

function labelHasStreetNumber(label: string): boolean {
  return /\d/.test(label);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Mapbox often returns only "Οδός, ΤΚ Πόλη" without the typed house number.
 * Merge standalone numeric tokens from the user's query into the first segment (street part).
 */
function mergeQueryHouseNumbersIntoLabel(label: string, rawQuery: string): string {
  const qNorm = normalizeGeocodeQuery(rawQuery);
  const wantNums = numberTokensFromText(qNorm);
  if (wantNums.length === 0) return label;

  const segments = label.split(",").map((s) => s.trim());
  const head = segments[0] ?? label;

  const missing = wantNums.filter((n) => {
    const standalone = new RegExp(`(^|[\\s,.-])${escapeRegExp(n)}(?=$|[\\s,.-])`, "u");
    return !standalone.test(head);
  });
  if (missing.length === 0) return label;

  segments[0] = `${head} ${missing.join(" ")}`.trim();
  return segments.join(", ");
}

function mapboxTypeBonus(type: string) {
  if (type === "address") return 0.12;
  if (type === "district" || type === "neighborhood") return 0.08;
  if (type === "place" || type === "locality" || type === "postcode" || type === "region") return 0.04;
  return 0;
}

async function fetchMapboxFeatures(
  query: string,
  token: string,
  types: string
): Promise<{ features: MapboxFeature[]; httpStatus: number }> {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
  const upstream = new URL(endpoint);
  upstream.searchParams.set("access_token", token);
  upstream.searchParams.set("autocomplete", "true");
  upstream.searchParams.set("language", "el,en");
  upstream.searchParams.set("country", "gr");
  upstream.searchParams.set("types", types);
  upstream.searchParams.set("limit", "10");
  upstream.searchParams.set("fuzzyMatch", "true");
  upstream.searchParams.set("proximity", "23.7275,37.9838");

  const res = await fetch(upstream.toString(), { cache: "no-store" });
  const httpStatus = res.status;
  if (!res.ok) return { features: [], httpStatus };
  const json = (await res.json().catch(() => ({}))) as { features?: MapboxFeature[] };
  return {
    features: Array.isArray(json.features) ? json.features : [],
    httpStatus,
  };
}

async function collectFeaturesForVariants(
  variants: string[],
  token: string,
  types: string,
  maxFeatures: number
): Promise<{ features: MapboxFeature[]; lastStatus: number }> {
  const features: MapboxFeature[] = [];
  const seen = new Set<string>();
  let lastStatus = 200;
  for (const variant of variants) {
    const { features: chunk, httpStatus } = await fetchMapboxFeatures(variant, token, types);
    lastStatus = httpStatus;
    for (const f of chunk) {
      const label = labelFromMapboxFeature(f);
      const key = f.id ?? label;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      features.push(f);
      if (features.length >= maxFeatures) return { features, lastStatus };
    }
  }
  return { features, lastStatus };
}

export async function GET(req: Request) {
  try {
    const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { results: [] },
        {
          status: 200,
          headers: {
            "X-Geocode-Token-Present": "0",
            "X-Geocode-Hint": "set_MAPBOX_ACCESS_TOKEN_in_web/.env_and_restart_dev_server",
          },
        }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const normalizedQuery = normalizeGeocodeQuery(q);
    const cached = geocodeCacheGet(`${GEOCODE_CACHE_KEY_PREFIX}${normalizedQuery}`);
    if (cached) {
      return NextResponse.json(
        { results: cached },
        {
          headers: {
            "X-Geocode-Cache": "HIT",
            "X-Geocode-Token-Present": "1",
          },
        }
      );
    }

    const rate = takeGeocodeRateLimit(getClientIp(req));
    if (!rate.ok) {
      return NextResponse.json(
        { results: [], error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSec),
            "X-Geocode-RateLimit": "exceeded",
          },
        }
      );
    }
    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    const queryNumberTokens = numberTokensFromText(normalizedQuery);
    const queryWithoutNumbers = normalizedQuery
      .split(" ")
      .filter((token) => !/^\d+[a-zA-Zα-ωΑ-Ω]?$/.test(token))
      .join(" ")
      .trim();
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const lastToken = tokens[tokens.length - 1] ?? "";
    const queryWithoutLastToken =
      lastToken.length >= 1 && tokens.length > 1 ? tokens.slice(0, -1).join(" ").trim() : "";
    const queryVariants = [q, queryWithoutLastToken, queryWithoutNumbers].filter(
      (value, idx, arr): value is string => Boolean(value && arr.indexOf(value) === idx)
    );

    let { features, lastStatus: lastMapboxHttpStatus } = await collectFeaturesForVariants(
      queryVariants,
      token,
      MAPBOX_TYPES_ADDRESS_ONLY,
      14
    );
    if (features.length === 0) {
      const broad = await collectFeaturesForVariants(queryVariants, token, MAPBOX_TYPES_BROAD, 14);
      features = broad.features;
      lastMapboxHttpStatus = broad.lastStatus;
    }

    const genericAreaKinds = new Set(["place", "locality", "neighborhood", "district", "region"]);

    const scored = features
      .map((r) => {
        const ll = lngLatFromMapboxFeature(r);
        const label = labelFromMapboxFeature(r);
        if (!label || !ll) return null;
        const { lat, lng } = ll;
        const relevance = Number(r.relevance);
        const kind = Array.isArray(r.place_type) ? (r.place_type[0] ?? "") : "";
        const normalizedLabel = normalizeGeocodeQuery(label);
        const startsWith = normalizedLabel.startsWith(normalizedQuery);
        const includes = normalizedLabel.includes(normalizedQuery);
        const matchedTokens = queryTokens.filter((token) => normalizedLabel.includes(token)).length;
        const tokenCoverage = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
        const labelNumberTokens = numberTokensFromText(normalizedLabel);
        const labelHasStandaloneQueryNumbers =
          queryNumberTokens.length > 0 &&
          queryNumberTokens.some((num) =>
            new RegExp(`(^|[\\s,.-])${escapeRegExp(num)}(?=$|[\\s,.-])`, "u").test(normalizedLabel)
          );
        const hasAddressNumberMatch =
          labelHasStandaloneQueryNumbers ||
          (queryNumberTokens.length > 0 && queryNumberTokens.some((num) => labelNumberTokens.includes(num)));
        const noAddressNumberWhenRequested = queryNumberTokens.length > 0 && labelNumberTokens.length === 0;

        const labelHasNumber = labelHasStreetNumber(label);
        const isGenericAreaOnly = genericAreaKinds.has(kind) && !labelHasNumber;
        const vagueStreetAddress = kind === "address" && !labelHasNumber;

        const categoryBonus = mapboxTypeBonus(kind);
        const numberMatchBonus = hasAddressNumberMatch ? 0.85 : 0;
        const noNumberPenalty = noAddressNumberWhenRequested ? -0.45 : 0;

        const addressPointBonus = kind === "address" ? 1.2 : 0;
        const labelDigitBonus = labelHasNumber ? 0.95 : 0;
        const genericAreaPenalty = isGenericAreaOnly ? -3.2 : 0;
        const vagueAddressPenalty = vagueStreetAddress ? -0.55 : 0;

        const score =
          (Number.isFinite(relevance) ? relevance : 0) +
          (startsWith ? 0.35 : includes ? 0.12 : 0) +
          tokenCoverage * 0.35 +
          categoryBonus +
          numberMatchBonus +
          noNumberPenalty +
          addressPointBonus +
          labelDigitBonus +
          genericAreaPenalty +
          vagueAddressPenalty;

        return { id: r.id ?? label, label, lat, lng, score, kind };
      })
      .filter((x): x is { id: string; label: string; lat: number; lng: number; score: number; kind: string } => x != null)
      .sort((a, b) => b.score - a.score)
      .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id || x.label === item.label) === index);

    const specificEnough = scored.filter((r) => r.kind === "address" || labelHasStreetNumber(r.label));
    const picked = specificEnough.length > 0 ? specificEnough : scored;

    const results = picked.slice(0, 6).map(({ label, lat, lng, kind }) => ({
      label: mergeQueryHouseNumbersIntoLabel(label, q),
      lat,
      lng,
      kind,
    }));

    geocodeCacheSet(`${GEOCODE_CACHE_KEY_PREFIX}${normalizedQuery}`, results);

    return NextResponse.json(
      { results },
      {
        headers: {
          "X-Geocode-Cache": "MISS",
          "X-Geocode-Token-Present": "1",
          "X-Geocode-Mapbox-Last-Status": String(lastMapboxHttpStatus),
          "X-Geocode-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  } catch {
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
