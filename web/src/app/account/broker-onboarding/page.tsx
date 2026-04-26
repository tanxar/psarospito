"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  SERVICE_REGION_LABELS,
  type ServiceRegionId,
} from "@/lib/greek-service-regions";
import { cn } from "@/lib/utils";

const REGION_ORDER: ServiceRegionId[] = [
  "athens_metro",
  "thessaloniki_metro",
  "patras",
  "larissa",
  "heraklion",
  "greece_other",
  "greece_wide",
];

export default function BrokerOnboardingPage() {
  const router = useRouter();
  const { user, ready } = useSessionUser();
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceRegions, setServiceRegions] = useState<Set<ServiceRegionId>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleRegion(id: ServiceRegionId) {
    setServiceRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/auth/email?next=%2Faccount%2Fbroker-onboarding");
      return;
    }
    if (user.role !== "BROKER") {
      router.replace("/account");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || user.role !== "BROKER") return;
    setCompany(user.brokerCompanyName ?? "");
    setPhone(user.brokerPhone ?? "");
    setServiceRegions(new Set((user.brokerServiceRegions ?? []) as ServiceRegionId[]));
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (serviceRegions.size === 0) {
      setError("Διάλεξε τουλάχιστον μία περιοχή εξυπηρέτησης.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brokerCompanyName: company.trim(),
          brokerPhone: phone.trim(),
          brokerServiceRegions: Array.from(serviceRegions),
        }),
      });
      const raw = await res.text();
      let msg = "Αποτυχία αποθήκευσης";
      try {
        const j = JSON.parse(raw) as { error?: unknown };
        if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
      } catch {
        if (raw.trim()) msg = raw.trim();
      }
      if (!res.ok) throw new Error(msg);
      notifyAuthChanged();
      router.replace("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία");
    } finally {
      setLoading(false);
    }
  }

  const showForm = ready && user && user.role === "BROKER";

  if (!showForm) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/45 bg-card/75 p-6 shadow-sm ring-1 ring-border/25 backdrop-blur-md sm:mb-10 sm:p-8">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/[0.06] blur-3xl"
            aria-hidden
          />

          <Link
            href="/account"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "relative z-[1] mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Λογαριασμός
          </Link>

          <div className="relative z-[1]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="size-3.5 text-primary" aria-hidden />
              {user.brokerOnboardingCompleted ? "Ενημέρωση προφίλ" : "Βήμα 1 από 1"}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
              {user.brokerOnboardingCompleted ? "Επεξεργασία στοιχείων γραφείου" : "Προφίλ γραφείου"}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {user.brokerOnboardingCompleted
                ? "Ενημέρωσε τα στοιχεία σου. Οι αλλαγές ισχύουν άμεσα."
                : "Λίγα στοιχεία για να ξεκινήσεις τις καταχωρήσεις. Μπορείς να τα επεξεργαστείς αργότερα από τον λογαριασμό."}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/25">
          <CardContent className="p-6 sm:p-8">
            <form className="space-y-5" onSubmit={onSubmit}>
              {error ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-foreground">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="bo-company" className="text-sm font-medium text-foreground">
                  Επωνυμία γραφείου
                </label>
                <Input
                  id="bo-company"
                  className="h-12 rounded-xl border-border/50 bg-background"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="π.χ. Nestio Realty"
                  required
                  minLength={2}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="bo-phone" className="text-sm font-medium text-foreground">
                  Τηλέφωνο επικοινωνίας
                </label>
                <Input
                  id="bo-phone"
                  type="tel"
                  className="h-12 rounded-xl border-border/50 bg-background"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="π.χ. 210 1234567 ή 6912345678"
                  required
                  autoComplete="tel"
                />
                <p className="text-xs text-muted-foreground">Τουλάχιστον 10 ψηφία (κενά και σύμβολα αγνοούνται).</p>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-medium text-foreground">Περιοχές εξυπηρέτησης</span>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Οι ιδιώτες βλέπουν μόνο μεσίτες που καλύπτουν την περιοχή της αγγελίας. «Όλη η Ελλάδα» για γραφεία με πανελλαδική παρουσία.
                </p>
                <div className="grid gap-2.5">
                  {REGION_ORDER.map((id) => (
                    <label
                      key={id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                        serviceRegions.has(id)
                          ? "border-primary/45 bg-primary/[0.06] ring-1 ring-primary/15"
                          : "border-border/50 bg-background/80 hover:border-border"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 rounded border-border text-primary"
                        checked={serviceRegions.has(id)}
                        onChange={() => toggleRegion(id)}
                      />
                      <span className="text-[13px] leading-snug text-foreground">{SERVICE_REGION_LABELS[id]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
                {loading ? "Αποθήκευση…" : user.brokerOnboardingCompleted ? "Αποθήκευση αλλαγών" : "Συνέχεια στον λογαριασμό"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
