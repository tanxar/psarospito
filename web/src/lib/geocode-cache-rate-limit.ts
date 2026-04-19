export type GeocodeApiResult = { label: string; lat: number; lng: number; kind: string };

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Stable cache key — must match scoring input (`q`) normalization in the route. */
export function normalizeGeocodeQuery(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s,.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

const CACHE_MAX = parseEnvInt("GEOCODE_CACHE_MAX_ENTRIES", 800);
const CACHE_TTL_MS = parseEnvInt("GEOCODE_CACHE_TTL_MS", 300_000);
const RATE_MAX = parseEnvInt("GEOCODE_RATE_LIMIT_MAX", 60);
const RATE_WINDOW_MS = parseEnvInt("GEOCODE_RATE_LIMIT_WINDOW_MS", 60_000);

type CacheEntry = { expiresAt: number; payload: GeocodeApiResult[] };
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): GeocodeApiResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  // Do not reuse stale empty payloads (e.g. cached before Mapbox `types` fix or transient failures).
  if (hit.payload.length === 0) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, hit);
  return hit.payload;
}

function cacheSet(key: string, payload: GeocodeApiResult[]): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload,
  });
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

const rateBuckets = new Map<string, number[]>();

export function geocodeCacheGet(normalizedQuery: string): GeocodeApiResult[] | null {
  if (normalizedQuery.length < 2) return null;
  return cacheGet(normalizedQuery);
}

export function geocodeCacheSet(normalizedQuery: string, payload: GeocodeApiResult[]): void {
  if (normalizedQuery.length < 2 || payload.length === 0) return;
  cacheSet(normalizedQuery, payload);
}

export type RateLimitOutcome =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function takeGeocodeRateLimit(ip: string): RateLimitOutcome {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const stamps = (rateBuckets.get(ip) ?? []).filter((t) => t > cutoff);

  if (stamps.length >= RATE_MAX) {
    const oldest = stamps[0];
    const retryAfterMs = oldest !== undefined ? oldest + RATE_WINDOW_MS - now : RATE_WINDOW_MS;
    rateBuckets.set(ip, stamps);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  stamps.push(now);
  rateBuckets.set(ip, stamps);

  if (rateBuckets.size > 50_000) {
    for (const [k, list] of rateBuckets) {
      const next = list.filter((t) => t > cutoff);
      if (next.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, next);
    }
  }

  return { ok: true, remaining: Math.max(0, RATE_MAX - stamps.length) };
}
