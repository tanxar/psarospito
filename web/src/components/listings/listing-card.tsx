"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "@/components/media/image-carousel";
import type { Listing } from "./types";

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ListingCard({
  listing,
  saved,
  onToggleSaved,
  onHoverChange,
  selected,
  compact = false,
}: {
  listing: Listing;
  saved: boolean;
  onToggleSaved: (id: string) => void;
  onHoverChange?: (id: string | null) => void;
  selected?: boolean;
  /** Πιο χαμηλή κάρτα — για πλέγμα / γρήγορη σάρωση (π.χ. αποθηκευμένα) */
  compact?: boolean;
}) {
  const images = (listing.images?.length ? listing.images : [listing.imageSrc]).filter(Boolean);
  const router = useRouter();
  const href = `/listing/${listing.id}`;

  const descPreview = listing.description?.trim();

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Open listing: ${listing.title}`}
      onMouseEnter={() => onHoverChange?.(listing.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={cn(
        "group relative block cursor-pointer gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card py-0 shadow-sm ring-1 ring-black/[0.02] transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "hover:border-primary/20 hover:shadow-md dark:border-white/[0.08] dark:ring-white/[0.04] dark:hover:border-primary/25",
        selected && "border-primary/45 shadow-md ring-2 ring-primary/15",
        compact && "rounded-xl"
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest("[data-carousel-control],button,a")) return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target.closest("[data-carousel-control],button,a")) return;
        e.preventDefault();
        router.push(href);
      }}
    >
        <CardHeader className="p-0">
        <div
          className={cn("relative w-full bg-muted", compact ? "aspect-[5/3]" : "aspect-[16/10]")}
        >
          <ImageCarousel
            images={images}
            alt={listing.title}
            sizes={
              compact
                ? "(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 320px"
                : "(max-width: 1024px) 92vw, 560px"
            }
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.10),transparent_45%),radial-gradient(80%_80%_at_20%_10%,rgba(0,48,135,0.12),transparent_60%)]" />
          <div
            className={cn(
              "absolute flex flex-wrap gap-1.5",
              compact ? "left-2 top-2" : "left-3 top-3"
            )}
          >
            <div
              className={cn(
                "rounded-full border border-white/25 bg-black/45 font-semibold text-white shadow-sm backdrop-blur-md",
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px] tracking-wide"
              )}
            >
              {(listing.dealType ?? "rent") === "sale" ? "Πώληση" : "Ενοικίαση"}
            </div>
            {listing.resolvedOutcome === "RENTED" ? (
              <div
                className={cn(
                  "rounded-full border border-emerald-400/45 bg-emerald-950/75 font-semibold text-emerald-50 shadow-sm backdrop-blur-md",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
                )}
              >
                Ενοικιάστηκε
              </div>
            ) : listing.resolvedOutcome === "SOLD" ? (
              <div
                className={cn(
                  "rounded-full border border-violet-400/45 bg-violet-950/75 font-semibold text-violet-50 shadow-sm backdrop-blur-md",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
                )}
              >
                Πουλήθηκε
              </div>
            ) : listing.isActive === false ? (
              <div
                className={cn(
                  "rounded-full border border-amber-400/40 bg-amber-950/65 font-semibold text-amber-50 shadow-sm backdrop-blur-md",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
                )}
              >
                Ανενεργή
              </div>
            ) : null}
            {!compact ? (
              <div className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
                Επαληθευμένο
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={saved ? "Unsave" : "Save"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved(listing.id);
            }}
            className={cn(
              "absolute inline-flex items-center justify-center rounded-xl border border-white/30 bg-black/40 text-white shadow-sm backdrop-blur-md transition-colors",
              "hover:bg-black/55",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              compact ? "right-2 top-2 size-8 rounded-lg" : "right-3 top-3 size-9"
            )}
          >
            <Heart
              className={cn(
                compact ? "size-3.5" : "size-4",
                saved ? "fill-red-500 text-red-500" : "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              )}
            />
          </button>
        </div>
        </CardHeader>
        <CardContent className={cn("relative z-10 border-t border-border/40", compact ? "space-y-2 p-3" : "space-y-3 p-4 sm:p-5")}>
        <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-4")}>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "line-clamp-2 font-semibold tracking-tight text-foreground",
                compact ? "text-sm leading-snug" : "text-[15px] leading-snug sm:text-base"
              )}
            >
              {listing.title}
            </div>
            <div className={cn("mt-1 line-clamp-1 text-muted-foreground", compact ? "text-xs" : "text-[13px] sm:text-sm")}>
              {listing.subtitle}
            </div>
            {!compact && descPreview ? (
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/90">
                {descPreview}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "shrink-0 rounded-lg bg-primary/[0.08] px-2 py-1.5 text-right font-bold tabular-nums tracking-tight text-primary ring-1 ring-primary/15 dark:bg-primary/15",
              compact ? "text-sm" : "text-[15px] sm:text-base"
            )}
          >
            {formatEur(listing.priceEur)}
          </div>
        </div>
        <div className={cn("flex flex-wrap", compact ? "gap-1" : "gap-1.5")}>
          {listing.highlights.slice(0, compact ? 2 : 4).map((h) => (
            <Badge
              key={h}
              variant="secondary"
              className={cn(
                "rounded-full border border-border/40 bg-muted/60 font-medium text-foreground/90 shadow-none dark:bg-muted/30",
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs"
              )}
            >
              {h}
            </Badge>
          ))}
        </div>
        </CardContent>
    </Card>
  );
}

