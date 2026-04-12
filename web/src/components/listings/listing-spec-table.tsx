import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ListingSpecRow = { label: string; value: ReactNode };

export function ListingSpecTable({
  rows,
  className,
}: {
  rows: ListingSpecRow[];
  /** Π.χ. μέσα σε εξωτερικό card: χωρίς διπλό border/radius */
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "overflow-hidden rounded-[1.35rem] border border-border/55 bg-card text-[14px] shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.03] dark:border-white/[0.09] dark:bg-card/95 dark:shadow-none dark:ring-white/[0.05] sm:text-[15px]",
        className
      )}
    >
      {rows.map((row, i) => (
        <div
          key={`${row.label}-${i}`}
          className={cn(
            "grid grid-cols-[minmax(0,10.5rem)_1fr] items-baseline gap-x-4 px-6 py-3.5 sm:grid-cols-[minmax(0,12.5rem)_1fr] sm:gap-x-6 sm:px-8 sm:py-4",
            i > 0 && "border-t border-border/45",
            "hover:bg-muted/[0.45] dark:hover:bg-muted/15"
          )}
        >
          <dt className="min-w-0 text-[13px] font-medium leading-snug text-muted-foreground sm:text-[14px]">
            {row.label}
          </dt>
          <dd className="min-w-0 text-end text-[14px] font-semibold leading-snug text-foreground sm:text-[15px]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
