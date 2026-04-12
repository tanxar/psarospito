import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: true });
  } catch (e) {
    console.error("[GET /api/health]", e);
    return NextResponse.json({ ok: false, database: false }, { status: 503 });
  }
}
