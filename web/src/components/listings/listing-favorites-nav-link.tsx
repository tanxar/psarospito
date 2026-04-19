"use client";

import { Heart } from "lucide-react";

import { useSavedListings } from "@/components/saved/use-saved";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListingFavoritesNavLink({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  const saved = useSavedListings();
  const isSaved = saved.has(listingId);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => saved.toggle(listingId)}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Αφαίρεση από τα αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      title={isSaved ? "Αφαίρεση από τα αγαπημένα" : "Προσθήκη στα αγαπημένα"}
      className={cn(
        "size-11 shrink-0 rounded-full border-border/55 bg-background p-0 shadow-sm ring-1 ring-black/[0.03] transition-[transform,box-shadow] hover:bg-muted hover:shadow-md active:scale-[0.98] dark:ring-white/[0.05] sm:size-10",
        className
      )}
    >
      <Heart
        className={cn(
          "size-5 sm:size-[1.125rem]",
          isSaved ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
        aria-hidden
      />
    </Button>
  );
}
