import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/db/prisma";
import { listingToJson } from "@/lib/listings-json";
import {
  buildPrismaListingsWhere,
  hasAnyPostFilter,
  listingMatchesPostFilters,
  listingsOrderBy,
  parseListingGeoBBox,
  parseListingGeoBBoxes,
  parseListingPostFilters,
} from "@/lib/listings-query";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const where = buildPrismaListingsWhere(url.searchParams);
    const orderBy = listingsOrderBy(url.searchParams);
    const post = parseListingPostFilters(url.searchParams);

    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    const multiGeo = parseListingGeoBBoxes(url.searchParams);
    const bbox = parseListingGeoBBox(url.searchParams);
    const hasGeo = multiGeo.length > 0 || bbox != null;
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    let filtered =
      hasGeo
        ? rows
        : q
          ? rows.filter((r) => {
              const hl = Array.isArray(r.highlights) ? (r.highlights as string[]).join(" ") : "";
              return `${r.title} ${r.subtitle} ${r.description ?? ""} ${hl}`.toLowerCase().includes(q);
            })
          : rows;

    if (hasAnyPostFilter(post)) {
      filtered = filtered.filter((r) => listingMatchesPostFilters(r, post));
    }

    const total = filtered.length;
    const pageParam = url.searchParams.get("page");
    const usePaging = pageParam != null && pageParam !== "";

    if (!usePaging) {
      return NextResponse.json(filtered.map(listingToJson));
    }

    const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
    const rawSize = Math.floor(Number(url.searchParams.get("pageSize") ?? "12"));
    const pageSize = Math.min(48, Math.max(1, Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 12));
    const start = (page - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      listings: pageRows.map(listingToJson),
      total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error("[GET /api/listings]", e);
    return jsonError("Database unavailable", 503);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return jsonError("Συνδέσου για να δημιουργήσεις αγγελία", 401);
    }
    if (session.role !== "BROKER") {
      return jsonError("Η δημοσίευση αγγελιών είναι διαθέσιμη μόνο για μεσίτες", 403);
    }
    if (!session.brokerOnboardingCompleted) {
      return jsonError("Ολοκλήρωσε πρώτα το προφίλ μεσίτη", 403);
    }

    const body = (await req.json().catch(() => null)) as
      | null
      | {
          title?: unknown;
          subtitle?: unknown;
          description?: unknown;
          priceEur?: unknown;
          roomsCount?: unknown;
          sqm?: unknown;
          lat?: unknown;
          lng?: unknown;
          highlights?: unknown;
          coverImageSrc?: unknown;
          dealType?: unknown;
          images?: unknown;
        };

    if (!body || typeof body.title !== "string" || !body.title.trim()) {
      return jsonError("Invalid title", 400);
    }

    const priceEur = Number(body.priceEur);
    const roomsCount = Number(body.roomsCount);
    const sqm = Number(body.sqm);
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!Number.isFinite(priceEur) || priceEur <= 0) return jsonError("Invalid price", 400);
    if (!Number.isFinite(roomsCount) || roomsCount < 0) return jsonError("Invalid rooms", 400);
    if (!Number.isFinite(sqm) || sqm <= 0) return jsonError("Invalid sqm", 400);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError("Invalid location", 400);

    const highlights = Array.isArray(body.highlights)
      ? body.highlights.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim())
      : [];

    const title = body.title.trim();
    const subtitle =
      typeof body.subtitle === "string" && body.subtitle.trim()
        ? body.subtitle.trim()
        : `${roomsCount === 0 ? "Studio" : `${roomsCount} bed`} · ${sqm} m²`;

    const descriptionRaw = typeof body.description === "string" ? body.description : "";
    const description = descriptionRaw.trim().slice(0, 8000);
    const coverImageSrc =
      typeof body.coverImageSrc === "string" && body.coverImageSrc.trim()
        ? body.coverImageSrc.trim()
        : "/listings/photos/apt1.jpg";

    const dealType = body.dealType === "sale" ? "sale" : "rent";

    const imageRows: { src: string; sortOrder: number }[] = [];
    if (Array.isArray(body.images)) {
      const max = 24;
      const maxLen = 2048;
      let order = 0;
      for (const x of body.images) {
        if (order >= max) break;
        if (typeof x !== "string") continue;
        const src = x.trim();
        if (!src || src.length > maxLen) continue;
        imageRows.push({ src, sortOrder: order });
        order += 1;
      }
    }

    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;

    const created = await prisma.listing.create({
      data: {
        id,
        title,
        subtitle,
        description,
        priceEur: Math.round(priceEur),
        roomsCount: Math.round(roomsCount),
        sqm: Math.round(sqm),
        lat,
        lng,
        highlights,
        coverImageSrc,
        dealType,
        isActive: true,
        ownerUserId: session.id,
        ...(imageRows.length > 0
          ? {
              images: {
                create: imageRows,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return NextResponse.json(created);
  } catch (e) {
    console.error("[POST /api/listings]", e);
    return jsonError("Could not create listing", 503);
  }
}
