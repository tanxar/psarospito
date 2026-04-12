"use client";

import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import {
  isValidEmail,
  normalizeEmail,
  validateDisplayName,
  validatePassword,
} from "@/lib/auth-validation";
import { safeInternalPath } from "@/lib/safe-redirect";
import { parseSessionUser } from "@/lib/user-session-types";
import { cn } from "@/lib/utils";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function EmailAuthContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, ready } = useSessionUser();
  const next = useMemo(() => safeInternalPath(searchParams.get("next")), [searchParams]);

  const [step, setStep] = useState<"email" | "password" | "register">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get("email")?.trim();
    if (param) setEmail(param);
  }, [searchParams]);

  useEffect(() => {
    const raw = searchParams.get("oauth_error")?.trim();
    if (!raw) return;
    try {
      setError(decodeURIComponent(raw));
    } catch {
      setError(raw);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("oauth_error");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (ready && user) {
      router.replace(resolvePostAuthRedirect(user, next));
    }
  }, [ready, user, router, next]);

  async function onEmailContinue(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      setError("Βάλε ένα έγκυρο email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const raw = await res.text();
      let msg = "Κάτι πήγε στραβά";
      let data: { exists?: unknown; error?: unknown } | null = null;
      try {
        data = JSON.parse(raw) as { exists?: unknown; error?: unknown };
        if (typeof data?.error === "string" && data.error.trim()) msg = data.error.trim();
      } catch {
        if (raw.trim()) msg = raw.trim();
      }
      if (!res.ok) throw new Error(msg);
      const exists = data?.exists === true;
      setEmail(normalized);
      if (exists) {
        setStep("password");
        setPassword("");
      } else {
        setStep("register");
        setRegName("");
        setRegPassword("");
        setRegConfirm("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία");
    } finally {
      setLoading(false);
    }
  }

  async function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await res.text();
      let msg = "Αποτυχία σύνδεσης";
      let parsedBody: { error?: unknown; user?: unknown } | null = null;
      try {
        parsedBody = JSON.parse(raw) as { error?: unknown; user?: unknown };
        if (typeof parsedBody?.error === "string" && parsedBody.error.trim()) msg = parsedBody.error.trim();
      } catch {
        if (raw.trim()) msg = raw.trim();
      }
      if (!res.ok) throw new Error(msg);
      const parsed = parseSessionUser(parsedBody?.user);
      if (!parsed) throw new Error("Αποτυχία σύνδεσης");
      notifyAuthChanged();
      router.replace(resolvePostAuthRedirect(parsed, next));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία σύνδεσης");
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterSeeker(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const nameErr = validateDisplayName(regName);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const passErr = validatePassword(regPassword);
    if (passErr) {
      setError(passErr);
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Οι κωδικοί δεν ταιριάζουν");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: regPassword,
          name: regName.trim(),
          role: "SEEKER",
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
      if (!res.ok) throw new Error(msg);
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

  const brokerHref = `/register/broker${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  const title =
    step === "email" ? "Είσοδος" : step === "password" ? "Κωδικός" : "Νέος λογαριασμός";

  const subtitle =
    step === "email"
      ? "Βάλε το email σου. Αν υπάρχει λογαριασμός, θα ζητήσουμε κωδικό· αλλιώς θα δημιουργήσεις νέο."
      : step === "password"
        ? email
        : "Αυτό το email δεν είναι καταχωρημένο. Συμπλήρωσε όνομα και κωδικό.";

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/25">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-14">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-foreground"
              >
                {error}
              </div>
            ) : null}

            {step === "email" ? (
              <div className="space-y-4">
                <form className="space-y-4" onSubmit={onEmailContinue}>
                  <div className="space-y-2">
                    <label htmlFor="auth-email" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      className="h-11"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="onoma@domain.gr"
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={loading}>
                    {loading ? "Έλεγχος…" : "Συνέχεια"}
                  </Button>
                </form>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">ή</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/api/auth/oauth/google?next=${encodeURIComponent(next)}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-11 w-full justify-center gap-2.5 border-border/70 bg-background font-normal"
                    )}
                  >
                    <GoogleGlyph className="size-5 shrink-0" />
                    Είσοδος με Google
                  </Link>
                  <Link
                    href={`/api/auth/oauth/facebook?next=${encodeURIComponent(next)}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-11 w-full justify-center gap-2.5 border-border/70 bg-background font-normal"
                    )}
                  >
                    <FacebookGlyph className="size-5 shrink-0" />
                    Είσοδος με Facebook
                  </Link>
                </div>
              </div>
            ) : step === "password" ? (
              <form className="space-y-4" onSubmit={onPasswordLogin}>
                <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Email · </span>
                  <span className="font-medium text-foreground">{email}</span>
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-password" className="text-sm font-medium text-foreground">
                    Κωδικός
                  </label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete="current-password"
                    className="h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? "Σύνδεση…" : "Σύνδεση"}
                </Button>
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setStep("email");
                    setPassword("");
                    setError(null);
                  }}
                >
                  Άλλο email
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={onRegisterSeeker}>
                <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Email · </span>
                  <span className="font-medium text-foreground">{email}</span>
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-reg-name" className="text-sm font-medium text-foreground">
                    Όνομα
                  </label>
                  <Input
                    id="auth-reg-name"
                    autoComplete="name"
                    className="h-11"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Το όνομά σου"
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-reg-password" className="text-sm font-medium text-foreground">
                    Κωδικός (τουλάχιστον 8 χαρακτήρες)
                  </label>
                  <Input
                    id="auth-reg-password"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-reg-confirm" className="text-sm font-medium text-foreground">
                    Επανάληψη κωδικού
                  </label>
                  <Input
                    id="auth-reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    className="h-11"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading ? "Δημιουργία…" : "Δημιουργία λογαριασμού"}
                </Button>
                <button
                  type="button"
                  className="w-full py-2 text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setStep("email");
                    setRegName("");
                    setRegPassword("");
                    setRegConfirm("");
                    setError(null);
                  }}
                >
                  Άλλο email
                </button>
              </form>
            )}

            <p className="mt-6 border-t border-border/50 pt-5 text-center text-sm text-muted-foreground">
              Μεσίτης;{" "}
              <Link href={brokerHref} className="font-medium text-primary underline-offset-4 hover:underline">
                Εγγραφή επαγγελματία
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EmailAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
      }
    >
      <EmailAuthContent />
    </Suspense>
  );
}
