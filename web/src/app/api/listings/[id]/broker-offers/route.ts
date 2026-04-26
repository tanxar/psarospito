import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Μεσίτης κάνει πρόταση ανάληψης σε αγγελία ιδιώτη. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να στείλεις προσφορά", 401);
    if (session.role !== "BROKER") return jsonError("Μόνο μεσίτες μπορούν να στείλουν προσφορά", 403);
    if (!session.brokerOnboardingCompleted) return jsonError("Ολοκλήρωσε πρώτα το προφίλ μεσίτη", 403);

    const { id: listingId } = await ctx.params;
    if (!listingId) return jsonError("Missing id", 400);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        isActive: true,
        ownerUserId: true,
        owner: { select: { role: true } },
      },
    });
    if (!listing?.isActive) return jsonError("Η αγγελία δεν βρέθηκε", 404);
    if (!listing.ownerUserId) return jsonError("Η αγγελία δεν έχει ιδιοκτήτη", 400);
    if (listing.ownerUserId === session.id) return jsonError("Δεν μπορείς να κάνεις προσφορά στη δική σου αγγελία", 400);
    if (listing.owner?.role !== "SEEKER") return jsonError("Προσφορά επιτρέπεται μόνο σε αγγελίες ιδιωτών", 400);

    const body = (await req.json().catch(() => null)) as null | { message?: unknown };
    let message: string | null = null;
    if (body?.message != null) {
      if (typeof body.message !== "string") return jsonError("Μη έγκυρο μήνυμα", 400);
      const cleaned = body.message.trim();
      if (cleaned.length > 2000) return jsonError("Το μήνυμα είναι πολύ μεγάλο", 400);
      message = cleaned.length ? cleaned : null;
    }

    const existingPending = await prisma.listingBrokerOffer.findFirst({
      where: {
        listingId: listing.id,
        brokerUserId: session.id,
        direction: "BROKER_TO_OWNER",
        status: "PENDING",
      },
      select: { id: true },
    });
    if (existingPending) {
      return jsonError("Έχεις ήδη ενεργή προσφορά για αυτή την αγγελία", 409);
    }

    const created = await prisma.listingBrokerOffer.create({
      data: {
        listingId: listing.id,
        brokerUserId: session.id,
        ownerUserId: listing.ownerUserId,
        message,
        direction: "BROKER_TO_OWNER",
        status: "PENDING",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[POST /api/listings/[id]/broker-offers]", e);
    return jsonError("Αποτυχία αποστολής προσφοράς", 503);
  }
}
