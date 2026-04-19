"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useSessionUser } from "@/components/auth/use-session";

const AUTH_WITH_NEXT = `/auth/email?next=${encodeURIComponent("/listings/new")}`;

/** Καταχώρηση αγγελίας: αν δεν υπάρχει σύνδεση → auth/email με επιστροφή στη φόρμα. */
export function ListingsNewEntryLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const { user } = useSessionUser();
  const href = user ? "/listings/new" : AUTH_WITH_NEXT;
  return <Link {...props} href={href} />;
}
