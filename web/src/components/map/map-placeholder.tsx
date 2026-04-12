"use client";

export function MapPlaceholder({
  className,
  heightClassName,
}: {
  className?: string;
  heightClassName?: string;
}) {
  return (
    <div
      className={[
        "w-full overflow-hidden rounded-3xl border bg-card shadow-none",
        heightClassName ?? "h-[72dvh] lg:h-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Map placeholder (Mapbox/Google Maps next)
      </div>
    </div>
  );
}

