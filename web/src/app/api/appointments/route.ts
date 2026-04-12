import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

/** Ραντεβού που έχει κλείσει ο χρήστης ως ενδιαφερόμενος ή που του έχουν κλείσει ως οικοδεσπότης. */
export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [asSeeker, asHost] = await Promise.all([
      prisma.viewingAppointment.findMany({
        where: { seekerId: session.id },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          status: true,
          message: true,
          listing: { select: { id: true, title: true } },
          host: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.viewingAppointment.findMany({
        where: { hostId: session.id },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          status: true,
          message: true,
          listing: { select: { id: true, title: true } },
          seeker: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({ asSeeker, asHost });
  } catch (e) {
    console.error("[GET /api/appointments]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
