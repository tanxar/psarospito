import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Ιδιώτης επιλέγει μεσίτη από το popup και στέλνει αίτημα συνεργασίας. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να στείλεις αίτημα", 401);

    const { id: listingId } = await ctx.params;
    if (!listingId) return jsonError("Missing id", 400);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, isActive: true, ownerUserId: true, owner: { select: { role: true } } },
    });
    if (!listing?.isActive) return jsonError("Η αγγελία δεν βρέθηκε", 404);
    if (!listing.ownerUserId || listing.ownerUserId !== session.id) {
      return jsonError("Μόνο ο ιδιοκτήτης μπορεί να στείλει αίτημα", 403);
    }
    if (listing.owner?.role !== "SEEKER") return jsonError("Η λειτουργία ισχύει μόνο για ιδιώτες", 400);

    const body = (await req.json().catch(() => null)) as
      | null
      | { brokerUserId?: unknown; message?: unknown };
    if (!body || typeof body.brokerUserId !== "string" || !body.brokerUserId.trim()) {
      return jsonError("Λείπει ο μεσίτης", 400);
    }
    const brokerUserId = body.brokerUserId.trim();

    const broker = await prisma.user.findUnique({
      where: { id: brokerUserId },
      select: { id: true, role: true, brokerOnboardingCompleted: true },
    });
    if (!broker || broker.role !== "BROKER" || !broker.brokerOnboardingCompleted) {
      return jsonError("Ο επιλεγμένος λογαριασμός δεν είναι διαθέσιμος μεσίτης", 400);
    }

    let message: string | null = null;
    if (body.message != null) {
      if (typeof body.message !== "string") return jsonError("Μη έγκυρο μήνυμα", 400);
      const cleaned = body.message.trim();
      if (cleaned.length > 2000) return jsonError("Το μήνυμα είναι πολύ μεγάλο", 400);
      message = cleaned.length ? cleaned : null;
    }

    const existingActiveRequest = await prisma.listingBrokerOffer.findFirst({
      where: {
        listingId: listing.id,
        ownerUserId: session.id,
        direction: "OWNER_TO_BROKER",
        status: { in: ["PENDING", "BROKER_ACCEPTED"] },
      },
      select: { id: true, brokerUserId: true },
    });
    if (existingActiveRequest) {
      if (existingActiveRequest.brokerUserId === brokerUserId) {
        return jsonError("Υπάρχει ήδη ενεργό αίτημα για αυτόν τον μεσίτη", 409);
      }
      return jsonError("Έχεις ήδη επιλέξει μεσίτη για αυτή την αγγελία", 409);
    }

    const created = await prisma.listingBrokerOffer.create({
      data: {
        listingId: listing.id,
        brokerUserId,
        ownerUserId: session.id,
        message,
        direction: "OWNER_TO_BROKER",
        status: "PENDING",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("[POST /api/listings/[id]/broker-requests]", e);
    return jsonError("Αποτυχία αποστολής αιτήματος", 503);
  }
}
