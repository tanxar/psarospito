import { CircleCheck } from "lucide-react";

export function ListingHighlightsGrid({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Τι περιλαμβάνει
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2 lg:grid-cols-3">
        {items.map((label) => (
          <li
            key={label}
            className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/80 px-3 py-2.5 text-[14px] leading-snug text-foreground shadow-sm ring-1 ring-black/[0.02] dark:border-white/[0.06] dark:bg-background/40 dark:ring-white/[0.03]"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
              <CircleCheck className="size-3.5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="min-w-0 pt-0.5">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
