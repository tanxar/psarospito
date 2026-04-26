import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Διαχείριση πολυ-βηματικής ροής ανάληψης (ιδιώτης/μεσίτης). */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να διαχειριστείς προσφορές", 401);

    const { id: listingId, offerId } = await ctx.params;
    if (!listingId || !offerId) return jsonError("Missing params", 400);

    const body = (await req.json().catch(() => null)) as null | { action?: unknown };
    const action = body?.action;
    if (action !== "accept" && action !== "reject" && action !== "confirm") {
      return jsonError("Άκυρη ενέργεια", 400);
    }

    const offer = await prisma.listingBrokerOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        listingId: true,
        brokerUserId: true,
        ownerUserId: true,
        direction: true,
        status: true,
      },
    });
    if (!offer || offer.listingId !== listingId) return jsonError("Η προσφορά δεν βρέθηκε", 404);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true, isActive: true },
    });
    if (!listing?.isActive) return jsonError("Η αγγελία δεν είναι διαθέσιμη", 400);

    // Ροή 1: προσφορά μεσίτη -> αποδοχή/απόρριψη ιδιώτη
    if (offer.direction === "BROKER_TO_OWNER") {
      if (offer.ownerUserId !== session.id) return jsonError("Δεν έχεις πρόσβαση σε αυτή την προσφορά", 403);
      if (listing.ownerUserId !== session.id) return jsonError("Η αγγελία δεν ανήκει πλέον σε εσένα", 409);
      if (offer.status !== "PENDING") return jsonError("Η προσφορά έχει ήδη διαχειριστεί", 400);
      if (action === "confirm") return jsonError("Δεν απαιτείται confirm σε αυτή τη ροή", 400);

      if (action === "reject") {
        await prisma.listingBrokerOffer.update({
          where: { id: offer.id },
          data: { status: "REJECTED", respondedAt: new Date() },
        });
        return NextResponse.json({ ok: true });
      }

      await prisma.$transaction(async (tx) => {
        await tx.listingBrokerOffer.update({
          where: { id: offer.id },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });

        await tx.listingBrokerOffer.updateMany({
          where: { listingId, id: { not: offer.id }, status: "PENDING" },
          data: { status: "REJECTED", respondedAt: new Date() },
        });

        await tx.listing.update({
          where: { id: listingId },
          data: { ownerUserId: offer.brokerUserId },
        });
      });
      return NextResponse.json({ ok: true, transferred: true });
    }

    // Ροή 2: αίτημα ιδιώτη -> αποδοχή/απόρριψη μεσίτη -> confirm ιδιώτη
    if (offer.direction === "OWNER_TO_BROKER") {
      if (action === "accept" || action === "reject") {
        if (offer.brokerUserId !== session.id) return jsonError("Μόνο ο μεσίτης μπορεί να απαντήσει", 403);
        if (offer.status !== "PENDING") return jsonError("Το αίτημα έχει ήδη απαντηθεί", 400);

        await prisma.listingBrokerOffer.update({
          where: { id: offer.id },
          data: {
            status: action === "accept" ? "BROKER_ACCEPTED" : "REJECTED",
            respondedAt: new Date(),
          },
        });
        return NextResponse.json({ ok: true });
      }

      if (action === "confirm") {
        if (offer.ownerUserId !== session.id) return jsonError("Μόνο ο ιδιοκτήτης μπορεί να επιβεβαιώσει", 403);
        if (listing.ownerUserId !== session.id) return jsonError("Η αγγελία δεν ανήκει πλέον σε εσένα", 409);
        if (offer.status !== "BROKER_ACCEPTED") return jsonError("Ο μεσίτης δεν έχει αποδεχτεί ακόμα", 400);

        await prisma.$transaction(async (tx) => {
          await tx.listingBrokerOffer.update({
            where: { id: offer.id },
            data: { status: "ACCEPTED", respondedAt: new Date() },
          });

          await tx.listingBrokerOffer.updateMany({
            where: { listingId, id: { not: offer.id }, status: { in: ["PENDING", "BROKER_ACCEPTED"] } },
            data: { status: "REJECTED", respondedAt: new Date() },
          });

          await tx.listing.update({
            where: { id: listingId },
            data: { ownerUserId: offer.brokerUserId },
          });
        });
        return NextResponse.json({ ok: true, transferred: true });
      }
    }

    return jsonError("Άκυρη κατάσταση προσφοράς", 400);
  } catch (e) {
    console.error("[PATCH /api/listings/[id]/broker-offers/[offerId]]", e);
    return jsonError("Αποτυχία ενημέρωσης προσφοράς", 503);
  }
}
