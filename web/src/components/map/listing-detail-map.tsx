"use client";

import dynamic from "next/dynamic";

import type { Listing } from "@/components/listings/types";

const MapViewLeaflet = dynamic(
  () => import("@/components/map/map-view-leaflet").then((m) => m.MapViewLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[200px] w-full animate-pulse rounded-xl bg-muted sm:h-[240px]"
        aria-hidden
      />
    ),
  }
);

export function ListingDetailMap({ listing }: { listing: Listing }) {
  const precision = listing.locationPrecision === "exact" ? "exact" : "approximate";
  return (
    <MapViewLeaflet
      listings={[listing]}
      heightClassName="h-[200px] min-h-[180px] sm:h-[240px]"
      activeId={listing.id}
      className="rounded-xl border-0 shadow-none sm:rounded-xl"
      mapLabel={precision === "exact" ? "Ακριβές σημείο" : "Περίπου εδώ"}
      enableScrollWheelZoom={false}
      locationPrecision={precision}
    />
  );
}
