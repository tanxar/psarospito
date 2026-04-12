import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Ενδιαφερόμενος κλείνει ραντεβού παρουσίασης με τον ιδιοκτήτη της αγγελίας. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να κλείσεις ραντεβού", 401);

    const { id: listingId } = await ctx.params;
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerUserId: true, isActive: true },
    });
    if (!listing?.isActive) return jsonError("Η αγγελία δεν βρέθηκε", 404);
    if (!listing.ownerUserId) {
      return jsonError("Δεν είναι διαθέσιμο online κλείσιμο ραντεβού για αυτή την αγγελία", 400);
    }
    if (listing.ownerUserId === session.id) {
      return jsonError("Δεν μπορείς να κλείσεις ραντεβού για δική σου αγγελία", 400);
    }

    const body = (await req.json().catch(() => null)) as
      | null
      | { startsAt?: unknown; message?: unknown };
    if (!body || typeof body.startsAt !== "string") return jsonError("Λείπει ημερομηνία/ώρα", 400);

    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) return jsonError("Μη έγκυρη ημερομηνία", 400);

    const now = Date.now();
    if (startsAt.getTime() < now + 30 * 60 * 1000) {
      return jsonError("Επίλεξε ώρα τουλάχιστον 30 λεπτά από τώρα", 400);
    }
    if (startsAt.getTime() > now + 120 * 24 * 60 * 60 * 1000) {
      return jsonError("Το ραντεβού δεν μπορεί να είναι πάνω από 120 μέρες μπροστά", 400);
    }

    let message: string | null = null;
    if (body.message != null) {
      if (typeof body.message !== "string") return jsonError("Μη έγκυρο μήνυμα", 400);
      const t = body.message.trim();
      if (t.length > 2000) return jsonError("Το μήνυμα είναι πολύ μεγάλο", 400);
      message = t.length ? t : null;
    }

    const row = await prisma.viewingAppointment.create({
      data: {
        listingId: listing.id,
        seekerId: session.id,
        hostId: listing.ownerUserId,
        startsAt,
        message,
      },
      select: {
        id: true,
        startsAt: true,
        status: true,
        message: true,
        listing: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(row);
  } catch (e) {
    console.error("[POST /api/listings/[id]/appointments]", e);
    return jsonError("Αποτυχία κράτησης ραντεβού", 503);
  }
}
