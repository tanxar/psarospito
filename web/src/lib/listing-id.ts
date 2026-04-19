import type { PrismaClient } from "@prisma/client";

/** Ακριβώς 10 ψηφία (0–9), π.χ. `9538267569`. Τυχαία · μοναδικότητα με έλεγχο στη βάση. */
export function randomListingDigitCode(): string {
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += String(buf[i]! % 10);
  }
  return out;
}

/** Επιλογή μοναδικού id προς χρήση ως κλειδί `Listing.id`. */
export async function allocateUniqueListingId(prisma: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const id = randomListingDigitCode();
    const clash = await prisma.listing.findUnique({ where: { id }, select: { id: true } });
    if (!clash) return id;
  }
  throw new Error("Could not allocate unique listing id");
}
