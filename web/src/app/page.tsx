"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Filters } from "@/components/listings/types";
import type { Listing } from "@/components/listings/types";
import { ListingCard } from "@/components/listings/listing-card";
import { useSavedListings } from "@/components/saved/use-saved";
import { HomeSearchToolbar } from "@/components/search/search-header";
import {
  chipLabelFromSuggestion,
  type LocationSuggestion,
  type SelectedSearchArea,
} from "@/components/search/location-suggestions";
import type { ListingSortParam } from "@/lib/listings-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const PAGE_SIZE = 12;

const LISTING_SORT_LABELS: Record<ListingSortParam, string> = {
  auto: "Αυτόματη ταξινόμηση",
  updated_desc: "Τελευταία ενημέρωση",
  sqm_desc: "τ.μ.: πολλά → λίγα",
  sqm_asc: "τ.μ.: λίγα → πολλά",
  price_asc: "Τιμή: φθηνά → ακριβά",
  price_desc: "Τιμή: ακριβά → φθηνά",
  relevance: "Αυτόματη ταξινόμηση",
};

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  /** Κείμενο στο πεδίο (πληκτρολόγηση) — φιλτράρισμα προτάσεων, όχι API. */
  const [query, setQuery] = useState("");
  /** Πολλαπλές επιλεγμένες περιοχές → `areas` στο API (OR bbox). */
  const [selectedAreas, setSelectedAreas] = useState<SelectedSearchArea[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [listingMode, setListingMode] = useState<"rent" | "sale">("rent");
  const saved = useSavedListings();
  const [sort, setSort] = useState<ListingSortParam>("auto");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  /** «Χάρτης»: χάρτης + λίστα. «Αγγελίες»: πλήρες πλάτος, περισσότερες στήλες καρτών. */
  const [browseLayout, setBrowseLayout] = useState<"map" | "listings">("map");
  const [headerSearchSlot, setHeaderSearchSlot] = useState<HTMLElement | null>(null);

  const listingsFilterQuery = useMemo(() => {
    const p = new URLSearchParams();
    p.set("dealType", listingMode);
    p.set("sort", sort);
    if (typeof filters.priceMinEur === "number") p.set("priceMinEur", String(filters.priceMinEur));
    if (typeof filters.priceMaxEur === "number") p.set("priceMaxEur", String(filters.priceMaxEur));
    if (typeof filters.sqmMin === "number") p.set("sqmMin", String(filters.sqmMin));
    if (typeof filters.sqmMax === "number") p.set("sqmMax", String(filters.sqmMax));
    if (filters.rooms) p.set("rooms", filters.rooms);
    if (selectedAreas.length > 0) {
      p.set("areas", JSON.stringify(selectedAreas.map((a) => a.bbox)));
    }
    if (filters.pets) p.set("pets", "1");
    if (filters.parking) p.set("parking", "1");
    if (filters.balcony) p.set("balcony", "1");
    if (filters.elevator) p.set("elevator", "1");
    if (filters.nearMetro) p.set("nearMetro", "1");
    if (filters.nearTram) p.set("nearTram", "1");
    if (filters.renovated) p.set("renovated", "1");
    if (filters.bright) p.set("bright", "1");
    return p.toString();
  }, [listingMode, sort, filters, selectedAreas]);

  const filterFingerprintRef = useRef(listingsFilterQuery);
  useEffect(() => {
    if (filterFingerprintRef.current !== listingsFilterQuery) {
      filterFingerprintRef.current = listingsFilterQuery;
      setPage(1);
    }
  }, [listingsFilterQuery]);

  const listingsQueryString = useMemo(() => {
    const p = new URLSearchParams(listingsFilterQuery);
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    return p.toString();
  }, [listingsFilterQuery, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, totalCount);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const ac = new AbortController();
    setListingsLoading(true);
    setListingsError(null);
    fetch(`/api/listings?${listingsQueryString}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          let msg = `Σφάλμα ${r.status}`;
          try {
            const j = (await r.json()) as { error?: unknown };
            if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          } catch {
            /* plain body */
          }
          throw new Error(msg);
        }
        return r.json();
      })
      .then((data: unknown) => {
        if (ac.signal.aborted) return;
        if (Array.isArray(data)) {
          setListings(data as Listing[]);
          setTotalCount(data.length);
        } else if (data && typeof data === "object" && "listings" in data) {
          const o = data as { listings: unknown; total: unknown };
          setListings(Array.isArray(o.listings) ? (o.listings as Listing[]) : []);
          setTotalCount(typeof o.total === "number" ? o.total : 0);
        } else {
          setListings([]);
          setTotalCount(0);
        }
        setListingsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (ac.signal.aborted) return;
        setListingsError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης αγγελιών");
        setListingsLoading(false);
        setListings([]);
        setTotalCount(0);
      });
    return () => ac.abort();
  }, [listingsQueryString, retryToken]);

  useEffect(() => {
    setHeaderSearchSlot(document.getElementById("header-search-slot"));
  }, []);

  const toolbarProps = {
    query,
    onQueryChange: setQuery,
    selectedAreas,
    onAddArea: (s: LocationSuggestion) => {
      setSelectedAreas((prev) => {
        if (prev.some((a) => a.id === s.id) || prev.length >= 8) return prev;
        return [
          ...prev,
          { id: s.id, chipLabel: chipLabelFromSuggestion(s), bbox: s.bbox },
        ];
      });
    },
    onRemoveArea: (id: string) =>
      setSelectedAreas((prev) => prev.filter((a) => a.id !== id)),
    onClearAreas: () => {
      setSelectedAreas([]);
      setQuery("");
    },
    filters,
    onFiltersChange: setFilters,
    listingMode,
    onListingModeChange: setListingMode,
    onClearFilter: (key: keyof Filters | "features" | "location") => {
      setFilters((prev) => {
        const next = { ...prev };
        if (key === "features") {
          delete next.parking;
          delete next.balcony;
          delete next.pets;
          delete next.elevator;
          delete next.renovated;
          delete next.bright;
          return next;
        }
        if (key === "location") {
          delete next.nearMetro;
          delete next.nearTram;
          return next;
        }
        delete (next as Record<string, unknown>)[key];
        return next;
      });
    },
  } as const;

  return (
    <div className="flex flex-1 flex-col">
      {headerSearchSlot
        ? createPortal(
            <div className="mx-auto w-full max-w-[46rem] min-w-0">
              <HomeSearchToolbar compact {...toolbarProps} />
            </div>,
            headerSearchSlot
          )
        : null}

      <div className="relative z-[110] isolate overflow-visible border-b bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/80 xl:hidden">
        <HomeSearchToolbar {...toolbarProps} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-7">
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0 rounded-xl border border-border/60 bg-card/60 px-3 py-3 shadow-sm sm:gap-x-4 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 sm:gap-3">
            <span className="shrink-0 text-sm text-muted-foreground">
              <span className={cn("font-semibold tabular-nums text-foreground", listingsLoading && "animate-pulse")}>
                {listingsLoading ? "…" : totalCount}
              </span>
              {!listingsLoading ? (
                <span> {totalCount === 1 ? "αγγελία" : "αγγελίες"}</span>
              ) : null}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">Ταξινόμηση</span>
              <Select
                value={sort}
                onValueChange={(v) => v != null && setSort(v as ListingSortParam)}
              >
              <SelectTrigger
                  id="listing-sort"
                  aria-label="Ταξινόμηση"
                  size="sm"
                  className="h-10 w-full min-w-0 max-w-full truncate rounded-lg border-border/60 bg-background text-left shadow-sm sm:w-auto sm:max-w-[min(100vw-8rem,18rem)] sm:min-w-[14rem]"
                >
                  <SelectValue placeholder="Ταξινόμηση">
                    {(value) =>
                      value != null && typeof value === "string" && value in LISTING_SORT_LABELS
                        ? LISTING_SORT_LABELS[value as ListingSortParam]
                        : "Ταξινόμηση"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end" className="max-w-[min(100vw-1.5rem,22rem)]">
                  <SelectItem value="auto">Αυτόματη ταξινόμηση</SelectItem>
                  <SelectItem value="updated_desc">Τελευταία ενημέρωση</SelectItem>
                  <SelectItem value="sqm_desc">τ.μ.: πολλά → λίγα</SelectItem>
                  <SelectItem value="sqm_asc">τ.μ.: λίγα → πολλά</SelectItem>
                  <SelectItem value="price_asc">Τιμή: φθηνά → ακριβά</SelectItem>
                  <SelectItem value="price_desc">Τιμή: ακριβά → φθηνά</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="shrink-0 justify-self-end">
            <div
              className="inline-flex rounded-lg border border-border/60 bg-background p-0.5"
              role="group"
              aria-label="Εμφάνιση χάρτη ή λίστας"
            >
              <button
                type="button"
                onClick={() => setBrowseLayout("map")}
                className={cn(
                  "h-9 rounded-md px-3.5 text-sm font-medium transition-colors",
                  browseLayout === "map"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={browseLayout === "map"}
              >
                Χάρτης
              </button>
              <button
                type="button"
                onClick={() => setBrowseLayout("listings")}
                className={cn(
                  "h-9 rounded-md px-3.5 text-sm font-medium transition-colors",
                  browseLayout === "listings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={browseLayout === "listings"}
              >
                Αγγελίες
              </button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-7 lg:gap-9",
            browseLayout === "map"
              ? "lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"
              : "lg:grid-cols-1"
          )}
        >
          {browseLayout === "map" ? (
            <aside className="order-1 self-start lg:order-2 lg:col-start-2 lg:sticky lg:top-40">
              <MapViewLeaflet
                listings={listings}
                heightClassName="h-[48dvh] min-h-[360px] lg:h-[calc(100dvh-11.75rem)] lg:min-h-[620px]"
                activeId={activeId}
                onSelect={(id) => setActiveId(id)}
                searchBboxes={selectedAreas.map((a) => a.bbox)}
              />
            </aside>
          ) : null}

          <section
            className={cn(
              "order-2 space-y-4 lg:order-1",
              browseLayout === "map" && "lg:col-start-1"
            )}
          >
            {listingsError ? (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm">
                <p className="font-medium text-foreground">{listingsError}</p>
                <p className="mt-1 text-muted-foreground">
                  Έλεγξε ότι τρέχει η PostgreSQL και ότι έχεις τρέξει{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">npx prisma migrate dev</code>.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={() => setRetryToken((n) => n + 1)}
                >
                  Δοκίμασε ξανά
                </Button>
              </div>
            ) : listingsLoading ? (
              <div className="space-y-3.5">
                {[0, 1, 2].map((k) => (
                  <div
                    key={k}
                    className="h-28 animate-pulse rounded-2xl border border-border/40 bg-muted/50"
                    aria-hidden
                  />
                ))}
                <p className="text-center text-xs text-muted-foreground">Φόρτωση αγγελιών…</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                Κανένα αποτέλεσμα με τα τρέχοντα φίλτρα. Χαλάρωσε τα φίλτρα ή άλλαξε τύπο συναλλαγής.
              </div>
            ) : (
              <div
                className={cn(
                  browseLayout === "listings"
                    ? "grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
                    : "space-y-3.5"
                )}
              >
                {listings.map((l) => (
                  <div key={l.id} id={`listing-${l.id}`}>
                    <ListingCard
                      listing={l}
                      saved={saved.has(l.id)}
                      onToggleSaved={saved.toggle}
                      onHoverChange={(id) => setActiveId(id)}
                      selected={activeId === l.id}
                    />
                  </div>
                ))}
              </div>
            )}
            {!listingsLoading && !listingsError && totalCount > 0 && totalPages > 1 ? (
              <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl border border-border/50 bg-card/50 px-4 py-4.5 sm:flex-row sm:items-center sm:px-5">
                <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
                  Εμφάνιση{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {rangeFrom}–{rangeTo}
                  </span>{" "}
                  από{" "}
                  <span className="font-medium tabular-nums text-foreground">{totalCount}</span>
                </p>
                <div className="flex items-center justify-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 gap-1 rounded-lg px-3"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Προηγούμενη σελίδα"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Προηγούμενη</span>
                  </Button>
                  <span className="min-w-[7.5rem] text-center text-sm font-medium tabular-nums text-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-9 gap-1 rounded-lg px-3"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Επόμενη σελίδα"
                  >
                    <span className="hidden sm:inline">Επόμενη</span>
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
