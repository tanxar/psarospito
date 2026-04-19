"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties } from "react";
import { Building2, ChevronRight, Heart, LayoutList, LogIn, Plus, User, UserRound } from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { useSavedListings } from "@/components/saved/use-saved";
import { Button, buttonVariants } from "@/components/ui/button";
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

const accountMenuItemClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 text-[13px] outline-none transition-[background,color] duration-150 data-highlighted:bg-primary/[0.09] data-highlighted:text-foreground";

/** Παγκόσμιο sticky header — λογότυπο, αποθηκευμένα, λογαριασμός, καταχώρηση. */
export function SiteHeader() {
  const router = useRouter();
  const { user } = useSessionUser();
  const saved = useSavedListings();
  const savedCount = saved.ids.length;
  const burst = saved.favoriteAddBurst;
  const sparkAngles = [0, 45, 90, 135, 180, 225, 270, 315] as const;
  const sparkRadius = 16;

  return (
    <header className="sticky top-0 z-[120] isolate h-16 shrink-0 border-b bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" aria-label="Αρχική" className="shrink-0">
          <Image
            src="/logo.png"
            alt="Nestio"
            width={148}
            height={30}
            priority
            className="h-6 w-auto opacity-95"
          />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/saved"
            aria-label={`Αποθηκευμένα (${savedCount})`}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-9 gap-1.5 rounded-lg bg-background/80 px-2.5 shadow-none"
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
                        className="animate-saved-spark-fly absolute left-1/2 top-1/2 size-1 rounded-full bg-primary shadow-[0_0_5px_var(--color-primary)] dark:shadow-[0_0_6px_rgba(122,162,255,0.85)]"
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
                    savedCount > 0 ? "fill-primary text-primary" : "text-muted-foreground"
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
                "size-9 rounded-lg bg-background/80 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-primary/30 data-popup-open:bg-muted/60"
              )}
            >
              <User className={cn("size-4", user && "text-primary")} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className={cn(
                "min-w-[min(100vw-1.5rem,16.25rem)] overflow-hidden rounded-2xl border border-border/50 bg-popover/95 p-2",
                "shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_4px_16px_-4px_rgba(0,0,0,0.08)]",
                "ring-1 ring-black/[0.03] backdrop-blur-md dark:bg-popover/98 dark:ring-white/[0.06]"
              )}
            >
              {user ? (
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
                  <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push("/account")}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 font-medium">Λογαριασμός</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                  </DropdownMenuItem>
                  {user.role === "BROKER" ? (
                    <DropdownMenuItem className={accountMenuItemClass} onClick={() => router.push("/listings/mine")}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                        <LayoutList className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 font-medium">Οι αγγελίες μου</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/45" aria-hidden />
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
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
          <Link
            href="/listings/new"
            aria-label="Προσθήκη αγγελίας"
            title="Προσθήκη αγγελίας"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[transform,box-shadow] hover:bg-primary/92 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "sm:hidden"
            )}
          >
            <Plus className="size-[1.15rem]" strokeWidth={2.75} aria-hidden />
          </Link>
          <Link
            href="/listings/new"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-9 rounded-lg px-3",
              "hidden sm:inline-flex"
            )}
          >
            <Plus className="size-4" />
            Καταχώρηση
          </Link>
        </div>
      </div>
    </header>
  );
}
