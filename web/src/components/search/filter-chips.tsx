"use client";

import { Button } from "@/components/ui/button";
import type { Filters } from "@/components/listings/types";

type ChipKey = "price" | "sqm" | "rooms" | "parking" | "balcony" | "pets";

function isChipActive(key: ChipKey, filters: Filters) {
  switch (key) {
    case "price":
      return typeof filters.priceMaxEur === "number";
    case "sqm":
      return typeof filters.sqmMin === "number";
    case "rooms":
      return typeof filters.rooms === "string";
    case "parking":
      return filters.parking === true;
    case "balcony":
      return filters.balcony === true;
    case "pets":
      return filters.pets === true;
  }
}

const chips: { key: ChipKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "sqm", label: "m²" },
  { key: "rooms", label: "Rooms" },
  { key: "parking", label: "Parking" },
  { key: "balcony", label: "Balcony" },
  { key: "pets", label: "Pets" },
];

export function FilterChips({
  filters,
  onToggle,
  withContainer = true,
}: {
  filters: Filters;
  onToggle: (key: ChipKey) => void;
  withContainer?: boolean;
}) {
  const content = (
    <>
      {chips.map(({ key, label }) => {
        const active = isChipActive(key, filters);
        return (
          <Button
            key={key}
            type="button"
            variant="secondary"
            onClick={() => onToggle(key)}
            className={[
              "h-8 shrink-0 rounded-full bg-card px-3 text-xs text-foreground hover:bg-muted",
              active && "border border-primary bg-accent text-accent-foreground hover:bg-accent",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </Button>
        );
      })}
    </>
  );

  if (!withContainer) return content;

  return (
    <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {content}
    </div>
  );
}

