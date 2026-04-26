import type { Listing, ListingImage, ListingPanorama } from "@prisma/client";

export type ListingWithImages = Listing & { images: ListingImage[]; panoramas: ListingPanorama[] };

export function listingToJson(r: ListingWithImages) {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description ?? "",
    priceEur: r.priceEur,
    roomsCount: r.roomsCount,
    sqm: r.sqm,
    highlights: Array.isArray(r.highlights) ? (r.highlights as string[]) : [],
    imageSrc: r.coverImageSrc,
    images: r.images.map((i) => i.src),
    panoramaImages: r.panoramas.map((p) => p.src),
    dealType: r.dealType === "sale" ? ("sale" as const) : ("rent" as const),
    addressLine: r.addressLine ?? "",
    locationPrecision:
      r.addressVisibility === "exact" ? ("exact" as const) : ("approximate" as const),
    location: { lat: r.lat, lng: r.lng },
  };
}
