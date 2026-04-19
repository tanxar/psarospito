import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/db/prisma";
import { listingToJson } from "@/lib/listings-json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return NextResponse.json({ error: "Συνδέσου για να δεις τις αγγελίες σου" }, { status: 401 });
    }
    const rows = await prisma.listing.findMany({
      where: { ownerUserId: session.id },
      orderBy: { updatedAt: "desc" },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(
      rows.map((r) => ({
        ...listingToJson(r),
        isActive: r.isActive,
        resolvedOutcome: r.resolvedOutcome,
      }))
    );
  } catch (e) {
    console.error("[GET /api/listings/mine]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
