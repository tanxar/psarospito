"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const COLLAPSED_PX = 152;

type Props = {
  text: string;
  className?: string;
};

export function ListingDescriptionExpand({ text, className }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    setCanExpand(el.scrollHeight > COLLAPSED_PX + 24);
  }, [text]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={innerRef}
        className={cn(
          "text-pretty text-[15px] leading-[1.78] text-foreground/92 sm:text-base sm:leading-[1.82] whitespace-pre-wrap",
          !expanded && canExpand && "max-h-[9.5rem] overflow-hidden sm:max-h-[10.25rem]"
        )}
      >
        {text}
      </div>
      {!expanded && canExpand ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card from-[18%] via-card/70 to-transparent dark:from-card"
        />
      ) : null}
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="relative z-[1] mt-4 inline-flex h-9 items-center rounded-full border border-primary/25 bg-primary/[0.08] px-4 text-sm font-semibold text-primary shadow-sm transition-[background-color,box-shadow,border-color] hover:border-primary/40 hover:bg-primary/[0.14] hover:shadow dark:bg-primary/10 dark:hover:bg-primary/15"
        >
          {expanded ? "Λιγότερα" : "Περισσότερα"}
        </button>
      ) : null}
    </div>
  );
}
