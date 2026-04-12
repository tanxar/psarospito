"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "nestio:saved:v1";

function readSavedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export type SavedListingsContextValue = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  /** Αυξάνεται μόνο όταν γίνεται προσθήκη (όχι αφαίρεση) — για micro-animation στο header */
  favoriteAddBurst: number;
};

const SavedListingsContext = createContext<SavedListingsContextValue | null>(null);

export function SavedListingsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [favoriteAddBurst, setFavoriteAddBurst] = useState(0);

  useEffect(() => {
    setIds(readSavedIds());
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const wasSaved = prev.includes(id);
      const next = wasSaved ? prev.filter((x) => x !== id) : [id, ...prev];
      writeSavedIds(next);
      if (!wasSaved) {
        queueMicrotask(() => setFavoriteAddBurst((n) => n + 1));
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    writeSavedIds([]);
  }, []);

  const value = useMemo(
    () => ({
      ids,
      has,
      toggle,
      clear,
      favoriteAddBurst,
    }),
    [ids, has, toggle, clear, favoriteAddBurst]
  );

  return <SavedListingsContext.Provider value={value}>{children}</SavedListingsContext.Provider>;
}

export function useSavedListings(): SavedListingsContextValue {
  const ctx = useContext(SavedListingsContext);
  if (!ctx) {
    throw new Error("useSavedListings must be used within SavedListingsProvider");
  }
  return ctx;
}
