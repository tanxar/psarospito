import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth-cookie";
import { signSessionToken } from "@/lib/auth-jwt";
import { verifyPassword } from "@/lib/auth-password";
import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { prisma } from "@/db/prisma";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | { email?: unknown; password?: unknown };

    if (!body) return jsonError("Μη έγκυρο αίτημα", 400);

    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidEmail(email) || !password) {
      return jsonError("Λάθος email ή κωδικός", 401);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        brokerOnboardingCompleted: true,
      },
    });

    if (!user) {
      return jsonError("Λάθος email ή κωδικός", 401);
    }

    if (!user.passwordHash) {
      return jsonError("Αυτός ο λογαριασμός συνδέεται με Google ή Facebook.", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return jsonError("Λάθος email ή κωδικός", 401);
    }

    const token = await signSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        brokerOnboardingCompleted: user.brokerOnboardingCompleted,
      },
    });
  } catch (e) {
    console.error("[POST /api/auth/login]", e);
    return jsonError("Αποτυχία σύνδεσης", 500);
  }
}
