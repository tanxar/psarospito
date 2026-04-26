"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { Listing } from "@/components/listings/types";
import { cn } from "@/lib/utils";
import { approximateAreaForListing } from "@/components/map/map-privacy";

/** Leaflet `L.circle().getBounds()` χρειάζεται χάρτη· εδώ bounds χωρίς προσθήκη layer. */
function squareBoundsCoveringCircleMeters(
  centerLat: number,
  centerLng: number,
  radiusM: number
): L.LatLngBounds {
  const latPad = radiusM / 111_320;
  const cos = Math.cos((centerLat * Math.PI) / 180);
  const lngPad = Math.abs(cos) > 1e-6 ? radiusM / (111_320 * cos) : latPad;
  return L.latLngBounds(
    [centerLat - latPad, centerLng - lngPad],
    [centerLat + latPad, centerLng + lngPad]
  );
}

export type MapSearchBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

function FitBoundsOrFocus({
  listings,
  locationPrecision,
  searchBboxes,
}: {
  listings: Listing[];
  locationPrecision: "exact" | "approximate";
  /** Ένωση bbox επιλεγμένων περιοχών αναζήτησης — zoom ώστε να φαίνονται όλες. */
  searchBboxes?: MapSearchBBox[];
}) {
  const map = useMap();
  const searchKey = useMemo(
    () => (searchBboxes ?? []).map((b) => `${b.minLat},${b.maxLat},${b.minLng},${b.maxLng}`).join("|"),
    [searchBboxes]
  );
  const key = useMemo(
    () =>
      `${searchKey}|${locationPrecision}|${listings.map((l) => `${l.id}:${l.location.lat},${l.location.lng}`).join("|")}`,
    [listings, locationPrecision, searchKey]
  );

  useEffect(() => {
    if (searchBboxes && searchBboxes.length > 0) {
      const first = searchBboxes[0]!;
      let b = L.latLngBounds(
        [first.minLat, first.minLng],
        [first.maxLat, first.maxLng]
      );
      for (let i = 1; i < searchBboxes.length; i++) {
        const bi = searchBboxes[i]!;
        b = b.extend(L.latLngBounds([bi.minLat, bi.minLng], [bi.maxLat, bi.maxLng]));
      }
      map.fitBounds(b, { padding: [56, 56], maxZoom: 11, animate: false });
      return;
    }

    if (!listings.length) return;
    if (listings.length === 1 && locationPrecision === "approximate") {
      const l = listings[0]!;
      const { center, radiusM } = approximateAreaForListing(l.location.lat, l.location.lng, l.id);
      const [cLat, cLng] = center;
      const b = squareBoundsCoveringCircleMeters(cLat, cLng, radiusM);
      map.fitBounds(b, { padding: [36, 36], maxZoom: 15, animate: false });
      return;
    }
    if (listings.length === 1) {
      const l = listings[0]!;
      map.setView([l.location.lat, l.location.lng], 15, { animate: false });
      return;
    }
    const bounds = listings.map((l) => [l.location.lat, l.location.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: false });
  }, [map, key, listings, locationPrecision, searchBboxes]);

  return null;
}

function ApproximateCircle({ listing }: { listing: Listing }) {
  const { center, radiusM } = useMemo(
    () => approximateAreaForListing(listing.location.lat, listing.location.lng, listing.id),
    [listing.id, listing.location.lat, listing.location.lng]
  );

  return (
    <Circle
      center={center}
      radius={radiusM}
      pathOptions={{
        color: "rgba(0, 48, 135, 0.42)",
        weight: 2,
        fillColor: "rgba(0, 48, 135, 0.14)",
        fillOpacity: 0.45,
      }}
    />
  );
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let raf = requestAnimationFrame(() => {
      map.invalidateSize();
    });

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => map.invalidateSize());
    });

    // Observe parent because that's what controls height.
    ro.observe(container.parentElement ?? container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [map]);

  return null;
}

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Keep silent; fallback UI handles it.
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function priceIcon(priceEur: number, opts?: { active?: boolean; compact?: boolean }) {
  const label = `€${priceEur.toLocaleString("el-GR")}`;
  const active = opts?.active === true;
  const compact = opts?.compact === true;
  return L.divIcon({
    className: "",
    html: `
      <div style="transform: translateY(-6px); display: inline-flex; flex-direction: column; align-items: center;">
        <div
          style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: ${compact ? "6px 8px" : "6px 10px"};
            border-radius: 9999px;
            border: 1px solid ${active ? "rgba(0, 48, 135, 0.55)" : "rgba(226, 232, 240, 1)"};
            background: rgba(255, 255, 255, 0.92);
            box-shadow: ${active ? "0 14px 34px rgba(0, 48, 135, 0.18), 0 10px 24px rgba(15, 23, 42, 0.10), 0 1px 10px rgba(15, 23, 42, 0.06)" : "0 10px 24px rgba(15, 23, 42, 0.10), 0 1px 10px rgba(15, 23, 42, 0.06)"};
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            font: 600 12px/1 Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
            letter-spacing: -0.01em;
            color: rgba(15, 23, 42, 0.92);
            white-space: nowrap;
          "
        >
          <span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${active ? "rgba(0,48,135,1)" : "rgba(0,48,135,0.85)"};"></span>
          <span style="display:${compact ? "none" : "inline"};">${label}</span>
        </div>
        <div
          style="
            width: 10px;
            height: 10px;
            background: rgba(255, 255, 255, 0.92);
            border-right: 1px solid ${active ? "rgba(0, 48, 135, 0.55)" : "rgba(226, 232, 240, 1)"};
            border-bottom: 1px solid ${active ? "rgba(0, 48, 135, 0.55)" : "rgba(226, 232, 240, 1)"};
            transform: translateY(-5px) rotate(45deg);
            box-shadow: 8px 8px 16px rgba(15, 23, 42, 0.05);
          "
        ></div>
      </div>
    `,
    iconSize: [1, 1],
    iconAnchor: [0, 30],
  });
}

function Markers({
  listings,
  activeId,
  onSelect,
}: {
  listings: Listing[];
  activeId: string | null;
  onSelect?: (id: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const compact = zoom < 13;

  return (
    <>
      {listings.map((l) => (
        <Marker
          key={l.id}
          position={[l.location.lat, l.location.lng]}
          icon={priceIcon(l.priceEur, { active: activeId === l.id, compact })}
          eventHandlers={{
            click: () => {
              onSelect?.(l.id);
              const el = document.getElementById(`listing-${l.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            },
          }}
        />
      ))}
    </>
  );
}

export function MapViewLeaflet({
  listings,
  heightClassName,
  activeId,
  onSelect,
  className,
  mapLabel = "Χάρτης",
  enableScrollWheelZoom = true,
  locationPrecision = "exact",
  searchBboxes,
}: {
  listings: Listing[];
  heightClassName?: string;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Root wrapper — default includes rounded-3xl border */
  className?: string;
  /** Small badge top-left */
  mapLabel?: string | null;
  /** Επιτρέπεται zoom με ροδέλα ποντικιού */
  enableScrollWheelZoom?: boolean;
  /** Σελίδα αγγελίας: κύκλος περιοχής αντί για ακριβή καρφίτσα */
  locationPrecision?: "exact" | "approximate";
  /** Επιλεγμένες περιοχές αναζήτησης — το χάρτη κάνει zoom ώστε να χωράνε όλα τα bbox. */
  searchBboxes?: MapSearchBBox[];
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [canMountLeaflet, setCanMountLeaflet] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = hostRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setCanMountLeaflet(rect.width > 0 && rect.height > 0);
    };
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted]);

  const center = useMemo(() => {
    if (!listings.length) return { lat: 37.98, lng: 23.73 };
    const avgLat = listings.reduce((s, l) => s + l.location.lat, 0) / listings.length;
    const avgLng = listings.reduce((s, l) => s + l.location.lng, 0) / listings.length;
    return { lat: avgLat, lng: avgLng };
  }, [listings]);

  const height = heightClassName ?? "h-[72dvh] lg:h-full";
  const iframeSrc = useMemo(() => {
    const dLat = 0.055;
    const dLng = 0.075;
    const left = center.lng - dLng;
    const right = center.lng + dLng;
    const top = center.lat + dLat;
    const bottom = center.lat - dLat;
    const bbox = `${left}%2C${bottom}%2C${right}%2C${top}`;
    const marker = `${center.lat}%2C${center.lng}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  }, [center.lat, center.lng]);

  return (
    <div
      className={cn("w-full overflow-hidden rounded-3xl border bg-card shadow-none", className)}
    >
      <div ref={hostRef} className={["relative w-full", height].join(" ")}>
        {mounted && canMountLeaflet ? (
          <MapErrorBoundary
            fallback={
              <iframe
                title="Map"
                className="absolute inset-0 h-full w-full bg-muted"
                src={iframeSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            }
          >
            <MapContainer
              center={[center.lat, center.lng]}
              zoom={12}
              scrollWheelZoom={enableScrollWheelZoom}
              zoomControl={false}
              className="absolute inset-0 bg-muted"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <InvalidateSize />
              <FitBoundsOrFocus
                listings={listings}
                locationPrecision={locationPrecision}
                searchBboxes={searchBboxes}
              />
              {locationPrecision === "approximate" && listings.length === 1 ? (
                <ApproximateCircle listing={listings[0]!} />
              ) : (
                <Markers listings={listings} activeId={activeId ?? null} onSelect={onSelect} />
              )}
            </MapContainer>
          </MapErrorBoundary>
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}

        {mapLabel ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border bg-background/80 px-3 py-1 text-xs text-foreground backdrop-blur">
            {mapLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

