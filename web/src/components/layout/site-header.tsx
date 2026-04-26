"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { BellDot, Building2, ChevronRight, Heart, LayoutList, LogIn, LogOut, Plus, User, UserRound } from "lucide-react";

import { notifyAuthChanged, useSessionUser } from "@/components/auth/use-session";
import { useSavedListings } from "@/components/saved/use-saved";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ListingsNewEntryLink } from "@/components/layout/listings-new-entry-link";

const accountMenuItemClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-[13px] outline-none transition-[background,color] duration-150 data-highlighted:bg-primary/[0.09] data-highlighted:text-foreground";

/** Παγκόσμιο sticky header — λογότυπο, αποθηκευμένα, λογαριασμός, καταχώρηση. */
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSessionUser();
  const saved = useSavedListings();
  const [loggingOut, setLoggingOut] = useState(false);
  const [hasInboxDot, setHasInboxDot] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const [inboxHref, setInboxHref] = useState("/account");
  const savedCount = saved.ids.length;
  const burst = saved.favoriteAddBurst;
  const sparkAngles = [0, 45, 90, 135, 180, 225, 270, 315] as const;
  const sparkRadius = 16;
  const showCreateListingCta = pathname !== "/listings/new";

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

  useEffect(() => {
    if (!user) {
      setHasInboxDot(false);
      setInboxCount(0);
      setInboxHref("/account");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        let totalPending = 0;
        let pendingHostCount = 0;
        let pendingSeekerCount = 0;
        let incomingPriceCount = 0;
        let incomingAssignmentCount = 0;
        let incomingBrokerOfferCount = 0;

        const apRes = await fetch("/api/appointments", { cache: "no-store" });
        if (apRes.ok) {
          const j = (await apRes.json()) as {
            asSeeker?: Array<{ status?: string }>;
            asHost?: Array<{ status?: string }>;
          };
          pendingHostCount = Array.isArray(j.asHost) ? j.asHost.filter((a) => a?.status === "PENDING").length : 0;
          pendingSeekerCount = Array.isArray(j.asSeeker) ? j.asSeeker.filter((a) => a?.status === "PENDING").length : 0;
          totalPending += pendingHostCount + pendingSeekerCount;
        }

        const priceRes = await fetch("/api/listings/incoming-price-offers", { cache: "no-store" });
        if (priceRes.ok) {
          const arr = (await priceRes.json()) as unknown;
          incomingPriceCount = Array.isArray(arr) ? arr.length : 0;
          totalPending += incomingPriceCount;
        }

        if (user.role === "BROKER") {
          const incomingReqRes = await fetch("/api/brokers/incoming-assignment-requests", { cache: "no-store" });
          if (incomingReqRes.ok) {
            const arr = (await incomingReqRes.json()) as unknown;
            incomingAssignmentCount = Array.isArray(arr) ? arr.length : 0;
            totalPending += incomingAssignmentCount;
          }
        }

        if (user.role === "SEEKER") {
          const incomingBrokerRes = await fetch("/api/listings/incoming-broker-offers", { cache: "no-store" });
          if (incomingBrokerRes.ok) {
            const arr = (await incomingBrokerRes.json()) as unknown;
            incomingBrokerOfferCount = Array.isArray(arr) ? arr.length : 0;
            totalPending += incomingBrokerOfferCount;
          }
        }

        if (!cancelled) {
          const nextInboxHref =
            user.role === "BROKER"
              ? incomingAssignmentCount > 0
                ? "/account/assignment-requests"
                : incomingPriceCount > 0
                  ? "/account/incoming-price-offers"
                  : pendingHostCount + pendingSeekerCount > 0
                    ? "/account/viewings"
                    : "/account"
              : incomingBrokerOfferCount > 0
                ? "/account/incoming-broker-offers"
                : incomingPriceCount > 0
                  ? "/account/incoming-price-offers"
                  : pendingHostCount + pendingSeekerCount > 0
                    ? "/account/viewings"
                    : "/account";
          setInboxCount(totalPending);
          setHasInboxDot(totalPending > 0);
          setInboxHref(nextInboxHref);
        }
      } catch {
        if (!cancelled) {
          setInboxCount(0);
          setHasInboxDot(false);
          setInboxHref("/account");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  return (
    <header className="sticky top-0 z-[120] isolate h-16 shrink-0 border-b border-border/70 bg-white">
      <div className="mx-auto flex h-full w-full max-w-[84rem] items-center justify-between gap-3 px-2 sm:px-4">
        <Link href="/" aria-label="Αρχική" className="shrink-0 transition-opacity hover:opacity-95">
          <Image
            src="/logo.png"
            alt="Nestio"
            width={148}
            height={30}
            priority
            className="h-6 w-auto opacity-95"
          />
        </Link>

        <div id="header-search-slot" className="hidden min-w-0 flex-1 px-3 xl:block" />

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/saved"
            aria-label={`Αποθηκευμένα (${savedCount})`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-9 gap-1.5 rounded-lg border border-border/55 bg-background/75 px-2.5 shadow-none ring-1 ring-transparent transition-colors hover:bg-muted/55 hover:ring-border/40"
            )}
          >
            <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
              {burst > 0 && (
                <span
                  key={burst}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  {sparkAngles.map((deg, i) => {
                    const rad = (deg * Math.PI) / 180;
                    const x = Math.round(Math.cos(rad) * sparkRadius);
                    const y = Math.round(Math.sin(rad) * sparkRadius);
                    return (
                      <span
                        key={i}
                        className="animate-saved-spark-fly absolute left-1/2 top-1/2 size-1 rounded-full bg-red-500 shadow-[0_0_5px_rgb(239_68_68)] dark:shadow-[0_0_6px_rgba(248_113_113_/_0.9)]"
                        style={
                          {
                            "--spark-x": `${x}px`,
                            "--spark-y": `${y}px`,
                          } as CSSProperties
                        }
                      />
                    );
                  })}
                </span>
              )}
              <span
                key={`heart-${burst}`}
                className={cn("inline-flex origin-center", burst > 0 && "animate-saved-heart-pop")}
              >
                <Heart
                  className={cn(
                    "size-4 shrink-0",
                    savedCount > 0 ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )}
                  aria-hidden
                />
              </span>
            </span>
            <span className="min-w-[1ch] tabular-nums text-sm font-semibold">{savedCount}</span>
          </Link>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              type="button"
              openOnHover
              delay={0}
              closeDelay={250}
              aria-label={user ? `Λογαριασμός: ${user.name}` : "Μενού λογαριασμού"}
              className={cn(
                buttonVariants({ variant: "secondary", size: "icon" }),
                "relative size-9 rounded-lg border border-border/55 bg-background/75 shadow-none outline-none ring-1 ring-transparent transition-colors hover:bg-muted/55 hover:ring-border/40 focus-visible:ring-2 focus-visible:ring-primary/30 data-popup-open:bg-muted/60 data-popup-open:ring-border/50"
              )}
            >
              <User className={cn("size-4", user && "text-primary")} />
              {hasInboxDot ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-background" aria-hidden />
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className={cn(
                "min-w-[min(100vw-1.5rem,16.25rem)] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 p-2",
                "shadow-[0_14px_36px_-10px_rgba(0,0,0,0.22),0_6px_18px_-8px_rgba(0,0,0,0.12)]",
                "ring-1 ring-black/[0.04] backdrop-blur-md dark:bg-popover/98 dark:ring-white/[0.06]"
              )}
            >
              {user ? (
                <>
                  <DropdownMenuGroup>
                  <DropdownMenuLabel className="mb-1 flex items-center gap-3 px-2 py-2">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-gradient-to-br from-primary/12 to-primary/[0.04] text-sm font-semibold text-primary"
                      aria-hidden
                    >
                      {user.name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold tracking-tight text-foreground">{user.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push(inboxHref)}>
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                      <BellDot className="size-4" aria-hidden />
                      {inboxCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
                          {inboxCount > 99 ? "99+" : inboxCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 font-medium">Εισερχόμενα</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                  </DropdownMenuItem>
                  <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push("/account")}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">Λογαριασμός</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                  </DropdownMenuItem>
                  {user.role === "BROKER" || user.role === "SEEKER" ? (
                    <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push("/listings/mine")}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                        <LayoutList className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 font-medium">Οι αγγελίες μου</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                    </DropdownMenuItem>
                  ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-border/80 to-transparent" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className={accountMenuItemClass}
                      variant="destructive"
                      disabled={loggingOut}
                      onClick={() => void onLogout()}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <LogOut className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 font-medium">
                        {loggingOut ? "Αποσύνδεση…" : "Αποσύνδεση"}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              ) : (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push("/auth/email")}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                        <LogIn className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 font-medium">Σύνδεση / Εγγραφή</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-border/80 to-transparent" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className={cn(accountMenuItemClass, "data-highlighted:bg-primary/[0.12]")}
                      onClick={() => router.push("/register/broker")}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <Building2 className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">Κάνε εγγραφή ως επαγγελματίας</span>
                        <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">
                          Γραφείο · δημοσίευση αγγελιών
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-primary/40" aria-hidden />
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {showCreateListingCta ? (
            <>
              <ListingsNewEntryLink
                aria-label="Προσθήκη αγγελίας"
                title="Προσθήκη αγγελίας"
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[transform,box-shadow,background-color] hover:bg-primary/92 hover:shadow-md active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "sm:hidden"
                )}
              >
                <Plus className="size-[1.15rem]" strokeWidth={2.75} aria-hidden />
              </ListingsNewEntryLink>
              <ListingsNewEntryLink
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "h-9 rounded-lg px-3 shadow-sm transition-[transform,box-shadow] hover:shadow-md active:scale-[0.98]",
                  "hidden sm:inline-flex"
                )}
              >
                <Plus className="size-4" />
                Καταχώρηση
              </ListingsNewEntryLink>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
