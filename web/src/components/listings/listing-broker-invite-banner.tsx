"use client";

import { Dialog } from "@base-ui/react/dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, Phone, Users, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BrokerRow = {
  id: string;
  name: string;
  brokerCompanyName: string | null;
  brokerPhone: string | null;
  completedDeals: number;
  promoted: boolean;
};

type DirectoryResponse = {
  listingRegionLabel: string;
  brokers: BrokerRow[];
};

function completedDealsLabel(n: number): string {
  if (n === 1) return "1 ολοκληρωμένη αγγελία";
  return `${n} ολοκληρωμένες αγγελίες`;
}

type BannerProps = {
  listingId: string;
};

/** Πρόταση μετά τη δημοσίευση από ιδιώτη — δυνατότητα συνεργασίας με μεσιτικό γραφείο. */
export function ListingBrokerInviteBanner({ listingId }: BannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [closed, setClosed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [brokerLoadError, setBrokerLoadError] = useState<string | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [requestBusyBrokerId, setRequestBusyBrokerId] = useState<string | null>(null);
  const [requestErr, setRequestErr] = useState<string | null>(null);
  const [requestDone, setRequestDone] = useState<string | null>(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    setClosed(true);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("brokerInvite");
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  async function openBrokerPicker() {
    setPickerOpen(true);
    setBrokerLoadError(null);
    setLoadingBrokers(true);
    try {
      const res = await fetch(`/api/brokers/directory?listingId=${encodeURIComponent(listingId)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        let msg = "Αποτυχία φόρτωσης λίστας";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as DirectoryResponse | { error?: string };
      if (data && typeof data === "object" && "brokers" in data && Array.isArray(data.brokers)) {
        setAreaLabel(typeof data.listingRegionLabel === "string" ? data.listingRegionLabel : null);
        setBrokers(data.brokers);
      } else {
        setAreaLabel(null);
        setBrokers([]);
      }
    } catch (e) {
      setBrokerLoadError(e instanceof Error ? e.message : "Σφάλμα δικτύου");
      setBrokers([]);
    } finally {
      setLoadingBrokers(false);
    }
  }

  async function requestBrokerCollaboration(brokerUserId: string) {
    if (requestBusyBrokerId) return;
    setRequestErr(null);
    setRequestDone(null);
    setRequestBusyBrokerId(brokerUserId);
    try {
      const res = await fetch(`/api/listings/${listingId}/broker-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brokerUserId }),
      });
      if (!res.ok) {
        let msg = "Αποτυχία αποστολής αιτήματος";
        try {
          const j = (await res.json()) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setRequestDone("Το αίτημα στάλθηκε. Περιμένεις απάντηση από τον μεσίτη.");
      setSelectedBrokerId(brokerUserId);
      router.refresh();
    } catch (e) {
      setRequestErr(e instanceof Error ? e.message : "Σφάλμα");
    } finally {
      setRequestBusyBrokerId(null);
    }
  }

  if (closed) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.09] via-card to-violet-500/[0.06] p-[1px] shadow-[0_12px_36px_-16px_rgba(0,48,135,0.25)] ring-1 ring-primary/15 dark:from-primary/[0.12] dark:to-violet-950/40">
        <div className="rounded-[calc(1rem-1px)] bg-card/90 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
          <div className="flex gap-3 sm:gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/14 text-primary ring-1 ring-primary/20">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug tracking-tight text-foreground">Επαγγελματική προώθηση</p>
                <button
                  type="button"
                  onClick={() => dismiss()}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Κλείσιμο"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
                Ένα μεσιτικό γραφείο μπορεί να αναλάβει την προβολή και τα ραντεβού για την αγγελία σου — με έκθεση σε περισσότερους ενδιαφερόμενους και υποστήριξη στη διαδικασία.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-10 gap-2 rounded-xl px-4"
                  onClick={() => void openBrokerPicker()}
                >
                  <Users className="size-4 shrink-0" aria-hidden />
                  Βρες μεσίτη
                </Button>
                <button
                  type="button"
                  onClick={() => dismiss()}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 rounded-xl text-muted-foreground hover:text-foreground"
                  )}
                >
                  Όχι τώρα
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog.Root open={pickerOpen} onOpenChange={(open: boolean) => setPickerOpen(open)}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className={cn(
              "fixed inset-0 z-[220]",
              "bg-black/45 dark:bg-black/60",
              "backdrop-blur-[2px] supports-[backdrop-filter]:backdrop-blur-sm",
              "transition-[opacity] duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            )}
          />
          <Dialog.Popup
            className={cn(
              // Κέντρο οθόνης — όχι «ψηλά» σε μικρά κινητά
              "fixed left-1/2 top-1/2 z-[230] flex min-h-0 -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden p-0",
              // Πλάτος: στενά περιθώρια σε κινητό, μέχρι ~672px σε desktop
              "w-[min(calc(100vw-1.25rem),42rem)] sm:w-[min(calc(100vw-2rem),42rem)]",
              // Ύψος: dvh για κινητό chrome· ανώτατο 52rem — η λίστα κάνει scroll μέσα
              "max-h-[min(calc(100dvh-1.25rem),52rem)]",
              "rounded-xl border border-border/50 bg-popover/98 text-popover-foreground sm:rounded-2xl",
              "shadow-[0_28px_100px_-24px_rgba(0,0,0,.5),0_18px_40px_-32px_rgba(0,48,135,.2)]",
              "ring-1 ring-black/[0.06] outline-none dark:bg-card/95 dark:ring-white/[0.1]",
              "transition-[opacity,transform] duration-200 ease-out",
              "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0"
            )}
          >
            <Dialog.Close
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <X className="size-5" aria-hidden />
              <span className="sr-only">Κλείσιμο</span>
            </Dialog.Close>

            <div className="shrink-0 space-y-2 border-b border-border/40 bg-gradient-to-b from-muted/[0.35] to-transparent px-4 pb-4 pt-5 text-left dark:from-muted/20 max-[380px]:space-y-1.5 sm:px-6 sm:pb-5 sm:pt-6 md:px-7 md:pb-6 md:pt-7">
              <Dialog.Title className="pr-11 text-base font-semibold tracking-tight text-foreground sm:pr-12 sm:text-lg md:text-xl">
                Μεσίτες με επαγγελματικό προφίλ
              </Dialog.Title>
            <Dialog.Description className="text-[13px] leading-relaxed text-muted-foreground max-[380px]:text-[12px] sm:text-sm">
              {areaLabel ? (
                <>
                  <span className="font-medium text-foreground/90">Περιοχή αγγελίας: {areaLabel}.</span>{" "}
                </>
              ) : null}
              Μεσίτες που δηλώνουν κάλυψη σε αυτή την περιοχή.
            </Dialog.Description>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-4 md:px-7">
            {loadingBrokers ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
                <p className="text-sm">Φόρτωση προφίλ…</p>
              </div>
            ) : brokerLoadError ? (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
                {brokerLoadError}
              </div>
            ) : brokers.length === 0 ? (
              <div className="rounded-2xl border border-border/50 bg-muted/25 px-4 py-10 text-center text-sm text-muted-foreground">
                {areaLabel
                  ? `Δεν βρέθηκαν μεσίτες με κάλυψη στην περιοχή «${areaLabel}». Δοκίμασε αργότερα ή επικοινώνησε τηλεφωνικά με γραφείο εκτός πλατφόρμας.`
                  : "Δεν υπάρχουν διαθέσιμα επαληθευμένα προφίλ μεσιτών για αυτή την αγγελία."}
              </div>
            ) : (
              <ul className="flex list-none flex-col gap-3">
                {brokers.map((b, index) => {
                  const initial = b.name.trim().charAt(0).toUpperCase() || "?";
                  return (
                    <li key={b.id}>
                      <Card className="overflow-hidden border-border/45 bg-card/95 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
                        <CardContent className="flex gap-4 p-4 sm:p-5">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-base font-semibold text-primary ring-1 ring-primary/18 sm:size-12 sm:text-lg">
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold tracking-tight text-foreground">{b.name}</span>
                              <span className="rounded-full bg-primary/[0.09] px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary ring-1 ring-primary/18">
                                #{index + 1}
                              </span>
                              {b.promoted ? (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300">
                                  Προώθηση
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[13px] text-muted-foreground">{completedDealsLabel(b.completedDeals)}</p>
                            {b.brokerCompanyName ? (
                              <p className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
                                <Building2 className="mt-0.5 size-3.5 shrink-0 text-primary/55" aria-hidden />
                                <span>{b.brokerCompanyName}</span>
                              </p>
                            ) : null}
                            {b.brokerPhone ? (
                              <a
                                href={`tel:${b.brokerPhone.replace(/\s/g, "")}`}
                                className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                <Phone className="size-3.5 shrink-0" aria-hidden />
                                {b.brokerPhone}
                              </a>
                            ) : (
                              <p className="text-xs text-muted-foreground">Δεν έχει δηλωθεί τηλέφωνο στο προφίλ.</p>
                            )}
                            <div className="pt-1">
                              <Button
                                type="button"
                                size="sm"
                                disabled={requestBusyBrokerId != null || (selectedBrokerId != null && selectedBrokerId !== b.id)}
                                onClick={() => void requestBrokerCollaboration(b.id)}
                                className="h-9 rounded-lg px-3.5"
                              >
                                {requestBusyBrokerId === b.id
                                  ? "Αποστολή…"
                                  : selectedBrokerId === b.id
                                    ? "Επιλέχθηκε"
                                    : "Επιλογή μεσίτη"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
            {requestErr ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {requestErr}
              </p>
            ) : null}
            {requestDone ? (
              <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {requestDone}
              </p>
            ) : null}
          </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
