"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";

import type { Listing } from "@/components/listings/types";

export function MapView({
  listings,
  heightClassName,
  preferInteractive,
}: {
  listings: Listing[];
  heightClassName?: string;
  preferInteractive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const interactive = preferInteractive === true;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(interactive ? "loading" : "ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallback, setFallback] = useState(!interactive);

  const center = useMemo(() => {
    if (!listings.length) return { lng: 23.73, lat: 37.98 };
    const avgLat = listings.reduce((s, l) => s + l.location.lat, 0) / listings.length;
    const avgLng = listings.reduce((s, l) => s + l.location.lng, 0) / listings.length;
    return { lng: avgLng, lat: avgLat };
  }, [listings]);

  const height = heightClassName ?? "h-[72dvh] lg:h-full";

  useEffect(() => {
    if (!interactive) return;

    if (!containerRef.current) return;
    if (mapRef.current) return;

    const timer = window.setTimeout(() => {
      setFallback(true);
      setStatus("error");
      setErrorMsg("Map tiles are taking too long to load");
    }, 3500);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [center.lng, center.lat],
      zoom: 12.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    const tilesInterval = window.setInterval(() => {
      try {
        if (map.isStyleLoaded() && map.areTilesLoaded()) {
          window.clearInterval(tilesInterval);
          window.clearTimeout(timer);
          setStatus("ready");
          // Keep fallback unless you explicitly want interactive (it often paints white on some setups).
          setFallback(false);
          // Ensure proper rendering after visibility/layout changes.
          map.resize();
        }
      } catch {
        // ignore
      }
    }, 250);

    map.on("load", () => {
      // keep "loading" until tiles are actually loaded
    });
    map.on("error", (e) => {
      window.clearTimeout(timer);
      window.clearInterval(tilesInterval);
      setStatus("error");
      const raw = (e as unknown as { error?: { message?: unknown } }).error?.message;
      const msg = typeof raw === "string" ? raw : null;
      setErrorMsg(msg ?? "Map failed to load");
      setFallback(true);
    });

    mapRef.current = map;

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tilesInterval);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    const wrapper = wrapperRef.current;
    if (!map || !wrapper) return;

    const ro = new ResizeObserver(() => {
      try {
        map.resize();
      } catch {
        // ignore
      }
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    listings.forEach((l) => {
      const el = document.createElement("a");
      el.href = `/listing/${l.id}`;
      el.className =
        "group inline-flex items-center justify-center rounded-full border bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur hover:bg-white";
      el.style.transform = "translateY(-6px)";
      el.innerText = `€${l.priceEur.toLocaleString("el-GR")}`;

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([l.location.lng, l.location.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [listings]);

  return (
    <div className="w-full overflow-hidden rounded-3xl border bg-card shadow-none">
      <div ref={wrapperRef} className={["relative w-full", height].join(" ")}>
        {/* Always render fallback below; fade it out when map is ready. */}
        <iframe
          title="OpenStreetMap"
          className="absolute inset-0 h-full w-full transition-opacity duration-300"
          style={{
            opacity: fallback ? 1 : 0,
            pointerEvents: fallback ? "auto" : "none",
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src="https://www.openstreetmap.org/export/embed.html?bbox=23.62%2C37.90%2C23.86%2C38.06&layer=mapnik"
        />

        <div
          ref={containerRef}
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: fallback ? 0 : 1 }}
        />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border bg-background/80 px-3 py-1 text-xs text-foreground backdrop-blur">
          Map
        </div>
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-2xl border bg-background/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
          Tip: click a price to open the listing
        </div>
        {interactive && status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="rounded-2xl border bg-background/90 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
              {status === "loading" ? "Loading map…" : `Map error: ${errorMsg ?? "unknown"}`}
            </div>
          </div>
        ) : null}
      </div>
      {/* prefetch hint */}
      <Link href="/listing/l1" className="hidden">
        listing
      </Link>
    </div>
  );
}

