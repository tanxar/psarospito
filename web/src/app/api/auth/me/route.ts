import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import {
  normalizePhoneDigits,
  validateBrokerCompanyName,
  validateBrokerPhoneDigits,
} from "@/lib/auth-validation";
import { isValidServiceRegionId } from "@/lib/greek-service-regions";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return NextResponse.json({ user: null });

    const row = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brokerOnboardingCompleted: true,
        brokerCompanyName: true,
        brokerPhone: true,
        brokerServiceRegions: true,
      },
    });

    return NextResponse.json({ user: row });
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
      | { brokerCompanyName?: unknown; brokerPhone?: unknown; brokerServiceRegions?: unknown };

    if (!body) return jsonError("Μη έγκυρο αίτημα", 400);

    const companyRaw = typeof body.brokerCompanyName === "string" ? body.brokerCompanyName : "";
    const phoneRaw = typeof body.brokerPhone === "string" ? body.brokerPhone : "";

    const companyErr = validateBrokerCompanyName(companyRaw);
    if (companyErr) return jsonError(companyErr, 400);

    const digits = normalizePhoneDigits(phoneRaw);
    const phoneErr = validateBrokerPhoneDigits(digits);
    if (phoneErr) return jsonError(phoneErr, 400);

    let brokerServiceRegions: string[] = [];
    if (Array.isArray(body.brokerServiceRegions)) {
      brokerServiceRegions = body.brokerServiceRegions
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const seen = new Set<string>();
    brokerServiceRegions = brokerServiceRegions.filter((r) => {
      if (seen.has(r)) return false;
      seen.add(r);
      return true;
    });
    for (const r of brokerServiceRegions) {
      if (!isValidServiceRegionId(r)) return jsonError("Άκυρη περιοχή εξυπηρέτησης", 400);
    }
    if (brokerServiceRegions.length === 0) {
      return jsonError("Διάλεξε τουλάχιστον μία περιοχή εξυπηρέτησης", 400);
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        brokerCompanyName: companyRaw.trim(),
        brokerPhone: digits,
        brokerServiceRegions,
        brokerOnboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brokerOnboardingCompleted: true,
        brokerCompanyName: true,
        brokerPhone: true,
        brokerServiceRegions: true,
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[PATCH /api/auth/me]", e);
    return jsonError("Αποτυχία ενημέρωσης", 500);
  }
}
