/**
 * Εμφανίζουμε περιοχή ~χωρίς ακριβές σημείο: κύκλος τέτοιος ώστε το πραγματικό
 * σημείο να βρίσκεται μέσα στον δίσκο, με κέντρο μετατοπισμένο (σταθερά από id).
 */
export function approximateAreaForListing(
  lat: number,
  lng: number,
  listingId: string
): { center: [number, number]; radiusM: number } {
  const h = (salt: number) => {
    let x = 2166136261 ^ salt;
    for (let i = 0; i < listingId.length; i++) {
      x = Math.imul(x ^ listingId.charCodeAt(i), 16777619);
    }
    return x >>> 0;
  };

  const u1 = (h(0x4e17) % 10_000) / 10_000;
  const u2 = (h(0x8d2f) % 10_000) / 10_000;

  const radiusM = 460 + u1 * 240;
  const angle = u2 * Math.PI * 2;
  const offsetM = radiusM * (0.3 + u1 * 0.14);

  const dLat = (offsetM * Math.cos(angle)) / 111_320;
  const dLng = (offsetM * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));

  return {
    center: [lat + dLat, lng + dLng],
    radiusM,
  };
}
