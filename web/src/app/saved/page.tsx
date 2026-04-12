"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Listing } from "@/components/listings/types";
import { ListingCard } from "@/components/listings/listing-card";
import { useSavedListings } from "@/components/saved/use-saved";

export default function SavedPage() {
  const saved = useSavedListings();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch("/api/listings")
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
        setAllListings(Array.isArray(data) ? (data as Listing[]) : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης αγγελιών");
        setLoading(false);
        setAllListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  const savedSet = useMemo(() => new Set(saved.ids), [saved.ids]);
  const listings = useMemo(() => allListings.filter((l) => savedSet.has(l.id)), [allListings, savedSet]);
  const count = listings.length;
  const savedIdsCount = saved.ids.length;

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
              <Heart className="size-3.5 text-primary" aria-hidden />
              Η λίστα σου
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
              Αποθηκευμένα
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-[15px]">
              Γρήγορη επισκόπηση όλων των αγγελιών που έχεις σημειώσει — πλέγμα για να τις συγκρίνεις εύκολα.
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm">
            <p className="font-medium text-foreground">{loadError}</p>
            {savedIdsCount > 0 ? (
              <p className="mt-2 text-muted-foreground">
                Οι επιλογές σου παραμένουν στον browser — όταν επανέλθει η βάση, οι κάρτες θα εμφανιστούν ξανά.
              </p>
            ) : null}
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
        ) : null}

        {savedIdsCount === 0 ? (
          loadError ? null : loading ? (
            <p className="rounded-2xl border border-border/50 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
              Φόρτωση…
            </p>
          ) : (
            <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25">
              <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-10 sm:py-16">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-muted/40 text-muted-foreground">
                  <Heart className="size-8 stroke-[1.25]" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Δεν έχεις αποθηκεύσει τίποτα ακόμα
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  Πήγαινε στην αρχική, διάλεξε αγγελίες που σου αρέσουν και πάτα την καρδιά — θα εμφανίζονται εδώ για γρήγορη
                  πρόσβαση.
                </p>
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-8"
                  )}
                >
                  <Search className="size-4" aria-hidden />
                  Αναζήτηση αγγελιών
                </Link>
              </CardContent>
            </Card>
          )
        ) : loading && !loadError ? (
          <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
            {[0, 1, 2, 3].map((k) => (
              <li key={k} className="min-w-0">
                <div className="h-[280px] animate-pulse rounded-2xl border border-border/40 bg-muted/50" aria-hidden />
              </li>
            ))}
          </ul>
        ) : loadError ? (
          <p className="text-sm text-muted-foreground">Πάτα «Δοκίμασε ξανά» παραπάνω για να φορτωθούν οι αγγελίες.</p>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div
              className={cn(
                "flex flex-col gap-3 sm:flex-row sm:items-start",
                savedIdsCount > count ? "sm:justify-between" : "sm:justify-end"
              )}
            >
              {savedIdsCount > count ? (
                <p className="text-sm text-muted-foreground/90 sm:max-w-[min(100%,28rem)] sm:text-[15px]">
                  {savedIdsCount - count} αποθηκευμένες δεν εμφανίζονται — ίσως έχουν αφαιρεθεί από το σύστημα.
                </p>
              ) : null}
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "h-11 shrink-0 self-end rounded-xl border-border/50 bg-background px-5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto"
                )}
                onClick={() => {
                  if (typeof window !== "undefined" && window.confirm("Να αφαιρεθούν όλες οι αποθηκευμένες αγγελίες;")) {
                    saved.clear();
                  }
                }}
              >
                Καθαρισμός λίστας
              </button>
            </div>

            <ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:gap-4 2xl:grid-cols-4">
              {listings.map((l) => (
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
          </div>
        )}
      </div>
    </div>
  );
}
