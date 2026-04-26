import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import { verifyPassword } from "@/lib/auth-password";
import { getSessionUserFromRequest } from "@/lib/auth-user";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για να συνεχίσεις", 401);

    const body = (await req.json().catch(() => null)) as null | { password?: unknown };
    if (!body || typeof body.password !== "string" || !body.password) {
      return jsonError("Συμπλήρωσε τον κωδικό πρόσβασης", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user || !user.passwordHash) {
      return jsonError("Ο λογαριασμός δεν υποστηρίζει επιβεβαίωση με κωδικό", 400);
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return jsonError("Λάθος κωδικός πρόσβασης", 401);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/auth/verify-password]", e);
    return jsonError("Αποτυχία επιβεβαίωσης", 500);
  }
}
