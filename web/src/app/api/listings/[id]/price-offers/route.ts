import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

const MAX_DISCOUNT_RATIO = 0.17;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function minAllowedOffer(basePriceEur: number): number {
  return Math.ceil(basePriceEur * (1 - MAX_DISCOUNT_RATIO));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να κάνεις προσφορά", 401);

    const { id: listingId } = await ctx.params;
    if (!listingId) return jsonError("Missing id", 400);

    const body = (await req.json().catch(() => null)) as null | { amountEur?: unknown };
    const amountRaw = typeof body?.amountEur === "number" ? body.amountEur : Number(body?.amountEur);
    if (!Number.isFinite(amountRaw) || amountRaw <= 0) return jsonError("Μη έγκυρο ποσό προσφοράς", 400);
    const amountEur = Math.round(amountRaw);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, isActive: true, priceEur: true, ownerUserId: true },
    });
    if (!listing?.isActive || !listing.ownerUserId) return jsonError("Η αγγελία δεν είναι διαθέσιμη", 404);
    if (listing.ownerUserId === session.id) return jsonError("Δεν μπορείς να κάνεις προσφορά στη δική σου αγγελία", 400);

    const minOffer = minAllowedOffer(listing.priceEur);
    if (amountEur < minOffer) {
      return jsonError(
        `Η προσφορά δεν μπορεί να είναι πάνω από 17% χαμηλότερη από την αρχική τιμή. Ελάχιστη προσφορά: €${minOffer.toLocaleString("el-GR")}.`,
        400
      );
    }

    const created = await prisma.listingPriceOffer.create({
      data: {
        listingId: listing.id,
        seekerUserId: session.id,
        ownerUserId: listing.ownerUserId,
        amountEur,
        basePriceEur: listing.priceEur,
      },
      select: { id: true, amountEur: true },
    });

    return NextResponse.json({ ok: true, id: created.id, amountEur: created.amountEur });
  } catch (e) {
    console.error("[POST /api/listings/[id]/price-offers]", e);
    return jsonError("Αποτυχία αποστολής προσφοράς", 503);
  }
}
