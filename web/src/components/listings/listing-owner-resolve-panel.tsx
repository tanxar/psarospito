"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Home, KeyRound } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Outcome = "RENTED" | "SOLD" | null;

export function ListingOwnerResolvePanel({
  listingId,
  dealType,
  isActive,
  resolvedOutcome,
}: {
  listingId: string;
  dealType: "rent" | "sale";
  isActive: boolean;
  resolvedOutcome: Outcome;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (resolvedOutcome) {
    const isRented = resolvedOutcome === "RENTED";
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4 sm:p-5",
          isRented
            ? "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-900 dark:text-emerald-100"
            : "border-violet-500/30 bg-violet-500/[0.08] text-violet-900 dark:text-violet-100"
        )}
      >
        <CheckCircle2
          className={cn("mt-0.5 size-5 shrink-0", isRented ? "text-emerald-600 dark:text-emerald-400" : "text-violet-600 dark:text-violet-400")}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-semibold leading-snug">
            {isRented ? "Επισημάνθηκε ως ενοικιασμένο" : "Επισημάνθηκε ως πωλημένο"}
          </p>
          <p className="mt-1 text-sm opacity-90">
            Η αγγελία δεν εμφανίζεται πλέον στην αναζήτηση· τη βλέπεις στις «Οι αγγελίες μου» στην αντίστοιχη ενότητα.
          </p>
        </div>
      </div>
    );
  }

  if (!isActive) {
    return null;
  }

  async function submit(outcome: "rented" | "sold") {
    const label = outcome === "rented" ? "Η αγγελία θα επισημανθεί ως ενοικιασμένη και θα αποκρυφτεί από τα δημόσια αποτελέσματα." : "Η αγγελία θα επισημανθεί ως πωλημένη και θα αποκρυφτεί από τα δημόσια αποτελέσματα.";
    if (typeof window !== "undefined" && !window.confirm(`${label}\n\nΣυνέχεια;`)) return;

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία ενημέρωσης";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/25 p-4 ring-1 ring-border/30 sm:p-5 dark:bg-muted/15">
      <p className="text-sm font-semibold text-foreground">Ολοκλήρωση συναλλαγής</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Όταν κλείσει η συναλλαγή, επίλεξε παρακάτω ώστε η αγγελία να φύγει από τα αποτελέσματα αλλά να παραμείνει στο προφίλ σου.
      </p>
      {err ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {dealType === "rent" ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit("rented")}
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-11 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-600/90 dark:bg-emerald-600 dark:hover:bg-emerald-600/90"
            )}
          >
            <KeyRound className="size-4" aria-hidden />
            {busy ? "Αποθήκευση…" : "Ενοικιάστηκε"}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() => void submit("sold")}
            className={cn(
              buttonVariants({ variant: "default" }),
              "h-11 gap-2 rounded-xl bg-violet-600 hover:bg-violet-600/90 dark:bg-violet-600 dark:hover:bg-violet-600/90"
            )}
          >
            <Home className="size-4" aria-hidden />
            {busy ? "Αποθήκευση…" : "Πουλήθηκε"}
          </Button>
        )}
      </div>
    </div>
  );
}
