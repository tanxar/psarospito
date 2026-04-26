"use client";

import { useEffect, useRef } from "react";

import "@photo-sphere-viewer/core/index.css";

type Props = {
  src: string;
};

export function PanoramaViewer({ src }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void import("@photo-sphere-viewer/core")
      .then(({ Viewer }) => {
        if (cancelled || !hostRef.current) return;
        const viewer = new Viewer({
          container: hostRef.current,
          panorama: src,
          navbar: ["zoom", "move", "fullscreen"],
          mousewheelCtrlKey: false,
          defaultYaw: 0,
          defaultPitch: 0,
          defaultZoomLvl: 25,
          touchmoveTwoFingers: false,
        });
        cleanup = () => {
          viewer.destroy();
        };
      })
      .catch(() => {
        // Ignore lazy import failure; image fallback remains available in photo tab.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [src]);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
