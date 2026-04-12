"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  alt,
  initialIndex = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  alt: string;
  initialIndex?: number;
}) {
  const items = useMemo(() => images.filter(Boolean), [images]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = Math.max(0, Math.min(items.length - 1, initialIndex));
    const raf = requestAnimationFrame(() => {
      setIdx(next);
      setZoom(1);
      scrollerRef.current?.scrollTo({ left: 0, top: 0 });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, initialIndex, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowLeft") setIdx((v) => Math.max(0, v - 1));
      if (e.key === "ArrowRight") setIdx((v) => Math.min(items.length - 1, v + 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
      if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || items.length === 0) return null;
  if (typeof document === "undefined") return null;

  const src = items[idx]!;
  const canPrev = idx > 0;
  const canNext = idx < items.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <div className="shrink-0 px-3 pt-3 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-3 text-sm text-white">
            <div className="rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 backdrop-blur">
              {idx + 1} / {items.length}
            </div>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10 backdrop-blur transition hover:bg-black/40"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 pt-2 sm:pt-3">
          <div
            ref={scrollerRef}
            className={cn(
              "absolute inset-0 overflow-auto",
              zoom === 1 && "overflow-hidden"
            )}
            onWheel={(e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.15 : 0.15;
              setZoom((z) => Math.max(1, Math.min(3, Math.round((z + delta) * 100) / 100)));
            }}
          >
            <div
              className="relative h-full w-full"
              onDoubleClick={() => {
                setZoom((z) => (z === 1 ? 2 : 1));
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center",
                }}
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                  priority
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Previous image"
            disabled={!canPrev}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 sm:left-6",
              "inline-flex size-11 items-center justify-center rounded-2xl",
              "bg-black/30 text-white ring-1 ring-white/15 backdrop-blur transition",
              "hover:bg-black/40 disabled:opacity-40"
            )}
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            disabled={!canNext}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 sm:right-6",
              "inline-flex size-11 items-center justify-center rounded-2xl",
              "bg-black/30 text-white ring-1 ring-white/15 backdrop-blur transition",
              "hover:bg-black/40 disabled:opacity-40"
            )}
            onClick={() => setIdx((v) => Math.min(items.length - 1, v + 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
          <div className="mx-auto flex w-fit justify-center">
            <div className="max-w-[min(92vw,64rem)] rounded-2xl bg-black/35 ring-1 ring-white/10 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {items.map((tSrc, tIdx) => (
                  <button
                    key={`${tSrc}-${tIdx}`}
                    type="button"
                    onClick={() => setIdx(tIdx)}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition",
                      "hover:ring-white/25",
                      tIdx === idx && "ring-2 ring-white/60"
                    )}
                    aria-label={`Open image ${tIdx + 1}`}
                  >
                    <Image
                      src={tSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

