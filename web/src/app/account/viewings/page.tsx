"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Check, X } from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

type SeekerRow = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  message: string | null;
  listing: { id: string; title: string };
  host: { id: string; name: string; email: string };
};

type HostRow = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  message: string | null;
  listing: { id: string; title: string };
  seeker: { id: string; name: string; email: string };
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(s: AppointmentStatus) {
  if (s === "PENDING") return "Εκκρεμεί";
  if (s === "CONFIRMED") return "Επιβεβαιωμένο";
  return "Ακυρωμένο";
}

export default function AccountViewingsPage() {
  const { user, ready } = useSessionUser();
  const [asSeeker, setAsSeeker] = useState<SeekerRow[]>([]);
  const [asHost, setAsHost] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/appointments");
      if (!res.ok) throw new Error("Αποτυχία φόρτωσης");
      const data = (await res.json()) as { asSeeker?: SeekerRow[]; asHost?: HostRow[] };
      setAsSeeker(Array.isArray(data.asSeeker) ? data.asSeeker : []);
      setAsHost(Array.isArray(data.asHost) ? data.asHost : []);
    } catch {
      setLoadError("Δεν ήταν δυνατή η φόρτωση των ραντεβού.");
      setAsSeeker([]);
      setAsHost([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
    if (ready && !user) setLoading(false);
  }, [ready, user, load]);

  async function patchHost(id: string, status: "CONFIRMED" | "CANCELLED") {
    if (actionId) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "Σφάλμα");
      }
      await load();
    } catch {
      /* toast optional */
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/account"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Λογαριασμός
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-primary/10 text-primary">
            <CalendarClock className="size-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ραντεβού παρουσίασης</h1>
            <p className="mt-1 text-sm text-muted-foreground">Αιτήματα που έχεις στείλει και αιτήματα για τις αγγελίες σου.</p>
          </div>
        </div>

        {!ready || loading ? (
          <p className="text-center text-sm text-muted-foreground">Φόρτωση…</p>
        ) : !user ? (
          <Card className="rounded-3xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/25">
            <CardContent className="p-6 text-sm text-muted-foreground">
              <Link href="/auth/email?next=%2Faccount%2Fviewings" className={cn(buttonVariants(), "mt-2 inline-flex h-11 rounded-xl")}>
                Σύνδεση για να δεις τα ραντεβού σου
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ως ενδιαφερόμενος</h2>
              {asSeeker.length === 0 ? (
                <p className="text-sm text-muted-foreground">Δεν έχεις αιτήματα ακόμα.</p>
              ) : (
                <ul className="space-y-2">
                  {asSeeker.map((a) => (
                    <li key={a.id}>
                      <Card className="rounded-2xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/20">
                        <CardContent className="space-y-2 p-4 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Link href={`/listing/${a.listing.id}`} className="font-medium text-primary hover:underline">
                              {a.listing.title}
                            </Link>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                a.status === "CONFIRMED" && "bg-primary/15 text-primary",
                                a.status === "PENDING" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                                a.status === "CANCELLED" && "bg-muted text-muted-foreground"
                              )}
                            >
                              {statusLabel(a.status)}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{formatWhen(a.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            Υπεύθυνος: {a.host.name} · {a.host.email}
                          </p>
                          {a.message ? <p className="border-t border-border/40 pt-2 text-muted-foreground">{a.message}</p> : null}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ως υπεύθυνος αγγελίας</h2>
              {asHost.length === 0 ? (
                <p className="text-sm text-muted-foreground">Κανένα αίτημα για τις αγγελίες σου.</p>
              ) : (
                <ul className="space-y-2">
                  {asHost.map((a) => (
                    <li key={a.id}>
                      <Card className="rounded-2xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/20">
                        <CardContent className="space-y-3 p-4 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <Link href={`/listing/${a.listing.id}`} className="font-medium text-primary hover:underline">
                              {a.listing.title}
                            </Link>
                            <span className="text-xs font-medium text-muted-foreground">{statusLabel(a.status)}</span>
                          </div>
                          <p className="text-muted-foreground">{formatWhen(a.startsAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            Ενδιαφερόμενος: {a.seeker.name} · {a.seeker.email}
                          </p>
                          {a.message ? <p className="text-muted-foreground">{a.message}</p> : null}
                          {a.status === "PENDING" ? (
                            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl"
                                disabled={actionId === a.id}
                                onClick={() => void patchHost(a.id, "CONFIRMED")}
                              >
                                <Check className="size-4" aria-hidden />
                                Επιβεβαίωση
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="rounded-xl"
                                disabled={actionId === a.id}
                                onClick={() => void patchHost(a.id, "CANCELLED")}
                              >
                                <X className="size-4" aria-hidden />
                                Απόρριψη
                              </Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Button type="button" variant="outline" className="rounded-xl" onClick={() => void load()}>
              Ανανέωση
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
