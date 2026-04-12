import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
}

function hasViewingAppointmentDelegate(client: PrismaClient): boolean {
  const d = (client as unknown as Record<string, unknown>).viewingAppointment;
  return d != null && typeof d === "object";
}

/** Στο dev το `globalThis.__prisma` μπορεί να είναι παλιό μετά από `prisma generate` — ξαναφτιάχνουμε client αν λείπει delegate. */
function getClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return globalThis.__prisma ?? createClient();
  }

  const g = globalThis.__prisma;
  if (!g) {
    const next = createClient();
    globalThis.__prisma = next;
    return next;
  }
  if (hasViewingAppointmentDelegate(g)) {
    return g;
  }
  void g.$disconnect().catch(() => {});
  globalThis.__prisma = undefined;
  const next = createClient();
  globalThis.__prisma = next;
  return next;
}

export const prisma = getClient();
