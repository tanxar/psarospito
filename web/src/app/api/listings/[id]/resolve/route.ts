import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Ο ιδιοκτήτης επισημαίνει ότι το ακίνητο ενοικιάστηκε ή πουλήθηκε — η αγγελία γίνεται ανενεργή για το κοινό. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return jsonError("Συνδέσου για να ενημερώσεις την αγγελία", 401);
    }
    const { id } = await ctx.params;
    if (!id) return jsonError("Missing id", 400);

    const body = (await req.json().catch(() => null)) as null | { outcome?: unknown };
    const raw = body?.outcome;
    if (raw !== "rented" && raw !== "sold") {
      return jsonError("Άκυρο outcome", 400);
    }

    const existing = await prisma.listing.findUnique({
      where: { id },
      select: {
        ownerUserId: true,
        dealType: true,
        isActive: true,
        resolvedOutcome: true,
      },
    });

    if (!existing) {
      return jsonError("Not found", 404);
    }
    if (!existing.ownerUserId || existing.ownerUserId !== session.id) {
      return jsonError("Δεν έχεις πρόσβαση σε αυτή την αγγελία", 403);
    }
    if (existing.resolvedOutcome) {
      return jsonError("Η αγγελία έχει ήδη επισημανθεί ως ολοκληρωμένη", 400);
    }
    if (!existing.isActive) {
      return jsonError("Η αγγελία δεν είναι ενεργή", 400);
    }

    if (existing.dealType === "rent" && raw !== "rented") {
      return jsonError("Για ενοικίαση χρησιμοποίησε «Ενοικιάστηκε»", 400);
    }
    if (existing.dealType === "sale" && raw !== "sold") {
      return jsonError("Για πώληση χρησιμοποίησε «Πουλήθηκε»", 400);
    }

    const resolvedOutcome = raw === "rented" ? ("RENTED" as const) : ("SOLD" as const);

    await prisma.listing.update({
      where: { id },
      data: {
        isActive: false,
        resolvedOutcome,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/listings/[id]/resolve]", e);
    return jsonError("Could not update listing", 503);
  }
}
