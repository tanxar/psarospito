"use client";

import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PanoramaViewer } from "@/components/media/panorama-viewer";
import { cn } from "@/lib/utils";

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  alt,
  initialIndex = 0,
  showPanoramaButton = false,
  panoramaImages = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  alt: string;
  initialIndex?: number;
  showPanoramaButton?: boolean;
  panoramaImages?: string[];
}) {
  const items = useMemo(() => images.filter(Boolean), [images]);
  const panoramas = useMemo(() => panoramaImages.filter(Boolean), [panoramaImages]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<"photos" | "panorama">("photos");
  const [panoramaIdx, setPanoramaIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = Math.max(0, Math.min(items.length - 1, initialIndex));
    const raf = requestAnimationFrame(() => {
      setIdx(next);
      setMode("photos");
      setPanoramaIdx(0);
      setZoom(1);
      scrollerRef.current?.scrollTo({ left: 0, top: 0 });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, initialIndex, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      if (mode === "photos" && e.key === "ArrowLeft") setIdx((v) => Math.max(0, v - 1));
      if (mode === "photos" && e.key === "ArrowRight") setIdx((v) => Math.min(items.length - 1, v + 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
      if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, mode, onOpenChange]);

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
  const canPrev = mode === "photos" && idx > 0;
  const canNext = mode === "photos" && idx < items.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Προβολή φωτογραφιών"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="absolute inset-0 flex min-h-0 flex-col">
        <div className="shrink-0 px-3 pt-3 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between gap-3 text-sm text-white">
            <div className="rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 backdrop-blur">
              {mode === "panorama" ? `360° ${panoramaIdx + 1} / ${panoramas.length}` : `${idx + 1} / ${items.length}`}
            </div>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10 backdrop-blur transition hover:bg-black/40"
              onClick={() => onOpenChange(false)}
              aria-label="Κλείσιμο"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 pt-2 sm:pt-3">
          {mode === "panorama" && panoramas.length > 1 ? (
            <div className="absolute left-3 top-3 z-[2] flex max-w-[70vw] gap-2 overflow-x-auto rounded-xl bg-black/30 p-2 ring-1 ring-white/10 backdrop-blur sm:left-6 sm:top-6">
              {panoramas.map((pSrc, pIdx) => (
                <button
                  key={`${pSrc}-${pIdx}`}
                  type="button"
                  onClick={() => setPanoramaIdx(pIdx)}
                  className={cn(
                    "h-8 shrink-0 rounded-lg border px-3 text-xs font-semibold transition",
                    pIdx === panoramaIdx
                      ? "border-white/60 bg-white/20 text-white"
                      : "border-white/20 bg-black/45 text-white hover:border-white/40 hover:bg-black/55"
                  )}
                  aria-label={`Άνοιγμα 360 εικόνας ${pIdx + 1}`}
                >
                  360° #{pIdx + 1}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "panorama" && panoramas.length > 0 ? (
            <div className="absolute inset-0">
              <PanoramaViewer src={panoramas[panoramaIdx] ?? panoramas[0]!} />
            </div>
          ) : (
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
          )}

          <button
            type="button"
            aria-label="Προηγούμενη εικόνα"
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
            aria-label="Επόμενη εικόνα"
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
                    onClick={() => {
                      setMode("photos");
                      setIdx(tIdx);
                    }}
                    className={cn(
                      "relative h-14 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 transition",
                      "hover:ring-white/25",
                      tIdx === idx && "ring-2 ring-white/60"
                    )}
                    aria-label={`Άνοιγμα εικόνας ${tIdx + 1}`}
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
                {showPanoramaButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("panorama");
                      setPanoramaIdx(0);
                    }}
                    className={cn(
                      "h-14 w-20 shrink-0 rounded-xl border px-2 text-xs font-semibold transition",
                      mode === "panorama"
                        ? "border-white/60 bg-white/20 text-white"
                        : "border-white/20 bg-black/45 text-white hover:border-white/40 hover:bg-black/55"
                    )}
                    aria-label="Άνοιγμα 360 περιήγησης"
                  >
                    360°
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  , document.body);
}

