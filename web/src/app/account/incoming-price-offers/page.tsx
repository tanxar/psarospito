"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type IncomingPriceOffer = {
  id: string;
  amountEur: number;
  basePriceEur: number;
  createdAt: string;
  listing: { id: string; title: string };
  seeker: { id: string; name: string };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEur(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default function IncomingPriceOffersPage() {
  const { user, ready } = useSessionUser();
  const [items, setItems] = useState<IncomingPriceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/listings/incoming-price-offers", { cache: "no-store" })
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
        setItems(Array.isArray(data) ? (data as IncomingPriceOffer[]) : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  if (ready && !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
          <Card className="rounded-xl border-border bg-card">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Συνδέσου για να δεις τις οικονομικές προσφορές που έλαβες.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/account"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex h-9 items-center gap-2 rounded-lg")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Λογαριασμός
        </Link>

        <div className="mt-5 border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Οικονομικές προσφορές · Εισερχόμενες</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Προσφορές τιμής που έλαβαν οι αγγελίες σου από ενδιαφερόμενους.
          </p>
        </div>

        {loading ? (
          <Card className="mt-6 rounded-xl border-border bg-card">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Φόρτωση…</CardContent>
          </Card>
        ) : error ? (
          <Card className="mt-6 rounded-xl border-destructive/35 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="mt-6 rounded-xl border-border bg-card">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Δεν υπάρχουν οικονομικές προσφορές αυτή τη στιγμή.</CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-2.5">
            {items.map((offer) => (
              <Link
                key={offer.id}
                href={`/listing/${offer.listing.id}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{offer.listing.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ο/Η {offer.seeker.name} πρόσφερε {formatEur(offer.amountEur)} (τιμή αγγελίας: {formatEur(offer.basePriceEur)}).
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Ημερομηνία: {formatDate(offer.createdAt)}</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Νέα προσφορά
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-7">
          <Link
            href="/listings/mine"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "inline-flex h-10 items-center gap-2 rounded-lg border-border bg-background"
            )}
          >
            <Building2 className="size-4 text-primary" aria-hidden />
            Οι αγγελίες μου
          </Link>
        </div>
      </div>
    </div>
  );
}
