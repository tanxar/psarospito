"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BadgePercent, Euro, X } from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  listingPriceEur: number;
  ownerUserId: string | null;
};

const MAX_DISCOUNT_RATIO = 0.17;

function formatEur(v: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function minAllowedOffer(basePriceEur: number): number {
  return Math.ceil(basePriceEur * (1 - MAX_DISCOUNT_RATIO));
}

export function ListingPriceOffer({ listingId, listingPriceEur, ownerUserId }: Props) {
  const { user, ready } = useSessionUser();
  const [open, setOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const isOwner = !!user && !!ownerUserId && user.id === ownerUserId;
  const minOffer = useMemo(() => minAllowedOffer(listingPriceEur), [listingPriceEur]);
  const parsedAmount = Number(amountInput.replace(/\s/g, "").replace(",", "."));
  const hasAmount = amountInput.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const amountRounded = hasAmount ? Math.round(parsedAmount) : null;
  const tooLow = amountRounded != null && amountRounded < minOffer;

  if (!ready) return null;
  if (!user || isOwner || !ownerUserId) return null;

  async function submitOffer() {
    if (busy || amountRounded == null) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/price-offers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountEur: amountRounded }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία αποστολής προσφοράς";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setDone("Η προσφορά στάλθηκε επιτυχώς.");
      setOpen(false);
      setAmountInput("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">Κάνε οικονομική προσφορά</p>
                  <p className="mt-1 text-sm text-muted-foreground">Αρχική τιμή: {formatEur(listingPriceEur)}</p>
                </div>
                <button
                  type="button"
                  aria-label="Κλείσιμο"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <div className="mt-4">
                <label htmlFor="listing-offer-amount" className="mb-1 block text-sm font-medium text-foreground">
                  Ποσό προσφοράς
                </label>
                <div className="relative">
                  <Euro className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    id="listing-offer-amount"
                    type="number"
                    min={minOffer}
                    step={100}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder={String(minOffer)}
                    className={cn(
                      "h-10 w-full rounded-xl border border-border/60 bg-background pl-9 pr-3 text-sm outline-none",
                      "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Ελάχιστη επιτρεπτή προσφορά: {formatEur(minOffer)} (έως 17% κάτω).</p>
                {tooLow ? (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    Η προσφορά είναι χαμηλότερη από το επιτρεπτό όριο (17% κάτω από την αρχική τιμή).
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" className="h-9 rounded-lg px-3.5" disabled={busy} onClick={() => setOpen(false)}>
                  Ακύρωση
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-lg px-3.5"
                  disabled={busy || amountRounded == null || tooLow}
                  onClick={() => void submitOffer()}
                >
                  {busy ? "Αποστολή…" : "Αποστολή προσφοράς"}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="mt-3 space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setOpen(true);
          setErr(null);
          setDone(null);
        }}
        className="h-10 w-full gap-2 rounded-xl border-border/70 bg-muted/20 font-medium text-foreground shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/30 hover:bg-primary/[0.06] hover:shadow-md dark:bg-muted/10"
      >
        <BadgePercent className="size-4 text-primary" aria-hidden />
        Κάνε οικονομική προσφορά
      </Button>

      {done ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {done} Ο ιδιοκτήτης θα τη δει στον λογαριασμό του.
        </p>
      ) : null}
      {err ? (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}

      {modal}
    </div>
  );
}
