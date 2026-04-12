import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth-cookie";
import { signSessionToken } from "@/lib/auth-jwt";
import { hashPassword } from "@/lib/auth-password";
import {
  isValidEmail,
  normalizeEmail,
  normalizePhoneDigits,
  validateBrokerCompanyName,
  validateBrokerPhoneDigits,
  validateDisplayName,
  validatePassword,
} from "@/lib/auth-validation";
import { prisma } from "@/db/prisma";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | null
      | {
          email?: unknown;
          password?: unknown;
          name?: unknown;
          role?: unknown;
          brokerCompanyName?: unknown;
          brokerPhone?: unknown;
        };

    if (!body) return jsonError("Μη έγκυρο αίτημα", 400);

    const emailRaw = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nameRaw = typeof body.name === "string" ? body.name : "";
    const roleRaw = typeof body.role === "string" ? body.role.trim().toUpperCase() : "";
    const role = roleRaw === "BROKER" ? UserRole.BROKER : UserRole.SEEKER;

    const email = normalizeEmail(emailRaw);
    if (!isValidEmail(email)) return jsonError("Μη έγκυρο email", 400);

    const nameErr = validateDisplayName(nameRaw);
    if (nameErr) return jsonError(nameErr, 400);

    const passErr = validatePassword(password);
    if (passErr) return jsonError(passErr, 400);

    const passwordHash = await hashPassword(password);
    const name = nameRaw.trim();

    let brokerCompanyName: string | undefined;
    let brokerPhoneDigits: string | undefined;
    let brokerOnboardingCompleted = false;

    if (role === UserRole.BROKER) {
      const companyRaw = typeof body.brokerCompanyName === "string" ? body.brokerCompanyName : "";
      const phoneRaw = typeof body.brokerPhone === "string" ? body.brokerPhone : "";
      const companyErr = validateBrokerCompanyName(companyRaw);
      if (companyErr) return jsonError(companyErr, 400);
      brokerPhoneDigits = normalizePhoneDigits(phoneRaw);
      const phoneErr = validateBrokerPhoneDigits(brokerPhoneDigits);
      if (phoneErr) return jsonError(phoneErr, 400);
      brokerCompanyName = companyRaw.trim();
      brokerOnboardingCompleted = true;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        ...(brokerCompanyName != null && brokerPhoneDigits != null
          ? {
              brokerCompanyName,
              brokerPhone: brokerPhoneDigits,
              brokerOnboardingCompleted,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brokerOnboardingCompleted: true,
      },
    });

    const token = await signSessionToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(60 * 60 * 24 * 7));

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError("Υπάρχει ήδη λογαριασμός με αυτό το email", 409);
    }
    console.error("[POST /api/auth/register]", e);
    return jsonError("Αποτυχία εγγραφής", 500);
  }
}
