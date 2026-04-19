import { NextResponse } from "next/server";

import { prisma } from "@/db/prisma";
import {
  brokerCoversListingRegion,
  inferListingServiceRegionId,
  SERVICE_REGION_LABELS,
} from "@/lib/greek-service-regions";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Δημόσια λίστα μεσιτών: φίλτρο ανά περιοχή αγγελίας + ταξινόμηση (ενεργή προώθηση → ολοκληρωμένες αγγελίες). */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const listingId = url.searchParams.get("listingId")?.trim();
    if (!listingId) {
      return jsonError("Χρειάζεται listingId", 400);
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { lat: true, lng: true },
    });
    if (!listing) {
      return jsonError("Η αγγελία δεν βρέθηκε", 404);
    }

    const listingRegion = inferListingServiceRegionId(listing.lat, listing.lng);
    const listingRegionLabel = SERVICE_REGION_LABELS[listingRegion];

    const rows = await prisma.user.findMany({
      where: {
        role: "BROKER",
        brokerOnboardingCompleted: true,
      },
      select: {
        id: true,
        name: true,
        brokerCompanyName: true,
        brokerPhone: true,
        brokerServiceRegions: true,
        brokerPromotionActiveUntil: true,
      },
    });

    const brokers = rows.filter(
      (b) => b.brokerServiceRegions.length > 0 && brokerCoversListingRegion(b.brokerServiceRegions, listingRegion)
    );

    if (brokers.length === 0) {
      return NextResponse.json({
        listingRegion,
        listingRegionLabel,
        brokers: [],
      });
    }

    const ids = brokers.map((b) => b.id);

    const grouped = await prisma.listing.groupBy({
      by: ["ownerUserId"],
      where: {
        ownerUserId: { in: ids },
        resolvedOutcome: { not: null },
      },
      _count: { _all: true },
    });

    const dealMap = new Map(grouped.map((g) => [g.ownerUserId, g._count._all]));

    const now = new Date();

    const mapped = brokers.map((b) => {
      const promoted = b.brokerPromotionActiveUntil != null && b.brokerPromotionActiveUntil > now;
      return {
        id: b.id,
        name: b.name,
        brokerCompanyName: b.brokerCompanyName,
        brokerPhone: b.brokerPhone,
        completedDeals: dealMap.get(b.id) ?? 0,
        promoted,
      };
    });

    mapped.sort((a, b) => {
      if (b.promoted !== a.promoted) return (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0);
      if (b.completedDeals !== a.completedDeals) return b.completedDeals - a.completedDeals;
      return a.name.localeCompare(b.name, "el");
    });

    return NextResponse.json({
      listingRegion,
      listingRegionLabel,
      brokers: mapped,
    });
  } catch (e) {
    console.error("[GET /api/brokers/directory]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
