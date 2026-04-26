import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Συνδέσου για να δεις τα αιτήματα" }, { status: 401 });
    }
    if (session.role !== "SEEKER") {
      return NextResponse.json({ error: "Η ενότητα είναι διαθέσιμη μόνο για ιδιώτες" }, { status: 403 });
    }

    const rows = await prisma.listingBrokerOffer.findMany({
      where: {
        ownerUserId: session.id,
        direction: "BROKER_TO_OWNER",
        status: "PENDING",
        listing: {
          ownerUserId: session.id,
          isActive: true,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
        broker: {
          select: {
            id: true,
            name: true,
            brokerCompanyName: true,
          },
        },
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
        listing: r.listing,
        broker: r.broker,
      }))
    );
  } catch (e) {
    console.error("[GET /api/listings/incoming-broker-offers]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
