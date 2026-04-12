"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { safeInternalPath } from "@/lib/safe-redirect";
import { parseSessionUser } from "@/lib/user-session-types";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[13px] font-medium leading-none text-foreground/90">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[12px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/70">{children}</p>
  );
}

/** Διακοσμητική εικονογράφηση (inline SVG) — κτίρια & ουρανός. */
function BrokerIllustration({ className }: { className?: string }) {
  const gid = useId().replace(/:/g, "");
  const skyGrad = `br-sky-${gid}`;
  const buildingGrad = `br-building-${gid}`;
  return (
    <svg
      className={className}
      viewBox="0 0 320 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={skyGrad} x1="0" y1="0" x2="320" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="#bfdbfe" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#e0f2fe" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={buildingGrad} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#003087" stopOpacity="0.22" />
          <stop offset="1" stopColor="#003087" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="320" height="140" rx="20" fill={`url(#${skyGrad})`} />
      <ellipse cx="260" cy="36" rx="28" ry="14" fill="#fff" fillOpacity="0.55" />
      <ellipse cx="72" cy="28" rx="22" ry="11" fill="#fff" fillOpacity="0.45" />
      <circle cx="268" cy="32" r="14" fill="#fbbf24" fillOpacity="0.85" />
      <circle cx="272" cy="28" r="4" fill="#fffbeb" fillOpacity="0.9" />
      <path
        d="M0 110 L320 110 L320 140 L0 140 Z"
        fill="#003087"
        fillOpacity="0.06"
      />
      <rect x="24" y="58" width="44" height="52" rx="3" fill={`url(#${buildingGrad})`} stroke="#003087" strokeOpacity="0.12" />
      <rect x="32" y="70" width="8" height="10" rx="1" fill="#fbbf24" fillOpacity="0.35" />
      <rect x="44" y="70" width="8" height="10" rx="1" fill="#fbbf24" fillOpacity="0.25" />
      <rect x="32" y="86" width="8" height="10" rx="1" fill="#fbbf24" fillOpacity="0.2" />
      <rect x="84" y="42" width="52" height="68" rx="4" fill="#fff" fillOpacity="0.75" stroke="#003087" strokeOpacity="0.1" />
      <rect x="94" y="54" width="10" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.25" />
      <rect x="108" y="54" width="10" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.18" />
      <rect x="94" y="68" width="10" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.2" />
      <rect x="108" y="68" width="10" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.15" />
      <rect x="94" y="82" width="10" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.12" />
      <rect x="148" y="68" width="40" height="42" rx="3" fill={`url(#${buildingGrad})`} stroke="#003087" strokeOpacity="0.1" />
      <rect x="198" y="52" width="48" height="58" rx="4" fill="#003087" fillOpacity="0.14" stroke="#003087" strokeOpacity="0.12" />
      <rect x="208" y="64" width="9" height="8" rx="1" fill="#fef08a" fillOpacity="0.5" />
      <rect x="221" y="64" width="9" height="8" rx="1" fill="#fef08a" fillOpacity="0.35" />
      <rect x="208" y="78" width="9" height="8" rx="1" fill="#fef08a" fillOpacity="0.28" />
      <rect x="256" y="76" width="36" height="34" rx="3" fill="#fff" fillOpacity="0.65" stroke="#003087" strokeOpacity="0.08" />
      <rect x="264" y="86" width="8" height="7" rx="1" fill="#38bdf8" fillOpacity="0.3" />
    </svg>
  );
}

/** Εγγραφή μεσίτη (`/register/broker`). Οι ιδιώτες: `/auth/email`. */
export function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useSessionUser();
  const next = useMemo(() => safeInternalPath(searchParams.get("next")), [searchParams]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get("email")?.trim();
    if (param) setEmail(param);
  }, [searchParams]);

  useEffect(() => {
    if (ready && user) {
      router.replace(resolvePostAuthRedirect(user, next));
    }
  }, [ready, user, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password !== confirm) {
      setError("Οι κωδικοί δεν ταιριάζουν");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: "BROKER",
          brokerCompanyName: company.trim(),
          brokerPhone: phone.trim(),
        }),
      });
      const raw = await res.text();
      let msg = "Αποτυχία εγγραφής";
      let parsedBody: { error?: unknown; user?: unknown } | null = null;
      try {
        parsedBody = JSON.parse(raw) as { error?: unknown; user?: unknown };
        if (typeof parsedBody?.error === "string" && parsedBody.error.trim()) msg = parsedBody.error.trim();
      } catch {
        if (raw.trim()) msg = raw.trim();
      }
      if (!res.ok) {
        throw new Error(msg);
      }
      const parsed = parseSessionUser(parsedBody?.user);
      if (!parsed) throw new Error("Αποτυχία εγγραφής");
      notifyAuthChanged();
      router.replace(resolvePostAuthRedirect(parsed, next));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία εγγραφής");
    } finally {
      setLoading(false);
    }
  }

  const authEmailHref = `/auth/email${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-muted-foreground">
        Φόρτωση…
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50/80 via-zinc-50 to-amber-50/35">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(0,48,135,0.11),transparent_50%),radial-gradient(ellipse_60%_45%_at_100%_80%,rgba(14,165,233,0.08),transparent),radial-gradient(ellipse_50%_40%_at_0%_100%,rgba(251,191,36,0.1),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-300/40 via-primary/25 to-amber-200/50" aria-hidden />

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl flex-1 grid-cols-1 content-center gap-10 px-5 py-14 sm:gap-12 sm:px-6 sm:py-16 lg:max-w-7xl lg:grid-cols-[minmax(0,1.05fr)_minmax(0,26rem)] lg:items-start lg:gap-16 lg:py-20 xl:gap-20">
        <section
          className="order-2 flex flex-col justify-center pt-2 lg:order-1 lg:min-h-[min(32rem,75vh)] lg:pr-4 lg:pt-10 xl:pr-10"
          aria-labelledby="broker-register-hero-title"
        >
          <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary shadow-sm backdrop-blur-sm">
            Nestio · Μεσίτες
          </span>
          <h1
            id="broker-register-hero-title"
            className="mt-5 max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-[1.15] lg:text-[2.35rem] lg:leading-tight xl:text-4xl xl:leading-[1.12]"
          >
            Λογαριασμός επαγγελματία
          </h1>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px] sm:leading-relaxed">
            Δωρεάν έναρξη, προφίλ γραφείου, άμεση πρόσβαση — χωρίς επιπλέον βήματα μετά την εγγραφή.
          </p>
          <div className="relative mt-8 max-w-lg">
            <div
              className="pointer-events-none absolute -left-4 -top-4 size-40 rounded-full bg-sky-300/18 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-6 right-0 size-36 rounded-full bg-amber-200/22 blur-3xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-900/[0.06] shadow-[0_24px_48px_-28px_rgba(0,48,135,0.35)]">
              <BrokerIllustration className="relative z-[1] block w-full max-w-[min(100%,400px)] sm:max-w-[min(100%,420px)]" />
            </div>
          </div>
          <div className="mt-8 max-w-lg rounded-2xl border border-slate-200/70 border-l-[3px] border-l-primary/50 bg-white/70 py-5 pl-5 pr-5 shadow-sm backdrop-blur-md sm:pl-6 sm:pr-6">
            <p className="text-lg font-semibold tracking-tight text-primary">Ξεκινήστε δωρεάν</p>
            <ul className="mt-4 space-y-2.5 text-sm leading-snug text-foreground/90">
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[1.125rem] shrink-0 text-primary" aria-hidden strokeWidth={2.25} />
                <span>
                  <span className="font-medium text-foreground">Επωφεληθείτε</span> από προφίλ γραφείου έτοιμο από την πρώτη
                  μέρα — εμφανίζεται μαζί με τις αγγελίες σου.
                </span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[1.125rem] shrink-0 text-primary" aria-hidden strokeWidth={2.25} />
                <span>Ένα βήμα, χωρίς επιπλέον φόρμες· απευθείας στον λογαριασμό σου.</span>
              </li>
              <li className="flex gap-3">
                <Check className="mt-0.5 size-[1.125rem] shrink-0 text-primary" aria-hidden strokeWidth={2.25} />
                <span>Λιγότερος χρόνος σε ρυθμίσεις — περισσότερος για πελάτες και ακίνητα.</span>
              </li>
            </ul>
          </div>
        </section>

        <div className="order-1 w-full max-w-[26rem] justify-self-center lg:sticky lg:top-10 lg:order-2 lg:max-w-none lg:justify-self-end lg:pt-10">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_28px_56px_-20px_rgba(0,48,135,0.14)] ring-1 ring-primary/[0.06] backdrop-blur-md transition-[box-shadow,transform] duration-300 motion-safe:lg:hover:-translate-y-0.5 lg:hover:shadow-[0_28px_56px_-18px_rgba(0,48,135,0.2)]">
            <div className="relative border-b border-slate-200/70 bg-gradient-to-r from-primary/[0.06] via-white to-sky-50/50 px-6 py-5 sm:px-8 sm:py-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Δημιουργία λογαριασμού</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Γραφείο και στοιχεία σύνδεσης· συμπλήρωση και μπαίνεις.
              </p>
            </div>

            <div className="relative bg-gradient-to-b from-white to-zinc-50/80 px-6 py-8 sm:px-9 sm:py-9">
            {error ? (
              <div
                role="alert"
                className="mb-8 rounded-2xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm text-foreground"
              >
                {error}
              </div>
            ) : null}

            <form className="space-y-9" onSubmit={onSubmit}>
              <div className="space-y-5">
              <SectionLabel>Γραφείο</SectionLabel>
              <Field id="reg-company" label="Επωνυμία γραφείου">
                <Input
                  id="reg-company"
                  className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="π.χ. Nestio Realty"
                  required
                  minLength={2}
                  autoComplete="organization"
                  autoFocus
                />
              </Field>
              <Field
                id="reg-phone"
                label="Τηλέφωνο"
                hint="Τουλάχιστον 10 ψηφία· κενά και σύμβολα αγνοούνται."
              >
                <Input
                  id="reg-phone"
                  type="tel"
                  className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="210 1234567"
                  required
                  autoComplete="tel"
                />
              </Field>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" aria-hidden />

              <div className="space-y-5">
              <SectionLabel>Πρόσωπο &amp; σύνδεση</SectionLabel>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="reg-name" label="Όνομα εμφάνισης">
                  <Input
                    id="reg-name"
                    autoComplete="name"
                    className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Το όνομά σου"
                    required
                    minLength={2}
                  />
                </Field>
                <Field id="reg-email" label="Email">
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="onoma@domain.gr"
                    required
                  />
                </Field>
                <Field id="reg-password" label="Κωδικός">
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Τουλάχιστον 8 χαρακτήρες"
                    required
                    minLength={8}
                  />
                </Field>
                <Field id="reg-confirm" label="Επανάληψη κωδικού">
                  <Input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-slate-200/95 bg-white shadow-sm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ίδιος κωδικός"
                    required
                    minLength={8}
                  />
                </Field>
              </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-primary text-[15px] font-medium text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Δημιουργία λογαριασμού…" : "Δημιουργία λογαριασμού"}
                </Button>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Αυτόματη σύνδεση μετά την επιτυχή εγγραφή.
                </p>
              </div>
            </form>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground lg:text-left">
            Έχεις ήδη λογαριασμό;{" "}
            <Link href={authEmailHref} className="font-medium text-primary underline-offset-4 hover:underline">
              Σύνδεση
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
