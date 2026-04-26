"use client";

import { X } from "lucide-react";

import type { Filters } from "@/components/listings/types";

type ClearKey = keyof Filters | "features" | "location";

function humanize(filters: Filters): { key: ClearKey; label: string }[] {
  const out: { key: ClearKey; label: string }[] = [];
  if (typeof filters.priceMinEur === "number") out.push({ key: "priceMinEur", label: `Από €${filters.priceMinEur}` });
  if (typeof filters.priceMaxEur === "number") out.push({ key: "priceMaxEur", label: `Έως €${filters.priceMaxEur}` });
  if (typeof filters.sqmMin === "number") out.push({ key: "sqmMin", label: `Από ${filters.sqmMin} m²` });
  if (typeof filters.sqmMax === "number") out.push({ key: "sqmMax", label: `Έως ${filters.sqmMax} m²` });
  if (filters.rooms) out.push({ key: "rooms", label: `${filters.rooms} δωμάτια` });
  const feats: string[] = [];
  if (filters.parking) feats.push("Πάρκινγκ");
  if (filters.balcony) feats.push("Μπαλκόνι");
  if (filters.pets) feats.push("Κατοικίδια");
  if (filters.elevator) feats.push("Ασανσέρ");
  if (filters.renovated) feats.push("Ανακαινισμένο");
  if (filters.bright) feats.push("Φωτεινό");
  if (feats.length) out.push({ key: "features", label: feats.join(" · ") });

  const loc: string[] = [];
  if (filters.nearMetro) loc.push("Κοντά στο μετρό");
  if (filters.nearTram) loc.push("Κοντά στο τραμ");
  if (loc.length) out.push({ key: "location", label: loc.join(" · ") });

  return out;
}

export function AppliedFilters({
  filters,
  onClear,
}: {
  filters: Filters;
  onClear: (key: ClearKey) => void;
}) {
  const pills = humanize(filters);
  if (!pills.length) return null;

  return (
    <div className="mt-1.5 flex gap-1.5 overflow-x-auto whitespace-nowrap pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {pills.map((p) => (
        <div
          key={`${p.key}-${p.label}`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border/60 bg-card px-2 text-xs text-foreground"
        >
          <span>{p.label}</span>
          <button
            type="button"
            onClick={() => onClear(p.key)}
            aria-label={`Καθαρισμός ${p.label}`}
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

