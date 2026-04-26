"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  ChevronRight,
  Heart,
  Home,
  Inbox,
  LayoutList,
  SendHorizontal,
  Plus,
  UserRound,
  Users,
} from "lucide-react";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { useSavedListings } from "@/components/saved/use-saved";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SERVICE_REGION_LABELS, isValidServiceRegionId, type ServiceRegionId } from "@/lib/greek-service-regions";
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
        "group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors",
        "hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-primary",
          iconClassName
        )}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="font-medium text-foreground">{title}</span>
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition group-hover:text-foreground"
            aria-hidden
          />
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-snug text-muted-foreground">{description}</span>
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
        "group rounded-xl border border-border bg-card p-4 transition-colors",
        "hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-primary",
            iconClass
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {loading ? <span className="inline-block animate-pulse text-muted-foreground">…</span> : value}
          </p>
          {subline ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{subline}</p> : null}
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground/60 transition group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </Link>
  );
}

type DashboardStats = {
  listingCount: number | null;
  appointmentCount: number | null;
  pendingBrokerAssignmentCount: number | null;
  incomingAssignmentCount: number | null;
  incomingBrokerOfferCount: number | null;
  incomingPriceOffersCount: number | null;
  sentOffersCount: number | null;
  loading: boolean;
};

const REGION_ORDER: ServiceRegionId[] = [
  "athens_metro",
  "thessaloniki_metro",
  "patras",
  "larissa",
  "heraklion",
  "greece_other",
  "greece_wide",
];

export default function AccountPage() {
  const { user, ready } = useSessionUser();
  const saved = useSavedListings();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileCompany, setProfileCompany] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileRegions, setProfileRegions] = useState<Set<ServiceRegionId>>(new Set());
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    listingCount: null,
    appointmentCount: null,
    pendingBrokerAssignmentCount: null,
    incomingAssignmentCount: null,
    incomingBrokerOfferCount: null,
    incomingPriceOffersCount: null,
    sentOffersCount: null,
    loading: true,
  });

  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? "?";
  const savedCount = saved.ids.length;
  const brokerRegionLabels =
    user?.role === "BROKER"
      ? (user.brokerServiceRegions ?? [])
          .map((id) => (id in SERVICE_REGION_LABELS ? SERVICE_REGION_LABELS[id as ServiceRegionId] : id))
          .filter(Boolean)
      : [];

  useEffect(() => {
    if (!user || user.role !== "BROKER") return;
    setProfileCompany(user.brokerCompanyName ?? "");
    setProfilePhone(user.brokerPhone ?? "");
    const regions = (user.brokerServiceRegions ?? []).filter((id): id is ServiceRegionId => isValidServiceRegionId(id));
    setProfileRegions(new Set(regions));
  }, [user]);

  function toggleRegion(id: ServiceRegionId) {
    setProfileRegions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSaveProfile() {
    if (!user || user.role !== "BROKER" || profileSaving) return;
    setProfileError(null);
    setProfileSuccess(null);

    if (profileRegions.size === 0) {
      setProfileError("Διάλεξε τουλάχιστον μία περιοχή εξυπηρέτησης.");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brokerCompanyName: profileCompany.trim(),
          brokerPhone: profilePhone.trim(),
          brokerServiceRegions: Array.from(profileRegions),
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
      setProfileSuccess("Τα στοιχεία ενημερώθηκαν.");
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Αποτυχία αποθήκευσης");
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setStats({
      listingCount: null,
      appointmentCount: null,
      pendingBrokerAssignmentCount: null,
      incomingAssignmentCount: null,
      incomingBrokerOfferCount: null,
      incomingPriceOffersCount: null,
      sentOffersCount: null,
      loading: true,
    });

    void (async () => {
      try {
        let listingCount: number | null = null;
        let appointmentCount = 0;
        let pendingBrokerAssignmentCount = 0;
        let incomingAssignmentCount = 0;
        let incomingBrokerOfferCount = 0;
        let incomingPriceOffersCount = 0;
        let sentOffersCount = 0;

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

        if (user.role === "SEEKER") {
          const pRes = await fetch("/api/listings/pending-broker-assignment", { cache: "no-store" });
          if (pRes.ok) {
            const arr = (await pRes.json()) as unknown;
            pendingBrokerAssignmentCount = Array.isArray(arr) ? arr.length : 0;
          }

          const inRes = await fetch("/api/listings/incoming-broker-offers", { cache: "no-store" });
          if (inRes.ok) {
            const arr = (await inRes.json()) as unknown;
            incomingBrokerOfferCount = Array.isArray(arr) ? arr.length : 0;
          }
        }

        if (user.role === "BROKER" || user.role === "SEEKER") {
          const priceRes = await fetch("/api/listings/incoming-price-offers", { cache: "no-store" });
          if (priceRes.ok) {
            const arr = (await priceRes.json()) as unknown;
            incomingPriceOffersCount = Array.isArray(arr) ? arr.length : 0;
          }
        }

        if (user.role === "BROKER") {
          const bRes = await fetch("/api/brokers/incoming-assignment-requests", { cache: "no-store" });
          if (bRes.ok) {
            const arr = (await bRes.json()) as unknown;
            incomingAssignmentCount = Array.isArray(arr) ? arr.length : 0;
          }

          const sentRes = await fetch("/api/brokers/sent-offers", { cache: "no-store" });
          if (sentRes.ok) {
            const arr = (await sentRes.json()) as unknown;
            sentOffersCount = Array.isArray(arr) ? arr.length : 0;
          }
        }

        if (!cancelled) {
          setStats({
            listingCount,
            appointmentCount,
            pendingBrokerAssignmentCount,
            incomingAssignmentCount,
            incomingBrokerOfferCount,
            incomingPriceOffersCount,
            sentOffersCount,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setStats({
            listingCount: null,
            appointmentCount: null,
            pendingBrokerAssignmentCount: null,
            incomingAssignmentCount: null,
            incomingBrokerOfferCount: null,
            incomingPriceOffersCount: null,
            sentOffersCount: null,
            loading: false,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "inline-flex h-9 items-center gap-2 rounded-lg"
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Αρχική
            </Link>
          </div>
          <div className="sm:text-right">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Ο λογαριασμός σου</h1>
            <p className="mt-1 text-sm text-muted-foreground">Αποθηκευμένα, αγγελίες και ραντεβού σε ένα σημείο.</p>
          </div>
        </div>

        {!ready ? (
          <Card className="mt-8 rounded-xl border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="size-10 animate-pulse rounded-full bg-muted" aria-hidden />
              <p className="text-sm text-muted-foreground">Φόρτωση πίνακα…</p>
            </CardContent>
          </Card>
        ) : user ? (
          <div className="mt-8 space-y-7">
            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <div
                  className="mx-auto flex size-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xl font-semibold text-foreground sm:mx-0"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-sm text-muted-foreground">Λογαριασμός</p>
                  <h2 className="mt-0.5 text-2xl font-semibold text-foreground">{user.name}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        user.role === "BROKER"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-foreground"
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
                  </div>
                </div>
              </div>
              <div className="border-t border-border px-5 py-5 sm:px-6">
                {!editingProfile || user.role !== "BROKER" ? (
                  <>
                    {profileSuccess ? (
                      <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                        {profileSuccess}
                      </div>
                    ) : null}
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Ονοματεπώνυμο</dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">{user.name}</dd>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Email</dt>
                        <dd className="mt-1 break-all text-sm text-foreground">{user.email}</dd>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Ρόλος</dt>
                        <dd className="mt-1 text-sm text-foreground">{user.role === "BROKER" ? "Μεσίτης" : "Ιδιώτης"}</dd>
                      </div>
                      {user.role === "BROKER" ? (
                        <>
                          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                            <dt className="text-xs font-medium text-muted-foreground">Επωνυμία γραφείου</dt>
                            <dd className="mt-1 text-sm text-foreground">{user.brokerCompanyName?.trim() || "—"}</dd>
                          </div>
                          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                            <dt className="text-xs font-medium text-muted-foreground">Τηλέφωνο</dt>
                            <dd className="mt-1 text-sm text-foreground">{user.brokerPhone?.trim() || "—"}</dd>
                          </div>
                          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 sm:col-span-2">
                            <dt className="text-xs font-medium text-muted-foreground">Περιοχές εξυπηρέτησης</dt>
                            <dd className="mt-1 text-sm text-foreground">
                              {brokerRegionLabels.length > 0 ? brokerRegionLabels.join(" · ") : "—"}
                            </dd>
                          </div>
                        </>
                      ) : null}
                    </dl>
                    {user.role === "BROKER" ? (
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-10 rounded-lg border-border"
                          onClick={() => {
                            setEditingProfile(true);
                            setProfileError(null);
                            setProfileSuccess(null);
                          }}
                        >
                          Επεξεργασία στοιχείων
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-4">
                    {profileError ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">
                        {profileError}
                      </div>
                    ) : null}
                    {profileSuccess ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                        {profileSuccess}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="account-company" className="text-xs font-medium text-muted-foreground">
                          Επωνυμία γραφείου
                        </label>
                        <Input
                          id="account-company"
                          className="h-10 rounded-lg border-border/60"
                          value={profileCompany}
                          onChange={(e) => setProfileCompany(e.target.value)}
                          placeholder="π.χ. Nestio Realty"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="account-phone" className="text-xs font-medium text-muted-foreground">
                          Τηλέφωνο
                        </label>
                        <Input
                          id="account-phone"
                          className="h-10 rounded-lg border-border/60"
                          type="tel"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          placeholder="π.χ. 210 1234567 ή 6912345678"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Περιοχές εξυπηρέτησης</p>
                      <div className="grid gap-2">
                        {REGION_ORDER.map((id) => (
                          <label
                            key={id}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                              profileRegions.has(id)
                                ? "border-primary/45 bg-primary/[0.06] ring-1 ring-primary/15"
                                : "border-border/60 bg-background hover:border-border"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 rounded border-border text-primary"
                              checked={profileRegions.has(id)}
                              onChange={() => toggleRegion(id)}
                            />
                            <span className="leading-snug text-foreground">{SERVICE_REGION_LABELS[id]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button type="button" className="h-10 rounded-lg" disabled={profileSaving} onClick={() => void onSaveProfile()}>
                        {profileSaving ? "Αποθήκευση…" : "Αποθήκευση"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 rounded-lg border-border"
                        disabled={profileSaving}
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileError(null);
                          setProfileSuccess(null);
                          setProfileCompany(user.brokerCompanyName ?? "");
                          setProfilePhone(user.brokerPhone ?? "");
                          const regions = (user.brokerServiceRegions ?? []).filter((id): id is ServiceRegionId =>
                            isValidServiceRegionId(id)
                          );
                          setProfileRegions(new Set(regions));
                        }}
                      >
                        Ακύρωση
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {user.role === "BROKER" && !user.brokerOnboardingCompleted ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-50/70 px-4 py-4 dark:border-amber-500/25 dark:bg-amber-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">Ολοκλήρωσε το προφίλ μεσίτη</p>
                    <p className="mt-1 text-sm text-muted-foreground">Χωρίς στοιχεία γραφείου δεν μπορείς να δημοσιεύσεις αγγελίες.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingProfile(true);
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    className="h-10 shrink-0 rounded-lg px-5"
                  >
                    Συμπλήρωση εδώ
                  </Button>
                </div>
              </div>
            ) : null}

            <section>
              <h3 className="mb-3 text-sm font-medium text-foreground">Η δραστηριότητά σου</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <DashboardStat
                  href="/account/viewings"
                  icon={CalendarClock}
                  label="Αιτήματα ραντεβού"
                  value={stats.appointmentCount ?? 0}
                  subline="Ως ενδιαφερόμενος ή οικοδεσπότης"
                  loading={stats.loading}
                  iconClass="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                />
                {user.role === "BROKER" || user.role === "SEEKER" ? (
                  <DashboardStat
                    href="/account/incoming-price-offers"
                    icon={CircleDollarSign}
                    label="Οικονομικές προσφορές · Εισερχόμενες"
                    value={!stats.loading && stats.incomingPriceOffersCount == null ? "—" : (stats.incomingPriceOffersCount ?? 0)}
                    subline="Προσφορές τιμής που έλαβαν οι αγγελίες σου"
                    loading={stats.loading}
                    iconClass="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  />
                ) : null}
                {user.role === "BROKER" ? (
                  <DashboardStat
                    href="/account/assignment-requests"
                    icon={Inbox}
                    label="Αναθέσεις μεσίτη · Εισερχόμενα"
                    value={!stats.loading && stats.incomingAssignmentCount == null ? "—" : (stats.incomingAssignmentCount ?? 0)}
                    subline="Ιδιώτες που ζητούν να αναλάβεις αγγελία"
                    loading={stats.loading}
                    iconClass="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                  />
                ) : null}
                {user.role === "BROKER" ? (
                  <DashboardStat
                    href="/account/sent-offers"
                    icon={SendHorizontal}
                    label="Αναθέσεις μεσίτη · Απεσταλμένα"
                    value={!stats.loading && stats.sentOffersCount == null ? "—" : (stats.sentOffersCount ?? 0)}
                    subline="Αιτήματα που έστειλες και περιμένουν απάντηση"
                    loading={stats.loading}
                    iconClass="border-primary/30 bg-primary/10 text-primary"
                  />
                ) : null}
                {user.role === "SEEKER" ? (
                  <DashboardStat
                    href="/account/incoming-broker-offers"
                    icon={Users}
                    label="Αναθέσεις μεσίτη · Προτάσεις που έλαβες"
                    value={!stats.loading && stats.incomingBrokerOfferCount == null ? "—" : (stats.incomingBrokerOfferCount ?? 0)}
                    subline="Μεσίτες που ζήτησαν να αναλάβουν αγγελίες σου"
                    loading={stats.loading}
                    iconClass="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                  />
                ) : null}
                {user.role === "SEEKER" ? (
                  <DashboardStat
                    href="/account/pending-broker-assignment"
                    icon={Clock3}
                    label="Αναθέσεις μεσίτη · Σε εκκρεμότητα"
                    value={!stats.loading && stats.pendingBrokerAssignmentCount == null ? "—" : (stats.pendingBrokerAssignmentCount ?? 0)}
                    subline="Αναμονή απάντησης ή τελικής επιβεβαίωσης"
                    loading={stats.loading}
                    iconClass="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  />
                ) : null}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-medium text-foreground">Οι αγγελίες σου</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {user.role === "BROKER" || user.role === "SEEKER" ? (
                  <DashboardStat
                    href="/listings/mine"
                    icon={LayoutList}
                    label="Οι αγγελίες μου"
                    value={!stats.loading && stats.listingCount === null ? "—" : (stats.listingCount ?? 0)}
                    subline="Όλες οι καταχωρήσεις σου"
                    loading={stats.loading}
                    iconClass="border-primary/30 bg-primary/10"
                  />
                ) : (
                  <DashboardStat
                    href="/register/broker"
                    icon={Building2}
                    label="Δημοσίευση αγγελιών"
                    value="—"
                    subline="Γίνε μεσίτης για να καταχωρείς ακίνητα"
                    iconClass="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                  />
                )}
                <DashboardStat
                  href="/saved"
                  icon={Heart}
                  label="Αποθηκευμένα"
                  value={savedCount}
                  subline="Αγγελίες που έχεις σημειώσει"
                  iconClass="border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400"
                />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-medium text-foreground">Γρήγορες ενέργειες</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ActionTile
                  href="/saved"
                  icon={Heart}
                  title="Αποθηκευμένα"
                  description="Η λίστα με τις αγγελίες που σου αρέσουν"
                  iconClassName="border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400"
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
                      iconClassName="border-primary/30 bg-primary/10 text-primary"
                    />
                    <ActionTile
                      href="/listings/new"
                      icon={Plus}
                      title="Νέα αγγελία"
                      description="Δημοσίευσε νέο ακίνητο"
                      iconClassName="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    />
                  </>
                ) : (
                  <ActionTile
                    href="/account/broker-onboarding"
                    icon={Building2}
                    title="Προφίλ μεσίτη"
                    description="Ολοκλήρωσε τα στοιχεία γραφείου"
                    iconClassName="border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-400"
                  />
                )}
              </div>
            </section>

          </div>
        ) : (
          <Card className="mt-8 rounded-xl border-border bg-card">
            <CardContent className="space-y-7 p-6 sm:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">
                  <UserRound className="size-8" aria-hidden />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">Δεν είσαι συνδεδεμένος</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Οι αποθηκευμένες αγγελίες μένουν στον browser μέχρι να συνδεθείς.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/auth/email?next=%2Faccount"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "flex h-11 items-center justify-center gap-2 rounded-lg text-[15px]"
                  )}
                >
                  Σύνδεση / Εγγραφή
                </Link>
                <Link
                  href="/register/broker?next=%2Faccount"
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "flex h-11 items-center justify-center gap-2 rounded-lg border-border bg-background"
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
