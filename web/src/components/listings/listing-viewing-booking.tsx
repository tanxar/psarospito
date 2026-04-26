"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  ChevronRight,
  Info,
  Phone,
  X,
} from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  listingTitle: string;
  ownerUserId: string | null;
  hostName: string | null;
  brokerPhone?: string | null;
};

type TimeSlotId = "all" | "9-12" | "12-15" | "15-18";

type DateChoice =
  | { type: "asap" }
  | { type: "day"; date: Date };

const MONTHS_EL = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μαΐ",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
] as const;

const WEEKDAYS_EL = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σαβ"] as const;

const SLOT_LABELS: Record<TimeSlotId, string> = {
  all: "Όλες τις ώρες",
  "9-12": "9:00–12:00",
  "12-15": "12:00–15:00",
  "15-18": "15:00–18:00",
};

const TIME_ORDER: TimeSlotId[] = ["all", "9-12", "12-15", "15-18"];

function nextDaysFromTomorrow(count: number): Date[] {
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}

function nextAvailableMorning(): Date {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(10, 0, 0, 0);
  while (t.getTime() < Date.now() + 30 * 60 * 1000) {
    t.setDate(t.getDate() + 1);
  }
  return t;
}

function buildStartsAt(choice: DateChoice, slot: TimeSlotId): Date {
  if (choice.type === "asap") {
    return nextAvailableMorning();
  }
  const d = new Date(choice.date);
  const hour = slot === "all" ? 10 : slot === "9-12" ? 9 : slot === "12-15" ? 12 : 15;
  d.setHours(hour, 0, 0, 0);
  return d;
}

function formatDayCard(d: Date) {
  const wd = WEEKDAYS_EL[d.getDay()];
  const day = d.getDate();
  const mo = MONTHS_EL[d.getMonth()] ?? "";
  return { wd, day, mo };
}

function VisitRequestModal({
  open,
  onOpenChange,
  listingTitle,
  hostName,
  loading,
  error,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingTitle: string;
  hostName: string | null;
  loading: boolean;
  error: string | null;
  onContinue: (payload: { startsAt: Date; message: string }) => void | Promise<void>;
}) {
  const [dateChoice, setDateChoice] = useState<DateChoice>({ type: "asap" });
  const [timeSlot, setTimeSlot] = useState<TimeSlotId>("all");
  const [note, setNote] = useState("");
  const dateStripRef = useRef<HTMLDivElement>(null);
  const timeStripRef = useRef<HTMLDivElement>(null);
  const dayOptions = useMemo(() => nextDaysFromTomorrow(14), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDateChoice({ type: "asap" });
    setTimeSlot("all");
    setNote("");
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const datePicked =
    dateChoice.type === "asap"
      ? "Όσο πιο σύντομα"
      : `${formatDayCard(dateChoice.date).wd} ${formatDayCard(dateChoice.date).day} ${formatDayCard(dateChoice.date).mo}`;

  function scrollStrip(el: HTMLDivElement | null, dir: 1 | -1) {
    el?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const startsAt = buildStartsAt(dateChoice, timeSlot);
    const hint =
      dateChoice.type === "asap"
        ? `Όσο πιο σύντομα · ${SLOT_LABELS[timeSlot]}`
        : `${datePicked} · ${SLOT_LABELS[timeSlot]}`;
    const parts = [note.trim(), `[Προτίμηση επίσκεψης: ${hint}]`].filter(Boolean);
    void onContinue({ startsAt, message: parts.join("\n\n") });
  }

  const selectedPill =
    "border-primary/45 bg-primary/[0.1] text-foreground ring-1 ring-primary/25 dark:bg-primary/15 dark:ring-primary/35";
  const defaultPill = "border-border/70 bg-card text-foreground hover:border-border/90 hover:bg-muted/40";

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        aria-label="Κλείσιμο"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-modal-title"
        className="relative z-[1] flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-background shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:shadow-xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/50 px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2 id="visit-modal-title" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Ζήτησε επίσκεψη
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              <span className="font-medium text-foreground/80">{listingTitle}</span>
              {hostName ? (
                <>
                  {" "}
                  · <span className="text-foreground/75">{hostName}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Κλείσιμο"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="space-y-6 px-5 py-5 sm:px-6">
            <div>
              <p className="text-sm font-medium text-foreground">Επίλεξε διαθέσιμες ημερομηνίες</p>
              <div className="relative mt-3">
                <div
                  ref={dateStripRef}
                  className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  <button
                    type="button"
                    onClick={() => setDateChoice({ type: "asap" })}
                    className={cn(
                      "flex w-[124px] shrink-0 snap-start flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition-colors",
                      dateChoice.type === "asap" ? selectedPill : defaultPill
                    )}
                  >
                    <CalendarCheck2 className="size-5 shrink-0 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold leading-tight">Όσο πιο σύντομα</span>
                  </button>
                  {dayOptions.map((d) => {
                    const { wd, day, mo } = formatDayCard(d);
                    const picked =
                      dateChoice.type === "day" &&
                      dateChoice.date.toDateString() === d.toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => setDateChoice({ type: "day", date: d })}
                        className={cn(
                          "flex w-[76px] shrink-0 snap-start flex-col items-center rounded-xl border px-2 py-3 text-center transition-colors",
                          picked ? selectedPill : defaultPill
                        )}
                      >
                        <span className="text-[11px] font-medium text-muted-foreground">{wd}</span>
                        <span className="mt-1 text-xl font-semibold tabular-nums leading-none">{day}</span>
                        <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">{mo}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="absolute right-0 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/95 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-muted sm:flex"
                  onClick={() => scrollStrip(dateStripRef.current, 1)}
                  aria-label="Περισσότερες ημερομηνίες"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Επίλεξε διαθέσιμες ώρες</p>
              <div className="relative mt-3">
                <div
                  ref={timeStripRef}
                  className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {TIME_ORDER.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTimeSlot(id)}
                      className={cn(
                        "shrink-0 snap-start rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                        timeSlot === id ? selectedPill : defaultPill
                      )}
                    >
                      {SLOT_LABELS[id]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="absolute right-0 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/95 shadow-sm backdrop-blur-sm transition hover:bg-muted sm:flex"
                  onClick={() => scrollStrip(timeStripRef.current, 1)}
                  aria-label="Περισσότερες ώρες"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-3.5 py-3 text-sm leading-relaxed text-foreground dark:border-primary/25 dark:bg-primary/10">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p>
                Το αίτημά σου δεν είναι επιβεβαιωμένο ακόμα. Ο αγγελιοδότης θα δει τις ημερομηνίες που προτείνεις και θα
                επικοινωνήσει μαζί σου.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="visit-note" className="text-xs font-medium text-muted-foreground">
                Σχόλιο (προαιρετικό)
              </label>
              <textarea
                id="visit-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={1700}
                placeholder="Π.χ. διαθέσιμος απόγευμα τρίτης…"
                className={cn(
                  "w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                )}
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/[0.07] px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-auto flex justify-end border-t border-border/50 bg-muted/10 px-5 py-4 sm:px-6">
            <Button
              type="submit"
              variant="default"
              disabled={loading}
              className="h-11 min-w-[8.5rem] rounded-xl px-6 text-[15px] font-semibold shadow-sm sm:min-w-[9.5rem]"
            >
              {loading ? "Αποστολή…" : "Συνέχεια"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits : "";
}

function BrokerPhoneReveal({
  phone,
  visible,
  onShow,
}: {
  phone: string;
  visible: boolean;
  onShow: () => void;
}) {
  const href = phoneHref(phone);
  if (!visible) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2 rounded-xl border-border/70 bg-muted/20 font-medium text-foreground shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/30 hover:bg-primary/[0.06] hover:shadow-md dark:bg-muted/10"
        onClick={onShow}
      >
        <Phone className="size-4 text-primary" aria-hidden />
        Εμφάνιση τηλεφώνου
      </Button>
    );
  }
  if (href) {
    return (
      <a
        href={`tel:${href}`}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.07] text-sm font-semibold text-primary shadow-sm transition-[border-color,background-color,box-shadow] hover:border-primary/40 hover:bg-primary/[0.11] hover:shadow-md dark:bg-primary/10"
      >
        <Phone className="size-4 shrink-0 opacity-90" aria-hidden />
        {phone}
      </a>
    );
  }
  return (
    <p className="flex min-h-10 items-center justify-center rounded-xl border border-border/60 bg-muted/15 px-3 text-center text-sm font-semibold">
      {phone}
    </p>
  );
}

export function ListingViewingBooking({
  listingId,
  listingTitle,
  ownerUserId,
  hostName,
  brokerPhone,
}: Props) {
  const { user, ready } = useSessionUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneVisible, setPhoneVisible] = useState(false);

  async function submitVisit(payload: { startsAt: Date; message: string }) {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      let message = payload.message.trim();
      if (message.length > 2000) message = message.slice(0, 2000);

      const res = await fetch(`/api/listings/${listingId}/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startsAt: payload.startsAt.toISOString(),
          message: message || undefined,
        }),
      });
      const raw = await res.text();
      let msg = "Αποτυχία αποστολής";
      try {
        const j = JSON.parse(raw) as { error?: unknown };
        if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
      } catch {
        if (raw.trim()) msg = raw.trim();
      }
      if (!res.ok) throw new Error(msg);
      setModalOpen(false);
      setDone("Το αίτημα επίσκεψης στάλθηκε. Θα ενημερωθείς μόλις ο υπεύθυνος το επιβεβαιώσει.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Φόρτωση…</p>;
  }

  if (!ownerUserId) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Για παρουσίαση ακινήτου επικοινώνησε απευθείας — αυτή η αγγελία δεν έχει ακόμα υπεύθυνο για online κρατήσεις.
      </p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        {brokerPhone ? (
          <BrokerPhoneReveal phone={brokerPhone} visible={phoneVisible} onShow={() => setPhoneVisible(true)} />
        ) : null}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Συνδέσου για να ζητήσεις ραντεβού επίσκεψης με τον υπεύθυνο της αγγελίας.
        </p>
        <Link
          href={`/auth/email?next=${encodeURIComponent(`/listing/${listingId}`)}`}
          className={cn(
            buttonVariants({ variant: "default" }),
            "inline-flex h-11 w-full justify-center rounded-xl sm:w-auto"
          )}
        >
          Σύνδεση / Εγγραφή
        </Link>
      </div>
    );
  }

  if (user.id === ownerUserId) {
    const ownerInfoText =
      user.role === "BROKER"
        ? "Διαχειρίσου τα ραντεβού της αγγελίας από το παρακάτω κουμπί."
        : "Οι αιτήσεις ραντεβού για αυτή την αγγελία εμφανίζονται στον λογαριασμό σου.";
    const ownerButtonText = user.role === "BROKER" ? "Διαχείριση ραντεβού" : "Τα ραντεβού μου";
    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {ownerInfoText}
        </p>
        <Link
          href="/account/viewings"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-border/50 bg-background"
          )}
        >
          <CalendarClock className="size-4" aria-hidden />
          {ownerButtonText}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {brokerPhone ? (
        <BrokerPhoneReveal phone={brokerPhone} visible={phoneVisible} onShow={() => setPhoneVisible(true)} />
      ) : null}

      <div className="rounded-xl border border-border/30 bg-background/60 px-3.5 py-3 dark:border-white/[0.06] dark:bg-background/25">
        <p className="text-sm font-semibold tracking-tight text-foreground">Επίσκεψη στο ακίνητο</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Πρότεινε ημέρα και εύρος ώρας — ο υπεύθυνος θα επιβεβαιώσει.
        </p>
      </div>

      {done ? (
        <div
          className="rounded-xl border border-primary/25 bg-primary/[0.07] px-3.5 py-3 text-sm leading-snug text-foreground"
          role="status"
        >
          {done}
        </div>
      ) : null}

      {!done ? (
        <Button
          type="button"
          variant="default"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="h-11 w-full rounded-xl text-[15px] font-semibold shadow-md shadow-primary/20"
        >
          Ζήτησε επίσκεψη
        </Button>
      ) : null}

      <VisitRequestModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setError(null);
        }}
        listingTitle={listingTitle}
        hostName={hostName}
        loading={loading}
        error={error}
        onContinue={submitVisit}
      />

    </div>
  );
}
