import { Prisma, PrismaClient } from "@prisma/client";

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

/** Υπογραφή scalar μοντέλων — αλλάζει μετά από `prisma generate` (νέα στήλη σε User, Listing κ.λπ.). */
function prismaSchemaSignature(): string {
  try {
    const listing = Object.keys(Prisma.ListingScalarFieldEnum).sort().join(",");
    const user = Object.keys(Prisma.UserScalarFieldEnum).sort().join(",");
    return `${listing}|${user}`;
  } catch {
    return "";
  }
}

type CachedPrisma = PrismaClient & { __schemaSig?: string };

/** Στο dev το `globalThis.__prisma` μένει παλιό μετά από `prisma generate` — ανανεώνουμε αν αλλάξει το schema ή λείπει delegate. */
function getClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return globalThis.__prisma ?? createClient();
  }

  const sig = prismaSchemaSignature();
  const g = globalThis.__prisma as CachedPrisma | undefined;

  const ok = g && g.__schemaSig === sig && hasViewingAppointmentDelegate(g);

  if (ok) {
    return g;
  }

  if (g) {
    void g.$disconnect().catch(() => {});
    globalThis.__prisma = undefined;
  }

  const next = createClient() as CachedPrisma;
  next.__schemaSig = sig;
  globalThis.__prisma = next;
  return next;
}

/** Proxy ώστε μετά από `prisma generate` να μη μένει παγωμένο το πρώτο instance στο import. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol, receiver) {
    const client = getClient();
    const value = Reflect.get(client as unknown as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;
