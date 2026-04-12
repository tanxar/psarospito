"use client";

import { useEffect, useState } from "react";

import { parseSessionUser, type SessionUser } from "@/lib/user-session-types";

export const AUTH_CHANGED_EVENT = "nestio_auth_changed";

export type { SessionUser };

export function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function useSessionUser(): { user: SessionUser | null; ready: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data: { user?: unknown }) => {
          if (!cancelled) {
            setUser(parseSessionUser(data?.user ?? null));
            setReady(true);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUser(null);
            setReady(true);
          }
        });
    };

    load();
    window.addEventListener(AUTH_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, load);
    };
  }, []);

  return { user, ready };
}
