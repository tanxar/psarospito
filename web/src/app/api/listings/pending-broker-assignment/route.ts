import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Συνδέσου για να δεις τις εκκρεμότητες σου" }, { status: 401 });
    }

    const rows = await prisma.listingBrokerOffer.findMany({
      where: {
        ownerUserId: session.id,
        direction: "OWNER_TO_BROKER",
        status: { in: ["PENDING", "BROKER_ACCEPTED"] },
        listing: {
          ownerUserId: session.id,
          isActive: true,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
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
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        listing: r.listing,
        broker: r.broker,
      }))
    );
  } catch (e) {
    console.error("[GET /api/listings/pending-broker-assignment]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
