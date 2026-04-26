"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/user-session-types";

type OwnerPendingOffer = {
  id: string;
  createdAtIso: string;
  message: string | null;
  direction: "BROKER_TO_OWNER" | "OWNER_TO_BROKER";
  status: "PENDING" | "BROKER_ACCEPTED" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  broker: {
    id: string;
    name: string;
    brokerCompanyName: string | null;
    brokerPhone: string | null;
  };
};

type BrokerOfferSummary = {
  id: string;
  direction: "BROKER_TO_OWNER" | "OWNER_TO_BROKER";
  status: "PENDING" | "BROKER_ACCEPTED" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  message?: string | null;
  createdAtIso?: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ListingBrokerOfferPanel({
  listingId,
  ownerRole,
  isOwner,
  userRole,
  userBrokerOnboardingCompleted,
  ownerPendingOffers,
  brokerOffer,
}: {
  listingId: string;
  ownerRole: UserRole | null;
  isOwner: boolean;
  userRole: UserRole | null;
  userBrokerOnboardingCompleted: boolean;
  ownerPendingOffers: OwnerPendingOffer[];
  brokerOffer: BrokerOfferSummary | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [confirmOfferId, setConfirmOfferId] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordErr, setConfirmPasswordErr] = useState<string | null>(null);
  const [confirmPasswordBusy, setConfirmPasswordBusy] = useState(false);

  const ownerCanManage = isOwner && ownerRole === "SEEKER";
  const brokerCanSubmit = !isOwner && userRole === "BROKER" && ownerRole === "SEEKER";
  const ownerIncomingBrokerOffers = ownerPendingOffers.filter(
    (o) => o.direction === "BROKER_TO_OWNER" && o.status === "PENDING"
  );
  const pendingCount = ownerIncomingBrokerOffers.length;
  const ownerOutgoingBrokerAccepted = ownerPendingOffers.filter(
    (o) => o.direction === "OWNER_TO_BROKER" && o.status === "BROKER_ACCEPTED"
  );
  const hasOwnerPanelContent = ownerIncomingBrokerOffers.length > 0 || ownerOutgoingBrokerAccepted.length > 0;

  const brokerStatusText = useMemo(() => {
    if (!brokerOffer) return null;
    if (brokerOffer.direction === "BROKER_TO_OWNER" && brokerOffer.status === "PENDING") {
      return "Έχεις ήδη στείλει προσφορά για ανάληψη αυτής της αγγελίας.";
    }
    if (brokerOffer.direction === "OWNER_TO_BROKER" && brokerOffer.status === "PENDING") {
      return "Ο ιδιοκτήτης σου έστειλε αίτημα συνεργασίας. Μπορείς να το αποδεχτείς ή να το απορρίψεις.";
    }
    if (brokerOffer.direction === "OWNER_TO_BROKER" && brokerOffer.status === "BROKER_ACCEPTED") {
      return "Αποδέχτηκες το αίτημα. Περιμένεις τελική επιβεβαίωση από τον ιδιοκτήτη.";
    }
    if (brokerOffer.status === "REJECTED") return "Η προηγούμενη προσφορά σου απορρίφθηκε. Μπορείς να στείλεις νέα.";
    if (brokerOffer.status === "CANCELLED") return "Η προηγούμενη προσφορά ακυρώθηκε.";
    return "Η προσφορά σου έγινε αποδεκτή.";
  }, [brokerOffer]);
  const isOwnerRequestFlow =
    brokerOffer?.direction === "OWNER_TO_BROKER" &&
    (brokerOffer.status === "PENDING" || brokerOffer.status === "BROKER_ACCEPTED");
  const isBrokerOutgoingPending = brokerOffer?.direction === "BROKER_TO_OWNER" && brokerOffer.status === "PENDING";

  async function submitOffer() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/broker-offers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία αποστολής";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setDone(null);
      setMessage("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  async function handleOwnerAction(offerId: string, action: "accept" | "reject" | "confirm") {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/broker-offers/${offerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία ενημέρωσης";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setDone(
        action === "reject"
          ? "Η προσφορά/αίτημα απορρίφθηκε."
          : action === "confirm"
            ? "Η αγγελία μεταφέρθηκε στον μεσίτη."
            : "Η αγγελία μεταφέρθηκε στον μεσίτη."
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  function openConfirmPasswordModal(offerId: string) {
    setConfirmOfferId(offerId);
    setConfirmPassword("");
    setConfirmPasswordErr(null);
    setConfirmPasswordOpen(true);
  }

  async function verifyPasswordAndConfirmAssignment() {
    if (!confirmOfferId || confirmPasswordBusy || busy) return;
    setConfirmPasswordBusy(true);
    setConfirmPasswordErr(null);
    try {
      const verifyRes = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: confirmPassword }),
      });
      if (!verifyRes.ok) {
        let msg = "Αποτυχία επιβεβαίωσης";
        try {
          const j = (await verifyRes.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      setConfirmPasswordOpen(false);
      await handleOwnerAction(confirmOfferId, "confirm");
    } catch (e) {
      setConfirmPasswordErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setConfirmPasswordBusy(false);
    }
  }

  async function handleBrokerIncomingOwnerRequest(action: "accept" | "reject") {
    if (!brokerOffer) return;
    if (brokerOffer.direction !== "OWNER_TO_BROKER" || brokerOffer.status !== "PENDING") return;
    if (busy) return;
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/broker-offers/${brokerOffer.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία ενημέρωσης";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setDone(action === "accept" ? "Το αίτημα ενημερώθηκε επιτυχώς." : "Απέρριψες το αίτημα.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  if ((!ownerCanManage && !brokerCanSubmit) || (ownerCanManage && !hasOwnerPanelContent && !brokerCanSubmit)) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/25 p-4 ring-1 ring-border/30 sm:p-5 dark:bg-muted/15">
      {ownerCanManage ? (
        <div>
          {ownerIncomingBrokerOffers.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-foreground">Προσφορές ανάληψης από μεσίτες</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {pendingCount === 1 ? "Έχεις 1 νέα προσφορά." : `Έχεις ${pendingCount} νέες προσφορές.`}
              </p>
            </>
          ) : null}
          {ownerIncomingBrokerOffers.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {ownerIncomingBrokerOffers.map((offer) => (
                <li key={offer.id} className="rounded-xl border border-border/55 bg-background/75 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{offer.broker.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(offer.createdAtIso)}</p>
                  </div>
                  {offer.broker.brokerCompanyName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{offer.broker.brokerCompanyName}</p>
                  ) : null}
                  {offer.message ? (
                    <p className="mt-2 rounded-lg border border-border/45 bg-muted/35 px-2.5 py-2 text-sm leading-relaxed text-foreground/90">
                      {offer.message}
                    </p>
                  ) : null}
                  {offer.broker.brokerPhone ? (
                    <p className="mt-2 text-xs text-muted-foreground">Τηλέφωνο: {offer.broker.brokerPhone}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleOwnerAction(offer.id, "accept")}
                      className="h-9 gap-1.5 rounded-lg bg-emerald-600 px-3.5 hover:bg-emerald-600/90"
                    >
                      <CheckCircle2 className="size-4" aria-hidden />
                      Αποδοχή
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void handleOwnerAction(offer.id, "reject")}
                      className="h-9 gap-1.5 rounded-lg px-3.5"
                    >
                      <XCircle className="size-4" aria-hidden />
                      Απόρριψη
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {ownerOutgoingBrokerAccepted.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {ownerOutgoingBrokerAccepted.map((offer) => (
                <li key={offer.id} className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.06] p-3.5">
                  <p className="font-medium text-foreground">{offer.broker.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ο μεσίτης αποδέχτηκε το αίτημά σου. Κάνε τελική επιβεβαίωση για μεταφορά αγγελίας.
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={() => openConfirmPasswordModal(offer.id)}
                      className="h-9 gap-1.5 rounded-lg bg-emerald-600 px-3.5 hover:bg-emerald-600/90"
                    >
                      <CheckCircle2 className="size-4" aria-hidden />
                      Επιβεβαίωση ανάθεσης
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {brokerCanSubmit ? (
        <div className={cn(ownerCanManage ? "mt-5 border-t border-border/45 pt-5" : "")}>
          <p className="text-sm font-semibold text-foreground">
            {isOwnerRequestFlow
              ? "Αίτημα ανάθεσης αγγελίας"
              : isBrokerOutgoingPending
                ? "Προσφορά ανάληψης αγγελίας"
                : "Ανάλαβε αυτή την αγγελία"}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {isOwnerRequestFlow
              ? "Ο ιδιοκτήτης σου έχει ήδη στείλει αίτημα για αυτή την αγγελία."
              : isBrokerOutgoingPending
                ? "Η προσφορά σου έχει σταλεί και αναμένεται απάντηση από τον ιδιοκτήτη."
              : "Στείλε προσφορά στον ιδιώτη για να αναλάβεις τη διαχείριση της αγγελίας."}
          </p>
          {!userBrokerOnboardingCompleted ? (
            <p className="mt-3 text-sm text-destructive">Ολοκλήρωσε πρώτα το προφίλ μεσίτη από το account σου.</p>
          ) : null}
          {brokerStatusText && !isBrokerOutgoingPending ? (
            <p className="mt-3 text-sm text-muted-foreground">{brokerStatusText}</p>
          ) : null}
          {brokerOffer?.direction === "OWNER_TO_BROKER" && brokerOffer.status === "PENDING" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleBrokerIncomingOwnerRequest("accept")}
                className="h-9 gap-1.5 rounded-lg bg-emerald-600 px-3.5 hover:bg-emerald-600/90"
              >
                <CheckCircle2 className="size-4" aria-hidden />
                Αποδοχή αιτήματος
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void handleBrokerIncomingOwnerRequest("reject")}
                className="h-9 gap-1.5 rounded-lg px-3.5"
              >
                <XCircle className="size-4" aria-hidden />
                Απόρριψη
              </Button>
            </div>
          ) : null}
          {(!brokerOffer ||
            (brokerOffer.direction === "BROKER_TO_OWNER" && brokerOffer.status !== "PENDING") ||
            (brokerOffer.direction === "OWNER_TO_BROKER" &&
              (brokerOffer.status === "REJECTED" || brokerOffer.status === "CANCELLED"))) ? (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Π.χ. Αναλαμβάνω φωτογράφιση, ραντεβού και επικοινωνία με ενδιαφερόμενους."
                className={cn(
                  "mt-3 w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                )}
              />
              <div className="mt-3">
                <Button
                  type="button"
                  disabled={busy || !userBrokerOnboardingCompleted}
                  onClick={() => void submitOffer()}
                  className="h-10 gap-2 rounded-xl px-4"
                >
                  <Send className="size-4" aria-hidden />
                  {busy ? "Αποστολή…" : "Αποστολή προσφοράς"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {err ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      {done ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {done}
        </p>
      ) : null}

      {confirmPasswordOpen ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-5">
            <p className="text-base font-semibold text-foreground">Επιβεβαίωση ανάθεσης</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Για λόγους ασφάλειας, συμπλήρωσε τον κωδικό πρόσβασής σου για να ολοκληρωθεί η μεταφορά της αγγελίας.
            </p>

            <div className="mt-4">
              <label htmlFor="confirm-assignment-password" className="mb-1 block text-sm font-medium text-foreground">
                Κωδικός πρόσβασης
              </label>
              <input
                id="confirm-assignment-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoFocus
                className={cn(
                  "h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                )}
              />
            </div>

            {confirmPasswordErr ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {confirmPasswordErr}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={confirmPasswordBusy || busy}
                onClick={() => {
                  setConfirmPasswordOpen(false);
                  setConfirmPassword("");
                  setConfirmPasswordErr(null);
                  setConfirmOfferId(null);
                }}
                className="h-9 rounded-lg px-3.5"
              >
                Ακύρωση
              </Button>
              <Button
                type="button"
                disabled={confirmPasswordBusy || busy || !confirmPassword}
                onClick={() => void verifyPasswordAndConfirmAssignment()}
                className="h-9 rounded-lg bg-emerald-600 px-3.5 hover:bg-emerald-600/90"
              >
                {confirmPasswordBusy ? "Έλεγχος…" : "Συνέχεια"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
