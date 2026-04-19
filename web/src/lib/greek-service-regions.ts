/** Σταθερά ids για DB / API — συμβατά με Prisma String[] */

export type ServiceRegionId =
  | "athens_metro"
  | "thessaloniki_metro"
  | "patras"
  | "larissa"
  | "heraklion"
  | "greece_wide"
  | "greece_other";

export const SERVICE_REGION_IDS: readonly ServiceRegionId[] = [
  "athens_metro",
  "thessaloniki_metro",
  "patras",
  "larissa",
  "heraklion",
  "greece_other",
  "greece_wide",
] as const;

export const SERVICE_REGION_LABELS: Record<ServiceRegionId, string> = {
  athens_metro: "Αθήνα — ευρύτερο πολεοδομικό συγκρότημα",
  thessaloniki_metro: "Θεσσαλονίκη — ευρύτερη περιοχή",
  patras: "Πάτρα",
  larissa: "Λάρισα",
  heraklion: "Ηράκλειο Κρήτης",
  greece_other: "Λοιπή Ελλάδα (εκτός των παραπάνω πόλεων)",
  greece_wide: "Όλη η Ελλάδα (πανελλαδικά γραφεία)",
};

/** Bounding boxes (WGS84). Πρώτο ταίριασμα κερδίζει — μετά fallback `greece_other`. */
const REGION_BBOXES: { id: Exclude<ServiceRegionId, "greece_wide" | "greece_other">; minLat: number; maxLat: number; minLng: number; maxLng: number }[] = [
  { id: "athens_metro", minLat: 37.72, maxLat: 38.28, minLng: 23.42, maxLng: 24.08 },
  { id: "thessaloniki_metro", minLat: 40.42, maxLat: 40.76, minLng: 22.78, maxLng: 23.22 },
  { id: "patras", minLat: 38.18, maxLat: 38.34, minLng: 21.62, maxLng: 21.88 },
  { id: "larissa", minLat: 39.56, maxLat: 39.72, minLng: 22.34, maxLng: 22.52 },
  { id: "heraklion", minLat: 35.26, maxLat: 35.42, minLng: 24.92, maxLng: 25.28 },
];

export function isValidServiceRegionId(id: string): id is ServiceRegionId {
  return (SERVICE_REGION_IDS as readonly string[]).includes(id);
}

/** Περιοχή αγγελίας από συντεταγμένες — για φιλτράρισμα μεσιτών. */
export function inferListingServiceRegionId(lat: number, lng: number): Exclude<ServiceRegionId, "greece_wide"> {
  for (const b of REGION_BBOXES) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return b.id;
    }
  }
  return "greece_other";
}

/** Μεσίτης εμφανίζεται αν καλύπτει την περιοχή της αγγελίας ή έχει πανελλαδική κάλυψη. */
export function brokerCoversListingRegion(brokerRegions: string[], listingRegion: Exclude<ServiceRegionId, "greece_wide">): boolean {
  const set = new Set(brokerRegions);
  if (set.has("greece_wide")) return true;
  return set.has(listingRegion);
}
