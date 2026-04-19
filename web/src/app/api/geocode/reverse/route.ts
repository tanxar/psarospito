import { NextResponse } from "next/server";

import {
  geocodeCacheGet,
  geocodeCacheSet,
  getClientIp,
  normalizeGeocodeQuery,
  takeGeocodeRateLimit,
} from "@/lib/geocode-cache-rate-limit";

export const dynamic = "force-dynamic";

const REVERSE_CACHE_PREFIX = "v1-rev:";

type MapboxFeature = {
  place_name?: string;
  place_name_el?: string;
  text?: string;
  place_type?: string[];
};

function labelFromMapboxFeature(r: MapboxFeature): string {
  const pn = typeof r.place_name === "string" ? r.place_name.trim() : "";
  if (pn) return pn;
  const el = typeof r.place_name_el === "string" ? r.place_name_el.trim() : "";
  if (el) return el;
  const tx = typeof r.text === "string" ? r.text.trim() : "";
  return tx;
}

/** Προτιμούμε διεύθυνση με αριθμό αν υπάρχει, αλλιώς πρώτο αποτέλεσμα. */
function pickBestLabel(features: MapboxFeature[]): string | null {
  if (!features.length) return null;
  const addr = features.find((f) => Array.isArray(f.place_type) && f.place_type.includes("address"));
  const chosen = addr ?? features[0];
  const label = chosen ? labelFromMapboxFeature(chosen).trim() : "";
  return label.length > 0 ? label : null;
}

/** Χωρίς Mapbox token ή όταν το Mapbox γυρνά κενό — OSM Nominatim (πρέπει σταθερό User-Agent). */
async function nominatimReverse(lat: number, lng: number): Promise<string | null> {
  const upstream = new URL("https://nominatim.openstreetmap.org/reverse");
  upstream.searchParams.set("lat", String(lat));
  upstream.searchParams.set("lon", String(lng));
  upstream.searchParams.set("format", "json");
  upstream.searchParams.set("accept-language", "el,en");
  upstream.searchParams.set("addressdetails", "1");

  const res = await fetch(upstream.toString(), {
    cache: "no-store",
    headers: {
      "User-Agent":
        process.env.NOMINATIM_USER_AGENT?.trim() ||
        "NestioListings/1.0 (contact: configure NOMINATIM_USER_AGENT in web/.env)",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const full = typeof json.display_name === "string" ? json.display_name.trim() : "";
  if (full.length > 0) return full;
  const a = json.address;
  if (a && typeof a === "object") {
    const road = typeof a.road === "string" ? a.road : "";
    const city = typeof a.city === "string" ? a.city : typeof a.town === "string" ? a.town : "";
    const country = typeof a.country === "string" ? a.country : "";
    const bits = [road, city, country].filter(Boolean);
    if (bits.length > 0) return bits.join(", ");
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const tokenRaw = process.env.MAPBOX_ACCESS_TOKEN?.trim();
    const token = tokenRaw ?? "";

    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat")?.replace(",", "."));
    const lng = Number(url.searchParams.get("lng")?.replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ label: null }, { status: 400 });
    }

    const roundedKey = `${REVERSE_CACHE_PREFIX}${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cacheKey = normalizeGeocodeQuery(roundedKey);
    const cached = geocodeCacheGet(cacheKey);
    if (cached?.[0]?.label) {
      return NextResponse.json(
        { label: cached[0].label },
        {
          headers: {
            "X-Geocode-Cache": "HIT",
            "X-Geocode-Token-Present": token ? "1" : "0",
          },
        }
      );
    }

    const rate = takeGeocodeRateLimit(getClientIp(req));
    if (!rate.ok) {
      return NextResponse.json(
        { label: null, error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSec),
            "X-Geocode-RateLimit": "exceeded",
          },
        }
      );
    }

    let label: string | null = null;
    let mapboxAttempted = false;

    if (token) {
      mapboxAttempted = true;
      function buildReverseUrl(includeTypes: boolean): string {
        const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`;
        const upstream = new URL(endpoint);
        upstream.searchParams.set("access_token", token);
        upstream.searchParams.set("language", "el,en");
        upstream.searchParams.set("country", "gr");
        if (includeTypes) {
          upstream.searchParams.set(
            "types",
            "address,neighborhood,locality,place,postcode,district,region,poi"
          );
        }
        upstream.searchParams.set("limit", "8");
        return upstream.toString();
      }

      async function fetchFeatures(includeTypes: boolean): Promise<{ features: MapboxFeature[]; ok: boolean }> {
        const res = await fetch(buildReverseUrl(includeTypes), { cache: "no-store" });
        if (!res.ok) return { features: [], ok: false };
        const json = (await res.json().catch(() => ({}))) as { features?: MapboxFeature[] };
        const features = Array.isArray(json.features) ? json.features : [];
        return { features, ok: true };
      }

      let { features, ok } = await fetchFeatures(true);
      if (ok) {
        if (features.length === 0) {
          ({ features } = await fetchFeatures(false));
        }
        label = pickBestLabel(features);
      }
    }

    if (!label) {
      label = await nominatimReverse(lat, lng);
    }

    if (label) {
      geocodeCacheSet(cacheKey, [{ label, lat, lng, kind: "reverse" }]);
    }

    return NextResponse.json(
      { label },
      {
        headers: {
          "X-Geocode-Cache": label ? "MISS" : "skip",
          "X-Geocode-Token-Present": token ? "1" : "0",
          "X-Geocode-Mapbox": mapboxAttempted ? "tried" : "skipped",
          "X-Geocode-RateLimit-Remaining": String(rate.remaining),
          ...(label && !token ? { "X-Geocode-Source": "nominatim" } : {}),
        },
      }
    );
  } catch {
    return NextResponse.json({ label: null }, { status: 200 });
  }
}
