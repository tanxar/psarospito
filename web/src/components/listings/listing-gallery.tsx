"use client";

import { useMemo, useState } from "react";

import { ImageCarousel } from "@/components/media/image-carousel";
import { ImageLightbox } from "@/components/media/image-lightbox";

export function ListingGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const items = useMemo(() => images.filter(Boolean), [images]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  return (
    <>
      <div className="relative aspect-[16/9] w-full bg-muted">
        <div
          className="absolute inset-0"
          onClick={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.("[data-carousel-control]")) return;
            setOpen(true);
          }}
          role="button"
          tabIndex={0}
          aria-label="Άνοιγμα γκαλερί"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setOpen(true);
          }}
        >
          <ImageCarousel
            images={items}
            alt={alt}
            sizes="(max-width: 1024px) 92vw, 960px"
            onIndexChange={setIdx}
          />
        </div>
      </div>

      <ImageLightbox open={open} onOpenChange={setOpen} images={items} alt={alt} initialIndex={idx} />
    </>
  );
}
