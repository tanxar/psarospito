"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  Heart,
  Home,
  LayoutList,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { useSavedListings } from "@/components/saved/use-saved";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function ActionTile({
  href,
  icon: Icon,
  title,
  description,
  iconClassName,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200",
        "hover:border-primary/20 hover:shadow-md hover:ring-primary/[0.06] dark:bg-card/60"
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary/[0.12]",
          iconClassName
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold tracking-tight text-foreground">{title}</span>
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary/70"
            aria-hidden
          />
        </span>
        {description ? (
          <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </Link>
  );
}

function DashboardStat({
  href,
  icon: Icon,
  label,
  value,
  subline,
  loading,
  iconClass,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string | number;
  subline?: string;
  loading?: boolean;
  iconClass?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/55 bg-card/85 p-5 shadow-sm ring-1 ring-black/[0.03] transition-all",
        "hover:border-primary/25 hover:shadow-md hover:ring-primary/[0.08] dark:bg-card/70"
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/45 bg-primary/[0.07] text-primary",
            iconClass
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {loading ? <span className="inline-block animate-pulse text-muted-foreground">…</span> : value}
          </p>
          {subline ? <p className="mt-1 text-xs text-muted-foreground">{subline}</p> : null}
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary/60"
          aria-hidden
        />
      </div>
    </Link>
  );
}

type DashboardStats = {
  listingCount: number | null;
  appointmentCount: number | null;
  loading: boolean;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useSessionUser();
  const saved = useSavedListings();
  const [loggingOut, setLoggingOut] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    listingCount: null,
    appointmentCount: null,
    loading: true,
  });

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? "?";
  const savedCount = saved.ids.length;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setStats({ listingCount: null, appointmentCount: null, loading: true });

    void (async () => {
      try {
        let listingCount: number | null = null;
        let appointmentCount = 0;

        const apRes = await fetch("/api/appointments", { cache: "no-store" });
        if (apRes.ok) {
          const j = (await apRes.json()) as {
            asSeeker?: unknown[];
            asHost?: unknown[];
          };
          appointmentCount = (Array.isArray(j.asSeeker) ? j.asSeeker.length : 0) + (Array.isArray(j.asHost) ? j.asHost.length : 0);
        }

        if (user.role === "BROKER" || user.role === "SEEKER") {
          const mRes = await fetch("/api/listings/mine", { cache: "no-store" });
          if (mRes.ok) {
            const arr = (await mRes.json()) as unknown;
            listingCount = Array.isArray(arr) ? arr.length : 0;
          } else {
            listingCount = null;
          }
        }

        if (!cancelled) {
          setStats({ listingCount, appointmentCount, loading: false });
        }
      } catch {
        if (!cancelled) {
          setStats({ listingCount: null, appointmentCount: null, loading: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      notifyAuthChanged();
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-muted/40 via-background to-muted/30 dark:from-background dark:via-background dark:to-muted/20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-10%,rgba(59,130,246,0.07),transparent_50%),radial-gradient(ellipse_50%_35%_at_100%_60%,rgba(239,68,68,0.05),transparent),radial-gradient(ellipse_45%_35%_at_0%_70%,rgba(34,197,94,0.05),transparent)] dark:bg-[radial-gradient(ellipse_85%_45%_at_50%_-10%,rgba(59,130,246,0.12),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
        {/* Toolbar */}
        <div className="flex flex-col gap-6 border-b border-border/40 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border-border/50 bg-background/90 px-4 shadow-sm ring-1 ring-border/35 backdrop-blur-sm hover:bg-muted/80"
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Αρχική
            </Link>
          </div>
          <div className="text-right sm:max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Πίνακας ελέγχου</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Ο λογαριασμός σου</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Επισκόπηση αποθηκευμένων, αγγελιών και ραντεβού σε ένα μέρος.
            </p>
          </div>
        </div>

        {!ready ? (
          <Card className="mt-10 overflow-hidden rounded-3xl border-border/50 bg-card/90 shadow-lg backdrop-blur-md">
            <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="size-10 animate-pulse rounded-full bg-muted" aria-hidden />
              <p className="text-sm text-muted-foreground">Φόρτωση πίνακα…</p>
            </CardContent>
          </Card>
        ) : user ? (
          <div className="mt-10 space-y-10">
            {/* Profile hero */}
            <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/90 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.04] backdrop-blur-md dark:bg-card/75 dark:shadow-[0_28px_70px_-36px_rgba(0,0,0,0.75)]">
              <div
                className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/[0.12] blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-16 -left-12 size-48 rounded-full bg-sky-500/10 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
                <div
                  className="mx-auto flex size-20 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-primary/10 to-sky-500/10 text-2xl font-bold tracking-tight text-primary shadow-inner dark:from-primary/25 dark:via-primary/12"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-sm text-muted-foreground">Καλώς ήρθες</p>
                  <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{user.name}</h2>
                  <p className="mt-1.5 truncate text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                        user.role === "BROKER"
                          ? "border-primary/25 bg-primary/[0.08] text-primary"
                          : "border-border/60 bg-muted/40 text-foreground"
                      )}
                    >
                      {user.role === "BROKER" ? (
                        <>
                          <Building2 className="size-3.5" aria-hidden />
                          Μεσίτης
                        </>
                      ) : (
                        <>
                          <Home className="size-3.5" aria-hidden />
                          Ιδιώτης
                        </>
                      )}
                    </span>
                    {user.role === "BROKER" && user.brokerOnboardingCompleted ? (
                      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Προφίλ έτοιμο
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {user.role === "BROKER" && !user.brokerOnboardingCompleted ? (
              <div className="rounded-2xl border border-amber-400/35 bg-gradient-to-r from-amber-50/95 to-amber-100/50 px-5 py-5 shadow-sm dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-500/25">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Ολοκλήρωσε το προφίλ μεσίτη</p>
                    <p className="mt-1 text-sm text-muted-foreground">Χωρίς στοιχεία γραφείου δεν μπορείς να δημοσιεύσεις αγγελίες.</p>
                  </div>
                  <Link
                    href="/account/broker-onboarding"
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "h-11 shrink-0 justify-center rounded-xl px-6 shadow-md shadow-amber-900/10"
                    )}
                  >
                    Συνέχεια ρύθμισης
                  </Link>
                </div>
              </div>
            ) : null}

            {/* KPI strip */}
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Σύνοψη</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <DashboardStat
                  href="/saved"
                  icon={Heart}
                  label="Αποθηκευμένα"
                  value={savedCount}
                  subline="Αγγελίες που έχεις σημειώσει"
                  iconClass="border-red-500/20 bg-red-500/[0.08] text-red-600 dark:text-red-400"
                />
                {user.role === "BROKER" || user.role === "SEEKER" ? (
                  <DashboardStat
                    href="/listings/mine"
                    icon={LayoutList}
                    label="Οι αγγελίες μου"
                    value={!stats.loading && stats.listingCount === null ? "—" : (stats.listingCount ?? 0)}
                    subline="Οι καταχωρήσεις σου"
                    loading={stats.loading}
                    iconClass="border-primary/25 bg-primary/[0.09]"
                  />
                ) : (
                  <DashboardStat
                    href="/register/broker"
                    icon={Building2}
                    label="Δημοσίευση"
                    value="—"
                    subline="Γίνε μεσίτης για καταχωρήσεις"
                    iconClass="border-violet-500/20 bg-violet-500/[0.08] text-violet-700 dark:text-violet-400"
                  />
                )}
                <DashboardStat
                  href="/account/viewings"
                  icon={CalendarClock}
                  label="Ραντεβού"
                  value={stats.appointmentCount ?? 0}
                  subline="Ως ενδιαφερόμενος ή οικοδεσπότης"
                  loading={stats.loading}
                  iconClass="border-sky-500/20 bg-sky-500/[0.08] text-sky-700 dark:text-sky-400"
                />
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Γρήγορες ενέργειες</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ActionTile
                  href="/saved"
                  icon={Heart}
                  title="Αποθηκευμένα"
                  description="Η λίστα με τις αγγελίες που σου αρέσουν"
                  iconClassName="bg-red-500/[0.08] text-red-600 dark:text-red-400"
                />
                <ActionTile
                  href="/account/viewings"
                  icon={CalendarClock}
                  title="Ραντεβού παρουσίασης"
                  description="Δες και διαχειρίσου τα ραντεβού σου"
                />
                {user.role === "SEEKER" || (user.role === "BROKER" && user.brokerOnboardingCompleted) ? (
                  <>
                    <ActionTile
                      href="/listings/mine"
                      icon={LayoutList}
                      title="Οι αγγελίες μου"
                      description="Διαχείριση καταχωρήσεων"
                      iconClassName="bg-primary/[0.08] text-primary"
                    />
                    <ActionTile
                      href="/listings/new"
                      icon={Plus}
                      title="Νέα αγγελία"
                      description="Δημοσίευσε νέο ακίνητο"
                      iconClassName="bg-emerald-600/[0.08] text-emerald-700 dark:text-emerald-400"
                    />
                  </>
                ) : (
                  <ActionTile
                    href="/account/broker-onboarding"
                    icon={Building2}
                    title="Προφίλ μεσίτη"
                    description="Ολοκλήρωσε τα στοιχεία γραφείου"
                    iconClassName="bg-amber-500/[0.12] text-amber-800 dark:text-amber-400"
                  />
                )}
              </div>
            </section>

            {/* Session */}
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-muted/25 shadow-sm ring-1 ring-border/30 dark:bg-muted/15">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Σύνοδος</p>
                  <p className="mt-1 text-xs text-muted-foreground">Αποσύνδεση από αυτή τη συσκευή.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full shrink-0 rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                  disabled={loggingOut}
                  onClick={() => void onLogout()}
                >
                  <LogOut className="size-4" aria-hidden />
                  {loggingOut ? "Αποσύνδεση…" : "Αποσύνδεση"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mt-10 overflow-hidden rounded-3xl border-border/50 bg-card/95 shadow-xl ring-1 ring-border/25 backdrop-blur-md">
            <CardContent className="space-y-8 p-6 sm:p-10">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-primary/15 to-sky-500/10 text-primary shadow-sm">
                  <UserRound className="size-8" aria-hidden />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Δεν είσαι συνδεδεμένος</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Οι αποθηκευμένες αγγελίες μένουν στον browser μέχρι να συνδεθείς.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/auth/email?next=%2Faccount"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] shadow-lg shadow-primary/15"
                  )}
                >
                  Σύνδεση / Εγγραφή
                </Link>
                <Link
                  href="/register/broker?next=%2Faccount"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "flex h-12 items-center justify-center gap-2 rounded-2xl border-border/60 bg-background ring-1 ring-border/30"
                  )}
                >
                  <Building2 className="size-4 text-primary" aria-hidden />
                  Εγγραφή μεσίτη
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
