"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Clock, MapPin, SlidersHorizontal, X } from "lucide-react";

import type { Filters } from "@/components/listings/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { AppliedFilters } from "./applied-filters";
import { FiltersSheetBody } from "./sheet-body";
import {
  filterLocationSuggestions,
  getLocationSuggestionById,
  locationSuggestionFromGeocodeLabel,
  suggestionDedupeKey,
  type LocationSuggestion,
  type SelectedSearchArea,
} from "./location-suggestions";

const MAX_AREAS = 8;
const RECENT_LEGACY_IDS_KEY = "nestio:recentLocationIds";
const RECENT_SUGGESTIONS_KEY = "nestio:recentLocationSuggestionsV1";

function isValidStoredSuggestion(x: unknown): x is LocationSuggestion {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const bb = o.bbox;
  if (!bb || typeof bb !== "object") return false;
  const b = bb as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.q === "string" &&
    typeof b.minLat === "number" &&
    typeof b.maxLat === "number" &&
    typeof b.minLng === "number" &&
    typeof b.maxLng === "number"
  );
}

function loadLegacyRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LEGACY_IDS_KEY);
    const a = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === "string").slice(0, 8);
  } catch {
    return [];
  }
}

function loadRecentSuggestions(): LocationSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SUGGESTIONS_KEY);
    if (raw) {
      const a = JSON.parse(raw) as unknown;
      if (Array.isArray(a)) {
        const cleaned = a.filter(isValidStoredSuggestion).slice(0, 8);
        if (cleaned.length > 0) return cleaned;
      }
    }
    const legacyIds = loadLegacyRecentIds();
    const migrated = legacyIds
      .map((id) => getLocationSuggestionById(id))
      .filter((s): s is LocationSuggestion => s != null);
    if (migrated.length > 0) {
      persistRecentSuggestions(migrated);
    }
    return migrated;
  } catch {
    return [];
  }
}

function persistRecentSuggestions(items: LocationSuggestion[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_SUGGESTIONS_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

/** Γραμμή αναζήτησης: πολλαπλές περιοχές (chips), πρόσφατες αναζητήσεις. */
export function HomeSearchToolbar({
  query,
  onQueryChange,
  selectedAreas,
  onAddArea,
  onRemoveArea,
  onClearAreas,
  filters,
  onFiltersChange,
  listingMode,
  onListingModeChange,
  onClearFilter,
  compact = false,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  selectedAreas: SelectedSearchArea[];
  onAddArea: (s: LocationSuggestion) => void;
  onRemoveArea: (id: string) => void;
  onClearAreas: () => void;
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  listingMode: "rent" | "sale";
  onListingModeChange: (mode: "rent" | "sale") => void;
  onClearFilter?: (key: keyof Filters | "features" | "location") => void;
  compact?: boolean;
}) {
  const listId = useId();
  /** Πεδίο + floating panel — κλικ έξω κλείνει το overlay. */
  const locationColumnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSuggestions, setRecentSuggestions] = useState<LocationSuggestion[]>([]);
  const [geoSuggestions, setGeoSuggestions] = useState<LocationSuggestion[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    setRecentSuggestions(loadRecentSuggestions());
  }, []);

  const pushRecentSuggestion = useCallback((s: LocationSuggestion) => {
    setRecentSuggestions((prev) => {
      const next = [s, ...prev.filter((x) => x.id !== s.id)].slice(0, 8);
      persistRecentSuggestions(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGeoSuggestions([]);
      setGeoLoading(false);
      return;
    }
    const ac = new AbortController();
    const tid = window.setTimeout(() => {
      setGeoLoading(true);
      fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
        signal: ac.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          if (ac.signal.aborted) return;
          const json = (await res.json().catch(() => ({}))) as {
            results?: { label: string; lat: number; lng: number }[];
          };
          const rows = Array.isArray(json.results) ? json.results : [];
          setGeoSuggestions(
            rows.map((r, i) => locationSuggestionFromGeocodeLabel(r.label, r.lat, r.lng, i))
          );
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          setGeoSuggestions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setGeoLoading(false);
        });
    }, 260);
    return () => {
      window.clearTimeout(tid);
      ac.abort();
    };
  }, [query]);

  const staticSuggestions = useMemo(() => filterLocationSuggestions(query, 8), [query]);

  const suggestions = useMemo(() => {
    const out: LocationSuggestion[] = [];
    const seen = new Set<string>();
    const add = (s: LocationSuggestion) => {
      const k = suggestionDedupeKey(s);
      if (seen.has(k)) return;
      seen.add(k);
      out.push(s);
    };
    for (const s of staticSuggestions) add(s);
    for (const s of geoSuggestions) add(s);
    return out.slice(0, 12);
  }, [staticSuggestions, geoSuggestions]);

  useEffect(() => {
    setActiveIdx((prev) => {
      if (suggestions.length === 0) return -1;
      if (prev < 0) return -1;
      return Math.min(prev, suggestions.length - 1);
    });
  }, [suggestions]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!locationColumnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const tryAddArea = useCallback(
    (s: LocationSuggestion) => {
      if (selectedAreas.some((a) => a.id === s.id)) {
        onQueryChange("");
        setOpen(false);
        setActiveIdx(-1);
        return;
      }
      if (selectedAreas.length >= MAX_AREAS) {
        onQueryChange("");
        setOpen(false);
        setActiveIdx(-1);
        return;
      }
      onAddArea(s);
      pushRecentSuggestion(s);
      onQueryChange("");
      setOpen(false);
      setActiveIdx(-1);
    },
    [onAddArea, onQueryChange, pushRecentSuggestion, selectedAreas]
  );

  const pickSuggestion = useCallback(
    (s: LocationSuggestion) => {
      tryAddArea(s);
    },
    [tryAddArea]
  );

  const addFromRecent = useCallback(
    (s: LocationSuggestion) => {
      tryAddArea(s);
      inputRef.current?.focus();
    },
    [tryAddArea]
  );

  const showFloatingPanel =
    open &&
    (suggestions.length > 0 ||
      recentSuggestions.length > 0 ||
      (query.trim().length >= 2 && geoLoading));

  return (
    <div>
      <div className={cn(!compact && "mx-auto w-full max-w-6xl px-2 py-2 sm:px-4 sm:py-2.5")}>
        <div className={cn("space-y-2", compact && "space-y-0")}>
          <div
            className={cn(
              "grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-2 overflow-visible rounded-xl border p-2 shadow-sm backdrop-blur sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-start sm:gap-2 sm:p-1.5",
              compact
                ? "border-border/45 bg-background/55 shadow-none"
                : "border-border/60 bg-card/75"
            )}
          >
            <div
              className={cn(
                "col-start-1 row-start-1 inline-flex shrink-0 items-center justify-self-start rounded-lg border p-0.5 sm:col-start-1",
                compact ? "border-border/45 bg-background/60" : "border-border/60 bg-background/80"
              )}
            >
              <button
                type="button"
                onClick={() => onListingModeChange("rent")}
                className={cn(
                  "h-9 min-h-9 rounded-md px-3 text-sm font-medium transition-colors sm:h-8 sm:min-h-0 sm:px-2.5",
                  listingMode === "rent" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
                aria-pressed={listingMode === "rent"}
              >
                Ενοικίαση
              </button>
              <button
                type="button"
                onClick={() => onListingModeChange("sale")}
                className={cn(
                  "h-9 min-h-9 rounded-md px-3 text-sm font-medium transition-colors sm:h-8 sm:min-h-0 sm:px-2.5",
                  listingMode === "sale" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
                aria-pressed={listingMode === "sale"}
              >
                Πώληση
              </button>
            </div>

            <div
              ref={locationColumnRef}
              className="relative z-[120] col-span-full row-start-2 min-w-0 overflow-visible sm:col-span-1 sm:col-start-2 sm:row-start-1"
            >
              <div
                className={cn(
                  "rounded-lg border px-2 py-2 [scrollbar-width:thin] sm:px-2 sm:py-1.5",
                  compact
                    ? "h-10 overflow-x-auto overflow-y-hidden border-border/45 bg-background/60"
                    : "max-h-[7.25rem] overflow-y-auto overflow-x-hidden border-border/60 bg-background/80 sm:max-h-[6.25rem]"
                )}
              >
                <div className={cn("flex items-center gap-1.5", compact ? "flex-nowrap" : "flex-wrap sm:gap-1.5")}>
                  {selectedAreas.map((a) => (
                    <span
                      key={a.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 py-0.5 pl-2.5 pr-1 text-[13px] font-medium text-foreground",
                        compact ? "max-w-[8.75rem] shrink-0" : "max-w-full"
                      )}
                    >
                      <span className="truncate">{a.chipLabel}</span>
                      <button
                        type="button"
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-background active:text-foreground sm:hover:bg-background sm:hover:text-foreground"
                        aria-label={`Αφαίρεση ${a.chipLabel}`}
                        onClick={() => onRemoveArea(a.id)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    id="home-location-search"
                    value={query}
                    onChange={(e) => {
                      onQueryChange(e.target.value);
                      setOpen(true);
                      setActiveIdx(-1);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        setOpen(true);
                        return;
                      }
                      if (e.key === "Enter") {
                        if (open && suggestions.length > 0 && activeIdx >= 0 && suggestions[activeIdx]) {
                          e.preventDefault();
                          pickSuggestion(suggestions[activeIdx]);
                          return;
                        }
                        e.preventDefault();
                        setOpen(false);
                        return;
                      }
                      if (e.key === "Escape") {
                        setOpen(false);
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1));
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveIdx((i) => Math.max(0, i - 1));
                      }
                      if (e.key === "Backspace" && query === "" && selectedAreas.length > 0) {
                        onRemoveArea(selectedAreas[selectedAreas.length - 1]!.id);
                      }
                    }}
                    placeholder="Περιοχή · π.χ. Θεσσαλονίκη, Μύκονος, Αθήνα…"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showFloatingPanel}
                    aria-controls={showFloatingPanel ? listId : undefined}
                    aria-autocomplete="list"
                    className={cn(
                      "min-h-9 min-w-0 flex-1 border-0 bg-transparent px-1 text-[15px] outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-0 sm:h-8 sm:min-h-0 sm:text-sm",
                      compact ? "min-w-[8rem] sm:min-w-[8rem]" : "sm:min-w-[10rem]"
                    )}
                    inputMode="search"
                    enterKeyHint="search"
                  />
                  {selectedAreas.length > 0 && !compact ? (
                    <button
                      type="button"
                      className="min-h-8 shrink-0 px-1 text-xs font-medium text-muted-foreground underline-offset-2 active:text-foreground sm:min-h-0 sm:hover:text-foreground sm:hover:underline"
                      onClick={() => {
                        onClearAreas();
                        onQueryChange("");
                        setOpen(false);
                      }}
                    >
                      Αφαίρεση όλων
                    </button>
                  ) : null}
                </div>
              </div>

              {showFloatingPanel ? (
                <div
                  className="absolute left-1/2 top-[calc(100%+10px)] z-[300] w-[calc(100vw-1.25rem)] max-w-none -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-popover text-popover-foreground shadow-[0_20px_55px_-14px_rgba(15,23,42,0.28)] ring-1 ring-black/[0.06] dark:shadow-[0_22px_56px_-12px_rgba(0,0,0,0.55)] sm:left-0 sm:right-0 sm:w-auto sm:translate-x-0 sm:rounded-xl sm:shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]"
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" || e.pointerType === "touch" || e.pointerType === "pen") {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="max-h-[min(28rem,58dvh)] overflow-y-auto overscroll-contain sm:max-h-[min(26rem,62vh)]">
                    {geoLoading && suggestions.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-muted-foreground sm:py-3">Αναζήτηση περιοχών…</div>
                    ) : null}

                    {suggestions.length > 0 ? (
                      <ul id={listId} role="listbox" className="py-2 text-base sm:py-1.5 sm:text-sm">
                        {suggestions.map((s, idx) => (
                          <li key={s.id} role="presentation">
                            <button
                              type="button"
                              role="option"
                              aria-selected={idx === activeIdx}
                              className={cn(
                                "flex w-full items-start gap-3 px-3 py-3.5 text-left transition-colors active:bg-muted/90 sm:py-2.5",
                                idx === activeIdx ? "bg-muted" : "sm:hover:bg-muted/80"
                              )}
                              onMouseEnter={() => setActiveIdx(idx)}
                              onClick={() => pickSuggestion(s)}
                            >
                              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-8">
                                <MapPin className="size-[1.125rem] sm:size-4" aria-hidden />
                              </span>
                              <span className="min-w-0 leading-snug">{s.label}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {suggestions.length > 0 && recentSuggestions.length > 0 ? (
                      <div className="border-t border-border/50" aria-hidden />
                    ) : null}

                    {recentSuggestions.length > 0 ? (
                      <div className="px-2.5 py-2.5 sm:px-2 sm:py-2">
                        <p className="mb-2 px-1 text-[0.8125rem] font-semibold tracking-wide text-muted-foreground sm:mb-1.5 sm:text-xs">
                          Οι τελευταίες αναζητήσεις σου
                        </p>
                        <ul className="space-y-1 sm:space-y-0.5">
                          {recentSuggestions.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-base text-foreground active:bg-muted/90 sm:min-h-0 sm:gap-2 sm:rounded-lg sm:py-2 sm:text-sm sm:hover:bg-muted/80"
                                onClick={() => addFromRecent(s)}
                              >
                                <Clock className="size-4 shrink-0 text-muted-foreground sm:size-3.5" aria-hidden />
                                <span className="min-w-0 leading-snug sm:truncate">{s.label}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="col-start-2 row-start-1 justify-self-end self-center sm:col-start-3 sm:row-start-1 sm:justify-self-auto sm:self-auto">
              <Sheet>
                <SheetTrigger
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "h-9 min-h-9 gap-2 rounded-lg border border-primary/45 px-3 sm:h-9 sm:min-h-0 sm:px-2.5"
                  )}
                  aria-label="Φίλτρα"
                >
                  <SlidersHorizontal className="size-[1.125rem] sm:size-4" />
                  <span>Φίλτρα</span>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                  <SheetHeader className="border-b bg-background/80 backdrop-blur">
                    <SheetTitle>Φίλτρα</SheetTitle>
                    <SheetDescription>Βελτίωσε τα αποτελέσματα με μερικές απλές επιλογές.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                    <FiltersSheetBody filters={filters} onChange={onFiltersChange} />
                  </div>
                  <SheetFooter className="border-t bg-background/80 backdrop-blur">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 w-full rounded-xl border border-border/60 bg-card/80 shadow-sm backdrop-blur hover:bg-card hover:shadow-md sm:w-auto"
                      onClick={() => onFiltersChange({})}
                    >
                      Καθαρισμός όλων
                    </Button>
                    <SheetClose render={<Button className="h-11 w-full rounded-xl sm:w-auto" type="button" />}>
                      Εφαρμογή
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {!compact ? (
            <div className="pt-0">
              <AppliedFilters filters={filters} onClear={(k) => onClearFilter?.(k)} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
