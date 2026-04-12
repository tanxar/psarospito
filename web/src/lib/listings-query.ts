import type { Prisma } from "@prisma/client";

type ListingRow = {
  highlights: unknown;
  subtitle: string;
  description?: string | null;
};

function parseOptionalInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function parseOptionalFloat(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Ορθογώνιο WGS84 από query string · null αν λείπει ή είναι άκυρο. */
export type ListingGeoBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function validateListingGeoBBox(b: ListingGeoBBox): ListingGeoBBox | null {
  if (b.minLat >= b.maxLat || b.minLng >= b.maxLng) return null;
  if (b.minLat < 33.5 || b.maxLat > 42.5 || b.minLng < 19 || b.maxLng > 30.5) return null;
  if (b.maxLat - b.minLat > 3 || b.maxLng - b.minLng > 3) return null;
  return b;
}

export function parseListingGeoBBox(sp: URLSearchParams): ListingGeoBBox | null {
  const minLat = parseOptionalFloat(sp.get("minLat"));
  const maxLat = parseOptionalFloat(sp.get("maxLat"));
  const minLng = parseOptionalFloat(sp.get("minLng"));
  const maxLng = parseOptionalFloat(sp.get("maxLng"));
  if (minLat == null || maxLat == null || minLng == null || maxLng == null) return null;
  return validateListingGeoBBox({ minLat, maxLat, minLng, maxLng });
}

/** Πολλαπλά bbox (JSON στο `areas`) — OR στη βάση. */
export function parseListingGeoBBoxes(sp: URLSearchParams): ListingGeoBBox[] {
  const raw = sp.get("areas");
  if (raw == null || raw === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: ListingGeoBBox[] = [];
  for (const x of parsed.slice(0, 8)) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const minLat = Number(o.minLat);
    const maxLat = Number(o.maxLat);
    const minLng = Number(o.minLng);
    const maxLng = Number(o.maxLng);
    if (![minLat, maxLat, minLng, maxLng].every((n) => Number.isFinite(n))) continue;
    const v = validateListingGeoBBox({ minLat, maxLat, minLng, maxLng });
    if (v) out.push(v);
  }
  return out;
}

function truthyParam(sp: URLSearchParams, key: string): boolean {
  const v = sp.get(key);
  return v === "1" || v === "true" || v === "yes";
}

/** Feature flags applied after DB fetch (highlights / subtitle heuristics). */
export type ListingPostFilters = {
  pets: boolean;
  parking: boolean;
  balcony: boolean;
  elevator: boolean;
  nearMetro: boolean;
  nearTram: boolean;
  renovated: boolean;
  bright: boolean;
};

export function parseListingPostFilters(sp: URLSearchParams): ListingPostFilters {
  return {
    pets: truthyParam(sp, "pets"),
    parking: truthyParam(sp, "parking"),
    balcony: truthyParam(sp, "balcony"),
    elevator: truthyParam(sp, "elevator"),
    nearMetro: truthyParam(sp, "nearMetro"),
    nearTram: truthyParam(sp, "nearTram"),
    renovated: truthyParam(sp, "renovated"),
    bright: truthyParam(sp, "bright"),
  };
}

export function listingMatchesPostFilters(row: ListingRow, f: ListingPostFilters): boolean {
  const hl = Array.isArray(row.highlights) ? (row.highlights as string[]) : [];
  const h = hl.map((x) => x.toLowerCase());
  const sub = `${row.subtitle} ${row.description ?? ""}`.toLowerCase();

  if (f.pets && !hl.some((x) => x.toLowerCase().includes("pets"))) return false;
  if (f.parking && !h.some((x) => x.includes("parking"))) return false;
  if (f.balcony && !h.some((x) => x.includes("balcony"))) return false;
  if (f.elevator && !h.some((x) => x.includes("elevator"))) return false;
  if (f.nearMetro && !h.some((x) => x.includes("near metro")) && !sub.includes("near metro")) {
    return false;
  }
  if (f.nearTram && !h.some((x) => x.includes("near tram")) && !sub.includes("near tram")) {
    return false;
  }
  if (f.renovated && !sub.includes("renovated")) return false;
  if (f.bright && !h.some((x) => x.includes("bright"))) return false;

  return true;
}

export function hasAnyPostFilter(f: ListingPostFilters): boolean {
  return Object.values(f).some(Boolean);
}

export function buildPrismaListingsWhere(
  sp: URLSearchParams
): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ isActive: true }];

  const deal = sp.get("dealType");
  if (deal === "sale" || deal === "rent") {
    and.push({ dealType: deal });
  }

  const priceEur: Prisma.IntFilter = {};
  const pMin = parseOptionalInt(sp.get("priceMinEur"));
  const pMax = parseOptionalInt(sp.get("priceMaxEur"));
  if (pMin != null) priceEur.gte = pMin;
  if (pMax != null) priceEur.lte = pMax;
  if (Object.keys(priceEur).length > 0) and.push({ priceEur });

  const sqm: Prisma.IntFilter = {};
  const sMin = parseOptionalInt(sp.get("sqmMin"));
  const sMax = parseOptionalInt(sp.get("sqmMax"));
  if (sMin != null) sqm.gte = sMin;
  if (sMax != null) sqm.lte = sMax;
  if (Object.keys(sqm).length > 0) and.push({ sqm });

  const rooms = sp.get("rooms");
  if (rooms === "studio") and.push({ roomsCount: 0 });
  else if (rooms === "1") and.push({ roomsCount: 1 });
  else if (rooms === "2") and.push({ roomsCount: 2 });
  else if (rooms === "3+" || rooms === "3plus") and.push({ roomsCount: { gte: 3 } });

  const multi = parseListingGeoBBoxes(sp);
  if (multi.length > 0) {
    and.push({
      OR: multi.map((b) => ({
        AND: [
          { lat: { gte: b.minLat, lte: b.maxLat } },
          { lng: { gte: b.minLng, lte: b.maxLng } },
        ],
      })),
    });
  } else {
    const geo = parseListingGeoBBox(sp);
    if (geo) {
      and.push({
        lat: { gte: geo.minLat, lte: geo.maxLat },
        lng: { gte: geo.minLng, lte: geo.maxLng },
      });
    }
  }

  return { AND: and };
}

/** Τιμές `sort` για `GET /api/listings` (συμβατό: `relevance` ≈ αυτόματη). */
export type ListingSortParam =
  | "auto"
  | "updated_desc"
  | "sqm_asc"
  | "sqm_desc"
  | "price_asc"
  | "price_desc"
  | "relevance";

export function listingsOrderBy(sp: URLSearchParams): Prisma.ListingOrderByWithRelationInput {
  const sort = (sp.get("sort") ?? "auto") as ListingSortParam;
  if (sort === "price_asc") return { priceEur: "asc" };
  if (sort === "price_desc") return { priceEur: "desc" };
  if (sort === "sqm_asc") return { sqm: "asc" };
  if (sort === "sqm_desc") return { sqm: "desc" };
  if (sort === "updated_desc") return { updatedAt: "desc" };
  if (sort === "relevance") return { createdAt: "desc" };
  return { createdAt: "desc" };
}
