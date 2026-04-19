"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutList, Plus, Search, X } from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/listings/listing-card";
import type { Listing } from "@/components/listings/types";
import { useSavedListings } from "@/components/saved/use-saved";
import { cn } from "@/lib/utils";

function listingMatchesSearch(listing: Listing, rawQuery: string): boolean {
  const trimmed = rawQuery.trim().toLowerCase();
  if (!trimmed) return true;
  const hay = [
    listing.title,
    listing.subtitle,
    listing.description ?? "",
    listing.id,
    ...(listing.highlights ?? []),
  ]
    .join(" ")
    .toLowerCase();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

export default function MyListingsPage() {
  const { user, ready } = useSessionUser();
  const saved = useSavedListings();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Έγινε ολοκλήρωση φόρτωσης λίστας «δικές μου» (ή δεν ισχύει το query) */
  const [mineListReady, setMineListReady] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const buckets = useMemo(() => {
    const active: Listing[] = [];
    const rented: Listing[] = [];
    const sold: Listing[] = [];
    const otherInactive: Listing[] = [];
    for (const l of listings) {
      if (l.resolvedOutcome === "RENTED") rented.push(l);
      else if (l.resolvedOutcome === "SOLD") sold.push(l);
      else if (l.isActive === false) otherInactive.push(l);
      else active.push(l);
    }
    return { active, rented, sold, otherInactive };
  }, [listings]);

  const activeFiltered = useMemo(
    () => buckets.active.filter((l) => listingMatchesSearch(l, searchQuery)),
    [buckets.active, searchQuery]
  );
  const rentedFiltered = useMemo(
    () => buckets.rented.filter((l) => listingMatchesSearch(l, searchQuery)),
    [buckets.rented, searchQuery]
  );
  const soldFiltered = useMemo(
    () => buckets.sold.filter((l) => listingMatchesSearch(l, searchQuery)),
    [buckets.sold, searchQuery]
  );
  const otherInactiveFiltered = useMemo(
    () => buckets.otherInactive.filter((l) => listingMatchesSearch(l, searchQuery)),
    [buckets.otherInactive, searchQuery]
  );

  const totalFiltered =
    activeFiltered.length + rentedFiltered.length + soldFiltered.length + otherInactiveFiltered.length;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setMineListReady(true);
      return;
    }

    let cancelled = false;
    setMineListReady(false);
    setLoadError(null);

    fetch("/api/listings/mine")
      .then(async (r) => {
        if (!r.ok) {
          let msg = `Σφάλμα ${r.status}`;
          try {
            const j = (await r.json()) as { error?: unknown };
            if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        setListings(Array.isArray(data) ? (data as Listing[]) : []);
        setMineListReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης αγγελιών");
        setMineListReady(true);
        setListings([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user, retryToken]);

  const count = listings.length;
  const searchTrimmed = searchQuery.trim();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-5 sm:py-10 lg:px-8">
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-border/45 bg-card/75 p-6 shadow-sm ring-1 ring-border/25 backdrop-blur-md sm:mb-8 sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/[0.06] blur-3xl"
            aria-hidden
          />

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "relative z-[1] mb-5 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40 sm:mb-6"
            )}
          >
            <ArrowLeft className="size-4" />
            Αρχική
          </Link>

          <div className="relative z-[1] max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <LayoutList className="size-3.5 text-primary" aria-hidden />
              Οι καταχωρήσεις σου
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
              Οι αγγελίες μου
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-[15px]">
              Ενεργές καταχωρήσεις, ολοκληρωμένες συναλλαγές (ενοικίαση / πώληση) και άλλες ανενεργές — ως ιδιώτης ή μεσίτης. Στη σελίδα της αγγελίας μπορείς να επισημάνεις «Ενοικιάστηκε» ή «Πουλήθηκε» ώστε να βγει από τα δημόσια αποτελέσματα.
            </p>
          </div>
        </div>

        {!ready ? (
          <p className="rounded-2xl border border-border/50 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
            Φόρτωση…
          </p>
        ) : !user ? (
          <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-16">
              <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Συνδέσου για να δεις τις αγγελίες που έχεις καταχωρήσει.
              </p>
              <Link
                href="/auth/email?next=%2Flistings%2Fmine"
                className={cn(buttonVariants({ variant: "default" }), "mt-8 inline-flex h-12 items-center rounded-xl px-8")}
              >
                Σύνδεση
              </Link>
            </CardContent>
          </Card>
        ) : loadError ? (
          <div className="mb-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm">
            <p className="font-medium text-foreground">{loadError}</p>
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
        ) : !mineListReady ? (
          <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
            {[0, 1, 2, 3].map((k) => (
              <li key={k} className="min-w-0">
                <div className="h-[280px] animate-pulse rounded-2xl border border-border/40 bg-muted/50" aria-hidden />
              </li>
            ))}
          </ul>
        ) : count === 0 ? (
          <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-16">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/40 text-muted-foreground">
                <LayoutList className="size-8 stroke-[1.25]" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Δεν έχεις ακόμα αγγελίες
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Δημοσίευσε την πρώτη σου αγγελία και θα εμφανίζεται εδώ αμέσως.
              </p>
              <Link
                href="/listings/new"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-8"
                )}
              >
                <Plus className="size-4" aria-hidden />
                Νέα αγγελία
              </Link>
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "mt-3 inline-flex h-11 items-center gap-2 rounded-xl px-6"
                )}
              >
                <Search className="size-4" aria-hidden />
                Αναζήτηση αγγελιών
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5 sm:space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Αναζήτηση (τίτλος, περιοχή, κείμενο, ID)…"
                  autoComplete="off"
                  className="h-11 rounded-xl border-border/60 bg-background/90 pl-9 pr-10 shadow-sm"
                  aria-label="Αναζήτηση στις αγγελίες μου"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    aria-label="Καθαρισμός αναζήτησης"
                    className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
              <p className="shrink-0 text-sm tabular-nums text-muted-foreground sm:text-right">
                {searchTrimmed ? (
                  <>
                    <span className="font-medium text-foreground">{totalFiltered}</span>
                    <span> από </span>
                    <span className="font-medium text-foreground">{count}</span>
                    <span> ταιριάζουν</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">{count}</span>
                    <span>{count === 1 ? " αγγελία" : " αγγελίες"}</span>
                  </>
                )}
              </p>
            </div>

            {totalFiltered === 0 && searchTrimmed ? (
              <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25">
                <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/40 text-muted-foreground">
                    <Search className="size-7 stroke-[1.25]" aria-hidden />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    Καμία αγγελία δεν ταιριάζει
                  </h2>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                    Δοκίμασε άλλες λέξεις ή καθάρισε το πεδίο αναζήτησης.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-6 rounded-xl"
                    onClick={() => setSearchQuery("")}
                  >
                    Καθαρισμός αναζήτησης
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-10 sm:space-y-12">
                {activeFiltered.length > 0 ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Ενεργές αγγελίες</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Εμφανίζονται στην αναζήτηση και στον χάρτη.</p>
                    </div>
                    <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
                      {activeFiltered.map((l) => (
                        <li key={l.id} className="min-w-0">
                          <ListingCard
                            compact
                            listing={l}
                            saved={saved.has(l.id)}
                            onToggleSaved={saved.toggle}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {rentedFiltered.length > 0 ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                        Ακίνητα που ενοικιάστηκαν
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Επισημάνθηκαν από εσένα ως ολοκληρωμένη ενοικίαση — δεν εμφανίζονται πλέον δημόσια.
                      </p>
                    </div>
                    <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
                      {rentedFiltered.map((l) => (
                        <li key={l.id} className="min-w-0">
                          <ListingCard
                            compact
                            listing={l}
                            saved={saved.has(l.id)}
                            onToggleSaved={saved.toggle}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {soldFiltered.length > 0 ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Ακίνητα που πουλήθηκαν</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Επισημάνθηκαν ως πωλημένα — εκτός δημόσιας λίστας, μόνο εδώ στο προφίλ σου.
                      </p>
                    </div>
                    <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
                      {soldFiltered.map((l) => (
                        <li key={l.id} className="min-w-0">
                          <ListingCard
                            compact
                            listing={l}
                            saved={saved.has(l.id)}
                            onToggleSaved={saved.toggle}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {otherInactiveFiltered.length > 0 ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Άλλες ανενεργές</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ανενεργές χωρίς επισημάνσεις πώλησης ή ενοικίασης (π.χ. παλιές καταχωρήσεις).
                      </p>
                    </div>
                    <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
                      {otherInactiveFiltered.map((l) => (
                        <li key={l.id} className="min-w-0">
                          <ListingCard
                            compact
                            listing={l}
                            saved={saved.has(l.id)}
                            onToggleSaved={saved.toggle}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
