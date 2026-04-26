"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { ListingCard } from "@/components/listings/listing-card";
import type { Listing } from "@/components/listings/types";
import { useSavedListings } from "@/components/saved/use-saved";
import { Input } from "@/components/ui/input";

const MapViewLeaflet = dynamic(
  () => import("@/components/map/map-view-leaflet").then((m) => m.MapViewLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="w-full overflow-hidden rounded-3xl border bg-card shadow-none">
        <div className="h-[44dvh] min-h-[320px] sm:h-[calc(100dvh-176px)] sm:min-h-[520px] bg-muted" />
      </div>
    ),
  }
);

export function BrokerListingsWithMap({ listings }: { listings: Listing[] }) {
  const saved = useSavedListings();
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sqmMin, setSqmMin] = useState("");
  const [sqmMax, setSqmMax] = useState("");
  const [rooms, setRooms] = useState<"" | "studio" | "1" | "2" | "3+">("");
  const [openFilter, setOpenFilter] = useState<null | "price" | "sqm" | "rooms">(null);

  const filteredListings = useMemo(() => {
    const pMin = Number(priceMin);
    const pMax = Number(priceMax);
    const sMin = Number(sqmMin);
    const sMax = Number(sqmMax);
    return listings.filter((l) => {
      if (priceMin && Number.isFinite(pMin) && l.priceEur < pMin) return false;
      if (priceMax && Number.isFinite(pMax) && l.priceEur > pMax) return false;
      if (sqmMin && Number.isFinite(sMin) && l.sqm < sMin) return false;
      if (sqmMax && Number.isFinite(sMax) && l.sqm > sMax) return false;
      if (rooms === "studio" && l.roomsCount !== 0) return false;
      if (rooms === "1" && l.roomsCount !== 1) return false;
      if (rooms === "2" && l.roomsCount !== 2) return false;
      if (rooms === "3+" && l.roomsCount < 3) return false;
      return true;
    });
  }, [listings, priceMin, priceMax, sqmMin, sqmMax, rooms]);

  function clearFilters() {
    setPriceMin("");
    setPriceMax("");
    setSqmMin("");
    setSqmMax("");
    setRooms("");
  }


  const ROOM_OPTIONS = [
    { id: "", label: "Αδιάφορο" },
    { id: "studio", label: "Studio" },
    { id: "1", label: "1 δωμάτιο" },
    { id: "2", label: "2 δωμάτια" },
    { id: "3+", label: "3+ δωμάτια" },
  ] as const;

  const PRICE_MIN_OPTIONS = [
    { value: "", label: "Αδιάφορο" },
    { value: "300", label: "300€+" },
    { value: "500", label: "500€+" },
    { value: "700", label: "700€+" },
    { value: "1000", label: "1.000€+" },
    { value: "1500", label: "1.500€+" },
    { value: "2500", label: "2.500€+" },
  ] as const;

  const PRICE_MAX_OPTIONS = [
    { value: "", label: "Αδιάφορο" },
    { value: "500", label: "έως 500€" },
    { value: "800", label: "έως 800€" },
    { value: "1200", label: "έως 1.200€" },
    { value: "1800", label: "έως 1.800€" },
    { value: "2500", label: "έως 2.500€" },
    { value: "4000", label: "έως 4.000€" },
  ] as const;

  const SQM_MIN_OPTIONS = [
    { value: "", label: "Αδιάφορο" },
    { value: "30", label: "30+ τ.μ." },
    { value: "50", label: "50+ τ.μ." },
    { value: "70", label: "70+ τ.μ." },
    { value: "90", label: "90+ τ.μ." },
    { value: "120", label: "120+ τ.μ." },
    { value: "160", label: "160+ τ.μ." },
  ] as const;

  const SQM_MAX_OPTIONS = [
    { value: "", label: "Αδιάφορο" },
    { value: "50", label: "έως 50 τ.μ." },
    { value: "80", label: "έως 80 τ.μ." },
    { value: "110", label: "έως 110 τ.μ." },
    { value: "150", label: "έως 150 τ.μ." },
    { value: "200", label: "έως 200 τ.μ." },
    { value: "300", label: "έως 300 τ.μ." },
  ] as const;

  const priceLabel = priceMin || priceMax ? `Τιμή ${priceMin ? `€${priceMin}` : "από *"} - ${priceMax ? `€${priceMax}` : "*"}`
    : "Τιμή";
  const sqmLabel = sqmMin || sqmMax ? `Εμβαδόν ${sqmMin || "*"}-${sqmMax || "*"} τ.μ.` : "Εμβαδόν";
  const selectedRoomsLabel = ROOM_OPTIONS.find((r) => r.id === rooms)?.label ?? "Δωμάτια";
  const hasActiveFilters = !!(priceMin || priceMax || sqmMin || sqmMax || rooms);

  useEffect(() => {
    if (!openFilter) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (filtersRef.current?.contains(target)) return;
      setOpenFilter(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [openFilter]);

  return (
    <div className="space-y-4">
      <div
        ref={filtersRef}
        className="relative z-20 rounded-2xl border border-border/60 bg-card p-3.5 sm:p-4"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          if (target.closest("[data-filter-trigger='true']")) return;
          if (target.closest("[data-filter-panel='true']")) return;
          setOpenFilter(null);
        }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <p className="text-sm font-semibold tracking-tight text-foreground">Φίλτρα αγγελιών</p>
          <div className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground">
            {filteredListings.length} αποτελέσματα
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative static sm:relative" data-filter-trigger="true">
            <button
              type="button"
              onClick={() => setOpenFilter((prev) => (prev === "price" ? null : "price"))}
              className={[
                "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors",
                openFilter === "price" || priceMin || priceMax
                  ? "border-foreground bg-background text-foreground"
                  : "border-border/70 bg-background text-foreground hover:border-border",
              ].join(" ")}
            >
              {priceLabel}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {openFilter === "price" ? (
              <div
                data-filter-panel="true"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] w-full rounded-xl border border-border/70 bg-background p-2.5 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)] sm:left-0 sm:right-auto sm:w-[380px] sm:p-3"
              >
                <div className="mb-2.5 grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="€ Από"
                    className="h-10 rounded-lg border-border/60"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="€ Έως"
                    className="h-10 rounded-lg border-border/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {PRICE_MIN_OPTIONS.map((opt) => (
                        <button
                          key={`min-${opt.label}`}
                          type="button"
                          onClick={() => setPriceMin(opt.value)}
                          className={["block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                            priceMin === opt.value ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {PRICE_MAX_OPTIONS.map((opt) => (
                        <button
                          key={`max-${opt.label}`}
                          type="button"
                          onClick={() => setPriceMax(opt.value)}
                          className={["block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                            priceMax === opt.value ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative static sm:relative" data-filter-trigger="true">
            <button
              type="button"
              onClick={() => setOpenFilter((prev) => (prev === "sqm" ? null : "sqm"))}
              className={[
                "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors",
                openFilter === "sqm" || sqmMin || sqmMax
                  ? "border-foreground bg-background text-foreground"
                  : "border-border/70 bg-background text-foreground hover:border-border",
              ].join(" ")}
            >
              {sqmLabel}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {openFilter === "sqm" ? (
              <div
                data-filter-panel="true"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] w-full rounded-xl border border-border/70 bg-background p-2.5 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)] sm:left-0 sm:right-auto sm:w-[380px] sm:p-3"
              >
                <div className="mb-2.5 grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={sqmMin}
                    onChange={(e) => setSqmMin(e.target.value)}
                    placeholder="τ.μ. Από"
                    className="h-10 rounded-lg border-border/60"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={sqmMax}
                    onChange={(e) => setSqmMax(e.target.value)}
                    placeholder="τ.μ. Έως"
                    className="h-10 rounded-lg border-border/60"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {SQM_MIN_OPTIONS.map((opt) => (
                        <button
                          key={`sqm-min-${opt.label}`}
                          type="button"
                          onClick={() => setSqmMin(opt.value)}
                          className={["block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                            sqmMin === opt.value ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {SQM_MAX_OPTIONS.map((opt) => (
                        <button
                          key={`sqm-max-${opt.label}`}
                          type="button"
                          onClick={() => setSqmMax(opt.value)}
                          className={["block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                            sqmMax === opt.value ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative static sm:relative" data-filter-trigger="true">
            <button
              type="button"
              onClick={() => setOpenFilter((prev) => (prev === "rooms" ? null : "rooms"))}
              className={[
                "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors",
                openFilter === "rooms" || rooms
                  ? "border-foreground bg-background text-foreground"
                  : "border-border/70 bg-background text-foreground hover:border-border",
              ].join(" ")}
            >
              {rooms ? `Δωμάτια: ${selectedRoomsLabel}` : "Δωμάτια"}
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {openFilter === "rooms" ? (
              <div
                data-filter-panel="true"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] w-full rounded-xl border border-border/70 bg-background p-2.5 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)] sm:left-0 sm:right-auto sm:w-[260px] sm:p-3"
              >
                <div className="grid gap-2">
                  {ROOM_OPTIONS.map((opt) => (
                    <button
                      key={`room-${opt.id || "all"}`}
                      type="button"
                      onClick={() => {
                        setRooms(opt.id as "" | "studio" | "1" | "2" | "3+");
                        setOpenFilter(null);
                      }}
                      className={["rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                        rooms === opt.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40 text-foreground"].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center rounded-xl border border-border/70 bg-background px-3.5 text-sm font-medium text-foreground hover:border-border"
            >
              Καθαρισμός
            </button>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {priceMin || priceMax ? (
              <button
                type="button"
                onClick={() => {
                  setPriceMin("");
                  setPriceMax("");
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {priceLabel}
                <X className="size-3.5" />
              </button>
            ) : null}
            {sqmMin || sqmMax ? (
              <button
                type="button"
                onClick={() => {
                  setSqmMin("");
                  setSqmMax("");
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {sqmLabel}
                <X className="size-3.5" />
              </button>
            ) : null}
            {rooms ? (
              <button
                type="button"
                onClick={() => setRooms("")}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground"
              >
                Δωμάτια: {selectedRoomsLabel}
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}

      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-8">
        <aside className="order-1 hidden self-start lg:order-2 lg:col-start-2 lg:block lg:sticky lg:top-32">
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <div className="mb-2 flex items-center justify-between border-b border-border/60 pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Χάρτης</p>
              <p className="text-xs text-muted-foreground">{filteredListings.length} σημεία</p>
            </div>
            <MapViewLeaflet
              listings={filteredListings}
              heightClassName="h-[48dvh] min-h-[360px] lg:h-[calc(100dvh-13rem)] lg:min-h-[560px]"
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
            />
          </div>
        </aside>

        <section className="order-2 rounded-2xl border border-border/60 bg-card p-3 sm:p-4 lg:order-1 lg:col-start-1">
          <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Αγγελίες</p>
            <p className="text-xs text-muted-foreground">{filteredListings.length} αποτελέσματα</p>
          </div>
          <div className="space-y-3">
          {filteredListings.map((listing) => (
            <div key={listing.id} id={`broker-listing-${listing.id}`}>
              <ListingCard
                listing={listing}
                saved={saved.has(listing.id)}
                onToggleSaved={saved.toggle}
                onHoverChange={(id) => setActiveId(id)}
                selected={activeId === listing.id}
              />
            </div>
          ))}
          {filteredListings.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background p-8 text-center text-sm text-muted-foreground">
              Δεν βρέθηκαν αγγελίες με αυτά τα φίλτρα.
            </div>
          ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
