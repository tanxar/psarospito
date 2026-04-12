import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import {
  normalizePhoneDigits,
  validateBrokerCompanyName,
  validateBrokerPhoneDigits,
} from "@/lib/auth-validation";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const user = await getSessionUserFromRequest();
    return NextResponse.json({ user });
  } catch (e) {
    console.error("[GET /api/auth/me]", e);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Χρειάζεσαι σύνδεση", 401);
    if (session.role !== "BROKER") return jsonError("Μη έγκυρο αίτημα", 400);

    const body = (await req.json().catch(() => null)) as
      | null
      | { brokerCompanyName?: unknown; brokerPhone?: unknown };

    if (!body) return jsonError("Μη έγκυρο αίτημα", 400);

    const companyRaw = typeof body.brokerCompanyName === "string" ? body.brokerCompanyName : "";
    const phoneRaw = typeof body.brokerPhone === "string" ? body.brokerPhone : "";

    const companyErr = validateBrokerCompanyName(companyRaw);
    if (companyErr) return jsonError(companyErr, 400);

    const digits = normalizePhoneDigits(phoneRaw);
    const phoneErr = validateBrokerPhoneDigits(digits);
    if (phoneErr) return jsonError(phoneErr, 400);

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        brokerCompanyName: companyRaw.trim(),
        brokerPhone: digits,
        brokerOnboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brokerOnboardingCompleted: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[PATCH /api/auth/me]", e);
    return jsonError("Αποτυχία ενημέρωσης", 500);
  }
}
