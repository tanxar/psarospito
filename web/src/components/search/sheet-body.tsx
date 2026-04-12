"use client";

import type { Filters } from "@/components/listings/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type BoolKey = "parking" | "balcony" | "pets" | "elevator" | "renovated" | "bright" | "nearMetro" | "nearTram";

function toggleFlag(filters: Filters, key: BoolKey) {
  return { ...filters, [key]: filters[key] === true ? undefined : true };
}

export function FiltersSheetBody({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const sqmRangeLabel =
    typeof filters.sqmMin === "number" || typeof filters.sqmMax === "number"
      ? `${typeof filters.sqmMin === "number" ? `${filters.sqmMin} m²` : "Any"} - ${typeof filters.sqmMax === "number" ? `${filters.sqmMax} m²` : "Any"}`
      : "Any";
  const priceRangeLabel =
    typeof filters.priceMinEur === "number" || typeof filters.priceMaxEur === "number"
      ? `${typeof filters.priceMinEur === "number" ? formatEur(filters.priceMinEur) : "Any"} - ${typeof filters.priceMaxEur === "number" ? formatEur(filters.priceMaxEur) : "Any"}`
      : "Any";

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Price range</div>
          <div className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
            {priceRangeLabel}
          </div>
        </div>
        <div className="mt-2.5 rounded-xl border border-border/60 bg-background/55 p-2.5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">Min</div>
            <Select
              value={typeof filters.priceMinEur === "number" ? String(filters.priceMinEur) : "any"}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  priceMinEur: v === "any" ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger className="h-9 rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="400">€400+</SelectItem>
                <SelectItem value="600">€600+</SelectItem>
                <SelectItem value="800">€800+</SelectItem>
                <SelectItem value="1000">€1,000+</SelectItem>
                <SelectItem value="1200">€1,200+</SelectItem>
                <SelectItem value="1500">€1,500+</SelectItem>
                <SelectItem value="2000">€2,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden pb-2 text-[11px] text-muted-foreground sm:block">to</div>

          <div>
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">Max</div>
            <Select
              value={typeof filters.priceMaxEur === "number" ? String(filters.priceMaxEur) : "any"}
              onValueChange={(v) =>
                onChange({
                  ...filters,
                  priceMaxEur: v === "any" ? undefined : Number(v),
                })
              }
            >
              <SelectTrigger className="h-9 rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="800">Up to {formatEur(800)}</SelectItem>
                <SelectItem value="1000">Up to {formatEur(1000)}</SelectItem>
                <SelectItem value="1200">Up to {formatEur(1200)}</SelectItem>
                <SelectItem value="1500">Up to {formatEur(1500)}</SelectItem>
                <SelectItem value="2000">Up to {formatEur(2000)}</SelectItem>
                <SelectItem value="3000">Up to {formatEur(3000)}</SelectItem>
                <SelectItem value="4000">Up to {formatEur(4000)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Size range</div>
          <div className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
            {sqmRangeLabel}
          </div>
        </div>
        <div className="mt-2.5 rounded-xl border border-border/60 bg-background/55 p-2.5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Min</div>
              <Select
                value={typeof filters.sqmMin === "number" ? String(filters.sqmMin) : "any"}
                onValueChange={(v) =>
                  onChange({
                    ...filters,
                    sqmMin: v === "any" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger className="h-9 rounded-lg border-border/60 bg-background">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="20">20 m²+</SelectItem>
                  <SelectItem value="30">30 m²+</SelectItem>
                  <SelectItem value="40">40 m²+</SelectItem>
                  <SelectItem value="50">50 m²+</SelectItem>
                  <SelectItem value="60">60 m²+</SelectItem>
                  <SelectItem value="80">80 m²+</SelectItem>
                  <SelectItem value="100">100 m²+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden pb-2 text-[11px] text-muted-foreground sm:block">to</div>

            <div>
              <div className="mb-1 text-[11px] font-medium text-muted-foreground">Max</div>
              <Select
                value={typeof filters.sqmMax === "number" ? String(filters.sqmMax) : "any"}
                onValueChange={(v) =>
                  onChange({
                    ...filters,
                    sqmMax: v === "any" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger className="h-9 rounded-lg border-border/60 bg-background">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="40">Up to 40 m²</SelectItem>
                  <SelectItem value="50">Up to 50 m²</SelectItem>
                  <SelectItem value="60">Up to 60 m²</SelectItem>
                  <SelectItem value="80">Up to 80 m²</SelectItem>
                  <SelectItem value="100">Up to 100 m²</SelectItem>
                  <SelectItem value="120">Up to 120 m²</SelectItem>
                  <SelectItem value="160">Up to 160 m²</SelectItem>
                  <SelectItem value="200">Up to 200 m²</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
        <div className="text-sm font-medium">Rooms</div>
        <div className="mt-3">
          <Select
            value={filters.rooms ?? ""}
            onValueChange={(v) =>
              onChange({ ...filters, rooms: (v || undefined) as Filters["rooms"] })
            }
          >
            <SelectTrigger className="h-12 rounded-xl bg-background/60">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3+">3+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
        <div className="text-sm font-medium">Features</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["parking", "Parking"],
            ["balcony", "Balcony"],
            ["pets", "Pets"],
            ["elevator", "Elevator"],
            ["renovated", "Renovated"],
            ["bright", "Bright"],
          ] as const).map(([key, label]) => {
            const active = filters[key] === true;
            return (
              <Button
                key={key}
                type="button"
                variant="secondary"
                onClick={() => onChange(toggleFlag(filters, key))}
                className={[
                  "h-10 rounded-full bg-background/60 px-4",
                  active && "border border-primary bg-accent text-accent-foreground hover:bg-accent",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur">
        <div className="text-sm font-medium">Location</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["nearMetro", "Near metro"],
            ["nearTram", "Near tram"],
          ] as const).map(([key, label]) => {
            const active = filters[key] === true;
            return (
              <Button
                key={key}
                type="button"
                variant="secondary"
                onClick={() => onChange(toggleFlag(filters, key))}
                className={[
                  "h-10 rounded-full bg-background/60 px-4",
                  active && "border border-primary bg-accent text-accent-foreground hover:bg-accent",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

