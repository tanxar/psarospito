import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Συνδέσου για να δεις τις προσφορές" }, { status: 401 });
    }

    const rows = await prisma.listingPriceOffer.findMany({
      where: {
        ownerUserId: session.id,
        listing: {
          ownerUserId: session.id,
          isActive: true,
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountEur: true,
        basePriceEur: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
        seeker: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        amountEur: r.amountEur,
        basePriceEur: r.basePriceEur,
        createdAt: r.createdAt.toISOString(),
        listing: r.listing,
        seeker: r.seeker,
      }))
    );
  } catch (e) {
    console.error("[GET /api/listings/incoming-price-offers]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
