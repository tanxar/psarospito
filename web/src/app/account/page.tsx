"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  Heart,
  Home,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
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
        "group relative flex gap-4 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/95 to-background/40 p-4 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200",
        "hover:border-primary/25 hover:shadow-md hover:ring-primary/[0.06]"
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
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary/70" aria-hidden />
        </span>
        {description ? (
          <span className="mt-1 block text-[13px] leading-snug text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </Link>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, ready } = useSessionUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? "?";

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
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50/70 via-zinc-50/80 to-amber-50/25">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-12%,rgba(0,48,135,0.09),transparent_52%),radial-gradient(ellipse_55%_40%_at_100%_90%,rgba(14,165,233,0.06),transparent),radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(251,191,36,0.08),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-300/35 via-primary/20 to-amber-200/40" aria-hidden />

      <div className="relative mx-auto w-full max-w-xl px-4 py-10 sm:max-w-2xl sm:px-6 sm:py-14 lg:px-8">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "inline-flex h-10 items-center gap-2 rounded-xl border-border/50 bg-white/70 px-4 shadow-sm ring-1 ring-border/30 backdrop-blur-sm hover:bg-white/90"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Αρχική
        </Link>

        {!ready ? (
          <Card className="mt-8 overflow-hidden rounded-3xl border-border/50 bg-white/80 shadow-lg ring-1 ring-primary/[0.04] backdrop-blur-md">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="size-10 animate-pulse rounded-full bg-muted" aria-hidden />
              <p className="text-sm text-muted-foreground">Φόρτωση…</p>
            </CardContent>
          </Card>
        ) : user ? (
          <div className="mt-8 space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_20px_50px_-28px_rgba(0,48,135,0.18)] ring-1 ring-primary/[0.05] backdrop-blur-md sm:p-8">
              <div
                className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sky-200/30 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-12 -left-10 size-40 rounded-full bg-amber-200/25 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div
                  className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/15 via-primary/[0.08] to-sky-100/40 text-3xl font-semibold tracking-tight text-primary shadow-inner ring-1 ring-white/60"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{user.name}</h1>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/25 px-3 py-1 text-xs font-medium text-foreground/90">
                    {user.role === "BROKER" ? (
                      <>
                        <Building2 className="size-3.5 text-primary" aria-hidden />
                        Μεσίτης
                      </>
                    ) : (
                      <>
                        <Home className="size-3.5 text-primary" aria-hidden />
                        Αναζητητής
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {user.role === "BROKER" && !user.brokerOnboardingCompleted ? (
              <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-50/90 to-amber-100/40 px-4 py-4 shadow-sm sm:px-5">
                <p className="font-semibold text-foreground">Ολοκλήρωσε το προφίλ μεσίτη</p>
                <p className="mt-1 text-sm text-muted-foreground">Απαιτούνται στοιχεία γραφείου για δημοσίευση.</p>
                <Link
                  href="/account/broker-onboarding"
                  className={cn(buttonVariants({ variant: "default" }), "mt-4 inline-flex h-11 rounded-xl px-5")}
                >
                  Συνέχεια ρύθμισης
                </Link>
              </div>
            ) : null}

            <Card className="overflow-hidden rounded-3xl border-slate-200/70 bg-white/90 shadow-lg ring-1 ring-primary/[0.04] backdrop-blur-md">
              <div className="border-b border-border/50 px-5 py-4 sm:px-6">
                <h2 className="text-sm font-semibold text-foreground">Σύνδεσμοι</h2>
              </div>
              <CardContent className="space-y-3 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionTile href="/saved" icon={Heart} title="Αποθηκευμένα" />
                  <ActionTile href="/account/viewings" icon={CalendarClock} title="Ραντεβού παρουσίασης" />
                  {user.role === "BROKER" && user.brokerOnboardingCompleted ? (
                    <ActionTile
                      href="/listings/new"
                      icon={Plus}
                      title="Νέα αγγελία"
                      iconClassName="bg-emerald-600/[0.08] text-emerald-700 dark:text-emerald-400"
                    />
                  ) : user.role === "SEEKER" ? (
                    <ActionTile href="/" icon={Home} title="Αναζήτηση" />
                  ) : null}
                </div>

                <div className="border-t border-border/40 pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 w-full rounded-xl border-border/50 bg-muted/20 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                    disabled={loggingOut}
                    onClick={() => void onLogout()}
                  >
                    <LogOut className="size-4" aria-hidden />
                    {loggingOut ? "Αποσύνδεση…" : "Αποσύνδεση"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mt-8 overflow-hidden rounded-3xl border-slate-200/70 bg-white/90 shadow-lg ring-1 ring-primary/[0.04] backdrop-blur-md">
            <CardContent className="space-y-8 p-6 sm:p-10">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-primary/12 to-sky-100/50 text-primary shadow-sm">
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
                    "flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] shadow-md shadow-primary/15"
                  )}
                >
                  Σύνδεση / Εγγραφή
                </Link>
                <Link
                  href="/register/broker?next=%2Faccount"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "flex h-12 items-center justify-center gap-2 rounded-2xl border-border/60 bg-background/90 ring-1 ring-border/30"
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
