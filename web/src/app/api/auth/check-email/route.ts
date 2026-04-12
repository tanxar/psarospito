import { NextResponse } from "next/server";

import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { prisma } from "@/db/prisma";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns whether an account exists for this email (used for email-first auth flow). */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | { email?: unknown };
    if (!body || typeof body.email !== "string") {
      return jsonError("Μη έγκυρο αίτημα", 400);
    }
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return jsonError("Μη έγκυρο email", 400);
    }

    const row = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return NextResponse.json({ exists: Boolean(row) });
  } catch (e) {
    console.error("[POST /api/auth/check-email]", e);
    return jsonError("Αποτυχία ελέγχου", 500);
  }
}
