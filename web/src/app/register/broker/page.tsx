"use client";

import { Suspense } from "react";

import { RegisterFlow } from "@/components/auth/register-flow";

export default function RegisterBrokerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
      }
    >
      <RegisterFlow />
    </Suspense>
  );
}
