import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { listingToJson } from "@/lib/listings-json";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const row = await prisma.listing.findFirst({
      where: { id, isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(listingToJson(row));
  } catch (e) {
    console.error("[GET /api/listings/[id]]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
