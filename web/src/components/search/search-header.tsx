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
  type LocationSuggestion,
  type SelectedSearchArea,
} from "./location-suggestions";

const MAX_AREAS = 8;
const RECENT_STORAGE_KEY = "nestio:recentLocationIds";

function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const a = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(a)) return [];
    return a.filter((x): x is string => typeof x === "string").slice(0, 8);
  } catch {
    return [];
  }
}

function persistRecentIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids.slice(0, 8)));
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
}) {
  const listId = useId();
  /** Πεδίο + floating panel — κλικ έξω κλείνει το overlay. */
  const locationColumnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(loadRecentIds());
  }, []);

  const pushRecentId = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 8);
      persistRecentIds(next);
      return next;
    });
  }, []);

  const suggestions = useMemo(() => filterLocationSuggestions(query, 12), [query]);

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
      pushRecentId(s.id);
      onQueryChange("");
      setOpen(false);
      setActiveIdx(-1);
    },
    [onAddArea, onQueryChange, pushRecentId, selectedAreas]
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

  const recentResolved = useMemo(
    () =>
      recentIds
        .map((id) => ({ id, s: getLocationSuggestionById(id) }))
        .filter((x): x is { id: string; s: LocationSuggestion } => x.s != null),
    [recentIds]
  );

  const showFloatingPanel =
    open && (suggestions.length > 0 || recentResolved.length > 0);

  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-2.5 py-2.5 sm:px-4 sm:py-3">
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-3 overflow-visible rounded-2xl border border-border/60 bg-card/75 p-2.5 shadow-sm backdrop-blur sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-start sm:gap-2 sm:p-2">
            <div className="col-start-1 row-start-1 inline-flex shrink-0 items-center justify-self-start rounded-xl border border-border/60 bg-background/80 p-1 sm:col-start-1">
              <button
                type="button"
                onClick={() => onListingModeChange("rent")}
                className={cn(
                  "h-10 min-h-10 rounded-lg px-3.5 text-sm font-medium transition-colors sm:h-8 sm:min-h-0 sm:px-3",
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
                  "h-10 min-h-10 rounded-lg px-3.5 text-sm font-medium transition-colors sm:h-8 sm:min-h-0 sm:px-3",
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
              <div className="max-h-[8.5rem] overflow-y-auto overflow-x-hidden rounded-xl border border-border/60 bg-background/80 px-2.5 py-2.5 [scrollbar-width:thin] sm:max-h-[7.5rem] sm:px-2 sm:py-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-1.5">
                  {selectedAreas.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 bg-muted/60 py-1 pl-3 pr-1 text-sm font-medium text-foreground sm:py-0.5 sm:pl-2.5 sm:text-[13px]"
                    >
                      <span className="truncate">{a.chipLabel}</span>
                      <button
                        type="button"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-background active:text-foreground sm:size-6 sm:hover:bg-background sm:hover:text-foreground"
                        aria-label={`Αφαίρεση ${a.chipLabel}`}
                        onClick={() => onRemoveArea(a.id)}
                      >
                        <X className="size-4 sm:size-3.5" />
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
                    placeholder="Πρόσθεσε περιοχές"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showFloatingPanel}
                    aria-controls={showFloatingPanel ? listId : undefined}
                    aria-autocomplete="list"
                    className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-1 text-base outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-0 sm:h-8 sm:min-h-0 sm:min-w-[10rem] sm:text-sm"
                    inputMode="search"
                    enterKeyHint="search"
                  />
                  {selectedAreas.length > 0 ? (
                    <button
                      type="button"
                      className="min-h-9 shrink-0 px-1 text-xs font-medium text-muted-foreground underline-offset-2 active:text-foreground sm:min-h-0 sm:hover:text-foreground sm:hover:underline"
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

                    {suggestions.length > 0 && recentResolved.length > 0 ? (
                      <div className="border-t border-border/50" aria-hidden />
                    ) : null}

                    {recentResolved.length > 0 ? (
                      <div className="px-2.5 py-2.5 sm:px-2 sm:py-2">
                        <p className="mb-2 px-1 text-[0.8125rem] font-semibold tracking-wide text-muted-foreground sm:mb-1.5 sm:text-xs">
                          Οι τελευταίες αναζητήσεις σου
                        </p>
                        <ul className="space-y-1 sm:space-y-0.5">
                          {recentResolved.map(({ id, s }) => (
                            <li key={id}>
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
                    "h-11 min-h-11 gap-2 rounded-xl px-3.5 sm:h-10 sm:min-h-0 sm:px-3"
                  )}
                  aria-label="Filters"
                >
                  <SlidersHorizontal className="size-[1.125rem] sm:size-4" />
                  <span>Filters</span>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                  <SheetHeader className="border-b bg-background/80 backdrop-blur">
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>Refine results with a few clean controls.</SheetDescription>
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
                      Clear all
                    </Button>
                    <SheetClose render={<Button className="h-11 w-full rounded-xl sm:w-auto" type="button" />}>
                      Apply
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="pt-0.5">
            <AppliedFilters filters={filters} onClear={(k) => onClearFilter?.(k)} />
          </div>
        </div>
      </div>
    </div>
  );
}
