import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Συνδέσου για να δεις τις προσφορές σου" }, { status: 401 });
    }
    if (session.role !== "BROKER") {
      return NextResponse.json({ error: "Η ενότητα είναι διαθέσιμη μόνο για μεσίτες" }, { status: 403 });
    }

    const rows = await prisma.listingBrokerOffer.findMany({
      where: {
        brokerUserId: session.id,
        direction: "BROKER_TO_OWNER",
        status: "PENDING",
        listing: { isActive: true },
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
        owner: {
          select: {
            id: true,
            name: true,
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
        owner: r.owner,
      }))
    );
  } catch (e) {
    console.error("[GET /api/brokers/sent-offers]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
