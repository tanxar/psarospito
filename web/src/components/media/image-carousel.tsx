"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function ImageCarousel({
  images,
  alt,
  className,
  imageClassName,
  sizes,
  initialIndex = 0,
  onIndexChange,
}: {
  images: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes: string;
  initialIndex?: number;
  onIndexChange?: (idx: number) => void;
}) {
  const items = useMemo(() => images.filter(Boolean), [images]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, Math.min(items.length - 1, initialIndex)));

  useEffect(() => {
    onIndexChange?.(activeIdx);
  }, [activeIdx, onIndexChange]);

  useEffect(() => {
    if (items.length <= 1) return;
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const w = el.clientWidth || 1;
      const idx = Math.round(el.scrollLeft / w);
      setActiveIdx(Math.max(0, Math.min(items.length - 1, idx)));
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const idx = Math.max(0, Math.min(items.length - 1, initialIndex));
    const el = scrollerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const w = el.clientWidth || 1;
      el.scrollLeft = idx * w;
      setActiveIdx(idx);
    });
    return () => cancelAnimationFrame(raf);
  }, [initialIndex, items.length]);

  const scrollToIndex = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.max(0, Math.min(items.length - 1, idx));
    const w = el.clientWidth || 1;
    const left = i * w;
    try {
      el.scrollTo({ left, behavior: "smooth" });
    } catch {
      // no-op
    }
    if (Math.abs(el.scrollLeft - left) > 2) {
      el.scrollLeft = left;
    }
    setActiveIdx(i);
  };

  const handleArrow = (dir: -1 | 1) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const next = Math.max(0, Math.min(items.length - 1, activeIdx + dir));
    scrollToIndex(next);
  };

  if (items.length <= 1) {
    const src = items[0] ?? "";
    return (
      <div className={cn("relative h-full w-full", className)}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className={cn("object-cover", imageClassName)}
            sizes={sizes}
            unoptimized
          />
        ) : null}
      </div>
    );
  }

  return (
    <div data-carousel-root className={cn("relative h-full w-full", className)}>
      <div
        ref={scrollerRef}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((src, idx) => (
          <div key={`${src}-${idx}`} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={alt}
              fill
              className={cn("object-cover", imageClassName)}
              sizes={sizes}
              unoptimized
              priority={idx === 0}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Προηγούμενη φωτογραφία"
        data-carousel-control
        onClick={handleArrow(-1)}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2",
          "inline-flex size-9 items-center justify-center rounded-xl border bg-background/80 backdrop-blur",
          "transition-colors hover:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <ChevronLeft className="size-4" />
      </button>

      <button
        type="button"
        aria-label="Επόμενη φωτογραφία"
        data-carousel-control
        onClick={handleArrow(1)}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2",
          "inline-flex size-9 items-center justify-center rounded-xl border bg-background/80 backdrop-blur",
          "transition-colors hover:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border bg-background/70 px-2 py-1 backdrop-blur">
        {items.slice(0, 8).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-foreground/25 transition-colors duration-200",
              i === activeIdx && "bg-foreground/70"
            )}
          />
        ))}
      </div>
    </div>
  );
}
