"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";

type ListingLocationPickerMapProps = {
  lat: number;
  lng: number;
  locationPrecision: "exact" | "approximate";
  onCenterChange: (lat: number, lng: number) => void;
  /** Αυξάνεται όταν ο χρήστης διαλέγει διεύθυνση από λίστα — fly + zoom στην οδό */
  focusNonce?: number;
};

/** Το κέντρο του χάρτη = το σημείο της πινέζας — χαλαρή σύγκριση (parent κρατά toFixed(6)). */
function centersMatch(a: L.LatLngLiteral, b: L.LatLngLiteral): boolean {
  const da = Math.abs(a.lat - b.lat);
  const dl = Math.abs(a.lng - b.lng);
  return da < 2e-5 && dl < 2e-5;
}

export function ListingLocationPickerMap({
  lat,
  lng,
  locationPrecision,
  onCenterChange,
  focusNonce = 0,
}: ListingLocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const initialCenterRef = useRef({ lat, lng });
  const lastAppliedFocusNonceRef = useRef(-1);
  /** Αν η αλλαγή lat/lng ήρθε από τον χάρτη, μην καλείς setView/flyTo ξανά (ανταγωνισμός με drag). */
  const ignoreNextPropSyncRef = useRef(false);
  /**
   * Μόνο για throttled `move`: κόβει push κατά flyTo/setView από props.
   * Το moveend κάνει επιπλέον emit για τελικό κέντρο μετά από inertia.
   */
  const suppressThrottledMoveRef = useRef(false);
  const moveRafRef = useRef<number | null>(null);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = initialCenterRef.current;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([initialCenter.lat, initialCenter.lng], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    }).addTo(map);

    const emitCenter = () => {
      const center = map.getCenter();
      ignoreNextPropSyncRef.current = true;
      const la = Number(center.lat.toFixed(6));
      const ln = Number(center.lng.toFixed(6));
      onCenterChangeRef.current(la, ln);
    };

    const onMoveThrottled = () => {
      if (suppressThrottledMoveRef.current) return;
      if (moveRafRef.current != null) cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = requestAnimationFrame(() => {
        moveRafRef.current = null;
        emitCenter();
      });
    };

    const onMoveEnd = () => {
      if (moveRafRef.current != null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
      suppressThrottledMoveRef.current = false;
      emitCenter();
    };

    map.on("move", onMoveThrottled);
    map.on("moveend", onMoveEnd);

    mapRef.current = map;

    return () => {
      if (moveRafRef.current != null) cancelAnimationFrame(moveRafRef.current);
      map.off("move", onMoveThrottled);
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ignoreNextPropSyncRef.current) {
      ignoreNextPropSyncRef.current = false;
      return;
    }

    if (focusNonce > 0 && focusNonce !== lastAppliedFocusNonceRef.current) {
      lastAppliedFocusNonceRef.current = focusNonce;
      suppressThrottledMoveRef.current = true;
      map.flyTo([lat, lng], 17, { duration: 0.55 });
      return;
    }

    const center = map.getCenter();
    if (centersMatch(center, { lat, lng })) return;

    suppressThrottledMoveRef.current = true;
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, focusNonce]);

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl sm:h-[260px]">
      <div ref={containerRef} className="absolute inset-0 bg-muted" />

      {/* Σταθερό pin στο κέντρο — οι συντεταγμένες είναι πάντα map.getCenter() */}
      <div className="pointer-events-none absolute inset-0 z-[500]">
        <div className="absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded-full border bg-background/85 px-3 py-1 text-xs text-foreground backdrop-blur">
            {locationPrecision === "exact" ? "Ακριβές σημείο" : "Περίπου περιοχή"}
          </span>
        </div>
        <div className="absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full text-primary drop-shadow-md">
          <MapPin className="size-9" aria-hidden />
        </div>
        <div className="absolute left-1/2 top-1/2 z-[500] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-sm" />
      </div>
    </div>
  );
}
