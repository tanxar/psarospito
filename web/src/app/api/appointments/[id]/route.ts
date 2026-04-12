import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Ο οικοδεσπότης (μεσίτης) επιβεβαιώνει ή ακυρώνει ραντεβού. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Unauthorized", 401);

    const { id } = await ctx.params;
    const appt = await prisma.viewingAppointment.findUnique({ where: { id } });
    if (!appt) return jsonError("Δεν βρέθηκε", 404);
    if (appt.hostId !== session.id) {
      return jsonError("Μόνο ο υπεύθυνος της αγγελίας μπορεί να ενημερώσει το ραντεβού", 403);
    }

    const body = (await req.json().catch(() => null)) as null | { status?: unknown };
    if (!body || (body.status !== "CONFIRMED" && body.status !== "CANCELLED")) {
      return jsonError("Άκυρη κατάσταση", 400);
    }

    const updated = await prisma.viewingAppointment.update({
      where: { id },
      data: { status: body.status },
      select: { id: true, status: true, startsAt: true, listingId: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/appointments/[id]]", e);
    return jsonError("Αποτυχία ενημέρωσης", 503);
  }
}
