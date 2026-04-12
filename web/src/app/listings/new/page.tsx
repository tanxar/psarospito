"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  Home,
  ImageIcon,
  LayoutList,
  Lightbulb,
  MapPin,
  PenLine,
  Sparkles,
} from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_LAT = 37.9838;
const DEFAULT_LNG = 23.7275;

const COVER_OPTIONS = [
  "/listings/photos/apt1.jpg",
  "/listings/photos/apt2.jpg",
  "/listings/photos/apt3.jpg",
  "/listings/photos/apt4.jpg",
  "/listings/photos/apt5.jpg",
  "/listings/photos/apt6.jpg",
] as const;

const HIGHLIGHT_OPTIONS = [
  { value: "Near metro", label: "Κοντά στο μετρό" },
  { value: "Near tram", label: "Κοντά στο τραμ" },
  { value: "Balcony", label: "Μπαλκόνι" },
  { value: "Parking", label: "Πάρκινγκ" },
  { value: "Elevator", label: "Ασανσέρ" },
  { value: "Bright", label: "Φωτεινό" },
  { value: "Renovated", label: "Ανακαινισμένο" },
  { value: "Pets ok", label: "Κατοικίδια" },
] as const;

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? <p className="text-[13px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function SectionShell({
  step,
  icon: Icon,
  title,
  description,
  children,
  accent = "primary",
}: {
  step: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: "primary" | "violet" | "amber";
}) {
  const accentRing =
    accent === "violet"
      ? "from-violet-500/15 to-transparent"
      : accent === "amber"
        ? "from-amber-500/12 to-transparent"
        : "from-primary/12 to-transparent";

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25 backdrop-blur-sm"
      )}
    >
      <div className={cn("h-px bg-gradient-to-r", accentRing, accent === "primary" && "via-primary/20")} />
      <div className="p-6 sm:p-8">
        <div className="mb-8 flex gap-5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80",
              accent === "violet" && "text-violet-600 dark:text-violet-400",
              accent === "amber" && "text-amber-600 dark:text-amber-400",
              accent === "primary" && "text-primary"
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-muted/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {step}
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            {description ? (
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </Card>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-[15px] leading-snug">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

export default function NewListingPage() {
  const router = useRouter();
  const { user, ready } = useSessionUser();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [rooms, setRooms] = useState<string>("2");
  const [dealType, setDealType] = useState<"rent" | "sale">("rent");
  const [sqm, setSqm] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [selectedHighlights, setSelectedHighlights] = useState<Set<string>>(new Set());
  const [highlightsExtra, setHighlightsExtra] = useState("");
  const [coverImageSrc, setCoverImageSrc] = useState<string>(COVER_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleHighlight = (value: string) => {
    setSelectedHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const roomsCountForApi = useMemo(() => {
    if (rooms === "studio") return 0;
    if (rooms === "3+") return 3;
    return Number(rooms);
  }, [rooms]);

  const roomsLabel = useMemo(() => {
    if (rooms === "studio") return "Στούντιο";
    if (rooms === "3+") return "3+ δωμ.";
    return `${rooms} δωμ.`;
  }, [rooms]);

  const parsedPrice = useMemo(() => {
    const p = Number(priceEur.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [priceEur]);

  const parsedSqm = useMemo(() => {
    const s = Number(sqm.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(s) && s > 0 ? Math.round(s) : null;
  }, [sqm]);

  const previewSubtitle = useMemo(() => {
    if (subtitle.trim()) return subtitle.trim();
    if (parsedSqm !== null && roomsCountForApi >= 0) {
      const bed =
        roomsCountForApi === 0 ? "Στούντιο" : roomsCountForApi === 3 ? "3+ υπν." : `${roomsCountForApi} υπν.`;
      return `${bed} · ${parsedSqm} m²`;
    }
    return null;
  }, [subtitle, parsedSqm, roomsCountForApi]);

  const previewHighlights = useMemo(() => {
    const extra = highlightsExtra
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const fromSet = [...selectedHighlights].map((v) => HIGHLIGHT_OPTIONS.find((o) => o.value === v)?.label ?? v);
    return [...new Set([...fromSet, ...extra])].slice(0, 5);
  }, [selectedHighlights, highlightsExtra]);

  const hasTitle = title.trim().length > 0;
  const hasPrice = parsedPrice !== null;
  const hasSqm = parsedSqm !== null;
  const hasHighlights = selectedHighlights.size > 0 || highlightsExtra.trim().length > 0;

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    const p = Number(priceEur.replace(/\s/g, "").replace(",", "."));
    const s = Number(sqm.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(p) || p <= 0) return false;
    if (!Number.isFinite(s) || s <= 0) return false;
    if (!Number.isFinite(roomsCountForApi) || roomsCountForApi < 0) return false;
    const la = lat.trim() === "" ? DEFAULT_LAT : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? DEFAULT_LNG : Number(lng.replace(",", "."));
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
    return true;
  }, [title, priceEur, sqm, roomsCountForApi, lat, lng]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    const la = lat.trim() === "" ? DEFAULT_LAT : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? DEFAULT_LNG : Number(lng.replace(",", "."));

    const extra = highlightsExtra
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const highlights = [...new Set([...selectedHighlights, ...extra])];

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          priceEur: Math.round(Number(priceEur.replace(/\s/g, "").replace(",", "."))),
          roomsCount: roomsCountForApi,
          sqm: Math.round(Number(sqm.replace(/\s/g, "").replace(",", "."))),
          lat: la,
          lng: ln,
          highlights,
          coverImageSrc: coverImageSrc.trim() || COVER_OPTIONS[0],
          dealType,
        }),
      });

      if (!res.ok) {
        let msg = "Αποτυχία δημιουργίας αγγελίας";
        const raw = await res.text().catch(() => "");
        try {
          const j = JSON.parse(raw) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          if (raw.trim()) msg = raw.trim();
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as { id: string };
      router.push(`/listing/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setSubtitle("");
    setDescription("");
    setPriceEur("");
    setRooms("2");
    setDealType("rent");
    setSqm("");
    setLat("");
    setLng("");
    setSelectedHighlights(new Set());
    setHighlightsExtra("");
    setCoverImageSrc(COVER_OPTIONS[0]);
    setError(null);
  }

  const canPostListing =
    ready && user !== null && user.role === "BROKER" && user.brokerOnboardingCompleted;

  if (!ready) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
      </div>
    );
  }

  if (!canPostListing) {
    const loginHref = "/auth/email?next=%2Flistings%2Fnew";
    const registerBrokerHref = "/register/broker?next=%2Faccount%2Fbroker-onboarding";
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

        <div className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6 sm:py-20">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "mb-8 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Αρχική
          </Link>

          <Card className="rounded-3xl border-border/50 bg-card/90 p-8 shadow-sm ring-1 ring-border/25">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-border/50 bg-primary/10">
              <Building2 className="size-6 text-primary" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Καταχώρηση αγγελίας</h1>
            {!user ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Για να δημοσιεύσεις χρειάζεσαι λογαριασμό μεσίτη και σύντομο προφίλ γραφείου.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href={loginHref} className={cn(buttonVariants({ variant: "default" }), "h-12 justify-center rounded-xl")}>
                    Σύνδεση
                  </Link>
                  <Link
                    href={registerBrokerHref}
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "h-12 justify-center rounded-xl border-border/50 bg-background"
                    )}
                  >
                    Εγγραφή ως μεσίτης
                  </Link>
                </div>
              </>
            ) : user.role === "SEEKER" ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Οι δημοσιεύσεις είναι διαθέσιμες μόνο για επαγγελματίες μεσίτες. Ο λογαριασμός σου είναι ως αναζητητής
                  ακινήτου.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Για καταχωρήσεις χρειάζεται ξεχωριστός λογαριασμός με ρόλο μεσίτη (άλλο email).
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/" className={cn(buttonVariants({ variant: "default" }), "h-12 justify-center rounded-xl")}>
                    Αναζήτηση
                  </Link>
                  <Link
                    href="/account"
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "h-12 justify-center rounded-xl border-border/50 bg-background"
                    )}
                  >
                    Λογαριασμός
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Ολοκλήρωσε πρώτα τα στοιχεία του γραφείου σου — μετά μπορείς να δημοσιεύεις.
                </p>
                <Link
                  href="/account/broker-onboarding"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6"
                  )}
                >
                  Συνέχεια στο προφίλ
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Hero */}
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-border/45 bg-card/75 p-8 shadow-sm ring-1 ring-border/25 backdrop-blur-md sm:mb-14 sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/[0.07] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-500/[0.06] blur-3xl"
            aria-hidden
          />

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "relative z-[1] mb-8 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Αρχική
          </Link>

          <div className="relative z-[1] flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-3 text-xs font-medium text-muted-foreground">
                {[
                  { n: "1", t: "Στοιχεία" },
                  { n: "2", t: "Χαρακτηριστικά" },
                  { n: "3", t: "Εικόνα & χάρτης" },
                ].map((s, i) => (
                  <span key={s.n} className="flex items-center gap-1">
                    {i > 0 ? <span className="px-1 text-border">/</span> : null}
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-3.5 py-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {s.n}
                      </span>
                      {s.t}
                    </span>
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
                Νέα αγγελία
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-[1.65] text-muted-foreground sm:text-base sm:leading-relaxed">
                Δημιούργησε μια καθαρή, ελκυστική καταχώρηση. Στα δεξιά βλέπεις ζωντανή προεπισκόπηση — ό,τι γράφεις
                ενημερώνεται αμέσως.
              </p>
            </div>
            <div className="relative z-[1] max-w-md shrink-0 rounded-2xl border border-primary/12 bg-primary/[0.04] px-5 py-4 text-[15px] leading-relaxed text-primary">
              <LayoutList className="mb-2 size-5 opacity-75" aria-hidden />
              <span className="font-medium">Μετά τη δημοσίευση θα εμφανίζεται στην αρχική και στον χάρτη.</span>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start lg:gap-12">
          <form onSubmit={onSubmit} className="space-y-8 sm:space-y-10">
            <SectionShell
              step="Βήμα 01"
              icon={Home}
              title="Βασικά στοιχεία"
              description="Τίτλος, τιμή και μέγεθος — αυτά εμφανίζονται πρώτα στη λίστα αποτελεσμάτων."
              accent="primary"
            >
              <div className="grid gap-8">
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 sm:p-6">
                  <div className="text-sm font-medium text-foreground">Τύπος συναλλαγής</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Ενοικίαση ή πώληση — εμφανίζεται στην κάρτα και στο φιλτράρισμα.
                  </p>
                  <div className="mt-5 inline-flex rounded-xl border border-border/50 bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setDealType("rent")}
                      className={cn(
                        "h-10 rounded-lg px-5 text-sm font-medium transition-colors",
                        dealType === "rent"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={dealType === "rent"}
                    >
                      Ενοικίαση
                    </button>
                    <button
                      type="button"
                      onClick={() => setDealType("sale")}
                      className={cn(
                        "h-10 rounded-lg px-5 text-sm font-medium transition-colors",
                        dealType === "sale"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={dealType === "sale"}
                    >
                      Πώληση
                    </button>
                  </div>
                </div>

                <Field id="listing-title" label="Τίτλος αγγελίας" hint="Κράτα τον σύντομο: περιοχή + τύπος ακινήτου.">
                  <Input
                    id="listing-title"
                    className="h-12 rounded-xl border-border/50 bg-background"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Π.χ. Κουκάκι · Διαμέρισμα"
                    required
                    autoComplete="off"
                  />
                </Field>

                <Field
                  id="listing-subtitle"
                  label="Υπότιτλος (προαιρετικό)"
                  hint="Δωμάτια, τετραγωνικά, όροφος. Αν το αφήσεις κενό, θα δημιουργηθεί αυτόματα από τα πεδία πιο κάτω."
                >
                  <textarea
                    id="listing-subtitle"
                    rows={3}
                    className={cn(
                      "min-h-[5.5rem] w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-[15px] leading-relaxed",
                      "outline-none transition-colors placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    )}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="2 υπνοδωμάτια · 70 m² · 3ος όροφος"
                  />
                </Field>

                <Field
                  id="listing-description"
                  label="Περιγραφή (προαιρετικό)"
                  hint="Εμφανίζεται στη σελίδα της αγγελίας πριν τα χαρακτηριστικά. Μπορείς να χρησιμοποιήσεις νέες γραμμές."
                >
                  <textarea
                    id="listing-description"
                    rows={6}
                    className={cn(
                      "min-h-[9rem] w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-[15px] leading-relaxed",
                      "outline-none transition-colors placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    )}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Περιέγραψε το ακίνητο, τη γειτονιά, κατάσταση, θέρμανση, διαθεσιμότητα κ.λπ."
                  />
                </Field>

                <div className="grid gap-7 sm:grid-cols-3 sm:gap-6">
                  <Field
                    id="listing-price"
                    label="Τιμή (€)"
                    hint={
                      dealType === "sale"
                        ? "Συνολική τιμή πώλησης του ακινήτου."
                        : "Μηνιαίο μίσθωμα (ανά μήνα)."
                    }
                  >
                    <Input
                      id="listing-price"
                      className="h-12 rounded-xl border-border/50 bg-background"
                      value={priceEur}
                      onChange={(e) => setPriceEur(e.target.value)}
                      inputMode="decimal"
                      placeholder="950"
                      required
                    />
                  </Field>
                  <Field id="listing-rooms" label="Δωμάτια" hint="Πόσα υπνοδωμάτια (ή στούντιο).">
                    <Select value={rooms} onValueChange={(v) => v != null && setRooms(v)}>
                      <SelectTrigger
                        id="listing-rooms"
                        className="h-12 w-full rounded-xl border-border/50 bg-background"
                      >
                        <SelectValue placeholder="Επίλεξε" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Στούντιο</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3+">3+</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="listing-sqm" label="Εμβαδόν (m²)">
                    <Input
                      id="listing-sqm"
                      className="h-12 rounded-xl border-border/50 bg-background"
                      value={sqm}
                      onChange={(e) => setSqm(e.target.value)}
                      inputMode="decimal"
                      placeholder="70"
                      required
                    />
                  </Field>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              step="Βήμα 02"
              icon={Sparkles}
              title="Χαρακτηριστικά"
              description="Βοηθούν τους ενδιαφερόμενους να φιλτράρουν γρήγορα. Πρόσθεσε και δικά σου με κόμμα."
              accent="violet"
            >
              <div className="flex flex-wrap gap-2.5">
                {HIGHLIGHT_OPTIONS.map(({ value, label }) => {
                  const active = selectedHighlights.has(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleHighlight(value)}
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm font-medium transition-all",
                        active
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "border-border/50 bg-background/80 text-muted-foreground hover:border-border/80 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <Field
                id="listing-highlights-extra"
                label="Επιπλέον λέξεις-κλειδιά"
                hint="Χώρισέ τες με κόμμα · π.χ. Ήσυχο, Θέα, Νεόδμητο"
                className="mt-8"
              >
                <Input
                  id="listing-highlights-extra"
                  className="h-12 rounded-xl border-border/50 bg-background"
                  value={highlightsExtra}
                  onChange={(e) => setHighlightsExtra(e.target.value)}
                  placeholder="Ήσυχο, Θέα στη θάλασσα"
                />
              </Field>
            </SectionShell>

            <SectionShell
              step="Βήμα 03"
              icon={ImageIcon}
              title="Φωτογραφία & τοποθεσία"
              description="Η εικόνα εξώφυλλου εμφανίζεται στις κάρτες. Οι συντεταγμένες τοποθετούν την καρφίτσα στον χάρτη."
              accent="amber"
            >
              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                  Επίλεξε εξώφυλλο
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {COVER_OPTIONS.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setCoverImageSrc(src)}
                      className={cn(
                        "group relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-all",
                        coverImageSrc === src
                          ? "border-primary/70 ring-1 ring-primary/25"
                          : "border-transparent opacity-80 hover:opacity-100 hover:ring-1 hover:ring-border/50"
                      )}
                    >
                      <Image src={src} alt="" fill className="object-cover" sizes="(max-width:640px) 33vw, 120px" />
                      {coverImageSrc === src ? (
                        <span className="absolute inset-x-0 bottom-0 bg-primary/90 py-0.5 text-center text-[10px] font-semibold text-primary-foreground">
                          Επιλεγμένο
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/45 bg-gradient-to-b from-muted/25 to-background/90 p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden />
                  Συντεταγμένες χάρτη
                </div>
                <p className="mb-6 text-[13px] leading-relaxed text-muted-foreground">
                  Άνοιξε το Google Maps, κάνε δεξί κλικ στο σημείο → αντιγραφή συντεταγμένων. Αν τις αφήσεις κενές, χρησιμοποιείται
                  προεπιλογή κέντρου Αθήνας.
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field id="listing-lat" label="Πλάτος (lat)">
                    <Input
                      id="listing-lat"
                      className="h-12 rounded-xl border-border/50 bg-background font-mono text-sm"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_LAT)}
                    />
                  </Field>
                  <Field id="listing-lng" label="Μήκος (lng)">
                    <Input
                      id="listing-lng"
                      className="h-12 rounded-xl border-border/50 bg-background font-mono text-sm"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_LNG)}
                    />
                  </Field>
                </div>
              </div>
            </SectionShell>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/8 px-5 py-4 text-[15px] leading-relaxed text-destructive"
              >
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-4 rounded-2xl border border-border/45 bg-card/70 p-6 shadow-sm ring-1 ring-border/20 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7">
              <Button
                type="button"
                variant="secondary"
                className="h-12 rounded-xl border-border/50 bg-background"
                onClick={resetForm}
                disabled={loading}
              >
                Εκκαθάριση φόρμας
              </Button>
              <Button type="submit" className="h-12 min-w-[220px] rounded-xl px-10" disabled={!canSubmit || loading}>
                {loading ? "Δημοσίευση…" : "Δημοσίευση αγγελίας"}
              </Button>
            </div>
          </form>

          {/* Sidebar: preview + checklist */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/25">
              <div className="border-b border-border/40 bg-muted/15 px-5 py-4">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <PenLine className="size-4 text-primary" aria-hidden />
                  Προεπισκόπηση
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">Έτσι θα φαίνεται περίπου στη λίστα.</p>
              </div>
              <div className="p-5 sm:p-6">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/40">
                  <Image
                    src={coverImageSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 340px"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full border border-white/30 bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {dealType === "sale" ? "Πώληση" : "Ενοικίαση"}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug drop-shadow-sm">
                      {hasTitle ? title.trim() : "Ο τίτλος της αγγελίας σου"}
                    </p>
                    {previewSubtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs text-white/85 drop-shadow-sm">{previewSubtitle}</p>
                    ) : (
                      <p className="mt-1 text-xs italic text-white/60">Συμπλήρωσε εμβαδόν & δωμάτια για υπότιτλο</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex items-baseline justify-between gap-2 border-t border-border/40 pt-5">
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {hasPrice ? formatEur(parsedPrice!) : "— €"}
                  </span>
                  <span className="text-xs text-muted-foreground">{roomsLabel}</span>
                </div>
                {parsedSqm !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">{parsedSqm} m²</p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted-foreground">Πρόσθεσε m²</p>
                )}
                {previewHighlights.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {previewHighlights.map((h) => (
                      <span
                        key={h}
                        className="rounded-full border border-border/60 bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground/90"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] text-muted-foreground">Διάλεξε χαρακτηριστικά για ετικέτες.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-2xl border-border/50 bg-card/85 p-5 shadow-sm ring-1 ring-border/25 sm:p-6">
              <div className="mb-4 text-sm font-semibold text-foreground">Έλεγχος πριν τη δημοσίευση</div>
              <div className="space-y-2">
                <CheckRow done={hasTitle} label="Τίτλος συμπληρωμένος" />
                <CheckRow done={hasPrice} label="Έγκυρη τιμή" />
                <CheckRow done={hasSqm} label="Εμβαδόν (m²)" />
                <CheckRow done={true} label="Δωμάτια επιλεγμένα" />
                <CheckRow done={hasHighlights} label="Τουλάχιστον ένα χαρακτηριστικό (προτείνεται)" />
              </div>
            </Card>

            <div className="flex gap-4 rounded-2xl border border-primary/12 bg-primary/[0.035] p-5 text-[15px] leading-relaxed text-foreground sm:p-6">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary/90" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">Συμβουλή</p>
                <p className="mt-2 text-muted-foreground">
                  Καλοί τίτλοι αναφέρουν περιοχή και τύπο ακινήτου. Στο υπότιτλο βάλε όροφο, κατάσταση ή απόσταση από μετρό.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
