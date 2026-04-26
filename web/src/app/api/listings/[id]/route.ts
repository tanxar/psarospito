import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import { prisma } from "@/db/prisma";
import { generateDecor8Designs, isDecor8Configured } from "@/lib/decor8";
import { listingToJson } from "@/lib/listings-json";

export const dynamic = "force-dynamic";
const MAX_LISTING_IMAGES = 300;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseImageList(value: unknown, maxLen = 2048) {
  if (!Array.isArray(value)) return [];
  const list: string[] = [];
  for (const x of value) {
    if (typeof x !== "string") continue;
    const src = x.trim();
    if (!src || src.length > maxLen) continue;
    list.push(src);
  }
  return list;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const session = await getSessionUserFromRequest();

    const row = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        panoramas: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = session != null && session.id === row.ownerUserId;
    if (!row.isActive && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(listingToJson(row));
  } catch (e) {
    console.error("[GET /api/listings/[id]]", e);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) {
      return jsonError("Συνδέσου για να επεξεργαστείς αγγελία", 401);
    }
    const { id } = await ctx.params;
    if (!id) {
      return jsonError("Missing id", 400);
    }

    const existing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        panoramas: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!existing) {
      return jsonError("Not found", 404);
    }
    if (existing.ownerUserId && existing.ownerUserId !== session.id) {
      return jsonError("Δεν έχεις πρόσβαση σε αυτή την αγγελία", 403);
    }
    const isOwner = existing.ownerUserId === session.id;
    if (!existing.isActive && !isOwner) {
      return jsonError("Not found", 404);
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
          sourceImages?: unknown;
          panoramaImages?: unknown;
          generateAiRedesigns?: unknown;
          aiVariantsPerImage?: unknown;
          addressLine?: unknown;
          addressVisibility?: unknown;
        };

    if (!body) {
      return jsonError("Invalid JSON body", 400);
    }

    const data: {
      title?: string;
      subtitle?: string;
      description?: string;
      priceEur?: number;
      roomsCount?: number;
      sqm?: number;
      lat?: number;
      lng?: number;
      addressLine?: string;
      addressVisibility?: string;
      highlights?: string[];
      coverImageSrc?: string;
      dealType?: string;
      images?: { deleteMany: Record<string, never>; create: { src: string; sortOrder: number }[] };
      panoramas?: { deleteMany: Record<string, never>; create: { src: string; sortOrder: number }[] };
    } = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) return jsonError("Invalid title", 400);
      data.title = title;
    }
    if (typeof body.subtitle === "string") {
      const subtitle = body.subtitle.trim();
      if (!subtitle) return jsonError("Invalid subtitle", 400);
      data.subtitle = subtitle;
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 8000);
    }
    if (body.priceEur != null) {
      const priceEur = Number(body.priceEur);
      if (!Number.isFinite(priceEur) || priceEur <= 0) return jsonError("Invalid price", 400);
      data.priceEur = Math.round(priceEur);
    }
    if (body.roomsCount != null) {
      const roomsCount = Number(body.roomsCount);
      if (!Number.isFinite(roomsCount) || roomsCount < 0) return jsonError("Invalid rooms", 400);
      data.roomsCount = Math.round(roomsCount);
    }
    if (body.sqm != null) {
      const sqm = Number(body.sqm);
      if (!Number.isFinite(sqm) || sqm <= 0) return jsonError("Invalid sqm", 400);
      data.sqm = Math.round(sqm);
    }
    if (body.lat != null || body.lng != null) {
      const lat = body.lat != null ? Number(body.lat) : existing.lat;
      const lng = body.lng != null ? Number(body.lng) : existing.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError("Invalid location", 400);
      data.lat = lat;
      data.lng = lng;
    }
    if (typeof body.addressLine === "string") {
      data.addressLine = body.addressLine.trim().slice(0, 240);
    }
    if (body.addressVisibility != null) {
      data.addressVisibility = body.addressVisibility === "exact" ? "exact" : "approximate";
    }
    if (Array.isArray(body.highlights)) {
      data.highlights = body.highlights.filter((x) => typeof x === "string" && x.trim()).map((x) => String(x).trim());
    }
    if (typeof body.coverImageSrc === "string") {
      const cover = body.coverImageSrc.trim();
      if (!cover) return jsonError("Invalid cover image", 400);
      data.coverImageSrc = cover;
    }
    if (body.dealType != null) {
      data.dealType = body.dealType === "sale" ? "sale" : "rent";
    }

    const sourceImagesFromBody = parseImageList(body.sourceImages);
    const imagesFromBody = parseImageList(body.images);
    const hasImageInput = Array.isArray(body.sourceImages) || Array.isArray(body.images);
    const currentImages = existing.images.map((img) => img.src);
    const uploadedImages = sourceImagesFromBody.length > 0 ? sourceImagesFromBody : imagesFromBody.length > 0 ? imagesFromBody : currentImages;
    const panoramaImagesFromBody = parseImageList(body.panoramaImages);
    const hasPanoramaInput = Array.isArray(body.panoramaImages);

    const generateAiRedesigns = body.generateAiRedesigns === true;
    const aiVariantsPerImage = Number(body.aiVariantsPerImage);

    if (generateAiRedesigns && uploadedImages.length === 0) {
      return jsonError("Για AI παραλλαγές χρειάζεσαι τουλάχιστον 1 φωτογραφία", 400);
    }
    if (generateAiRedesigns && (!Number.isFinite(aiVariantsPerImage) || aiVariantsPerImage < 1 || aiVariantsPerImage > 10)) {
      return jsonError("Οι παραλλαγές ανά φωτογραφία πρέπει να είναι 1-10", 400);
    }
    if (generateAiRedesigns && !isDecor8Configured()) {
      return jsonError("Λείπει το DECOR8_API_KEY στο περιβάλλον", 400);
    }

    let generatedImages: string[] = [];
    if (generateAiRedesigns) {
      try {
        generatedImages = await generateDecor8Designs({
          inputImageUrls: uploadedImages,
          variantsPerImage: Math.floor(aiVariantsPerImage),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Decor8 failed";
        return jsonError(`Αποτυχία AI ανακαίνισης: ${message}`, 502);
      }
    }

    if (hasImageInput || generateAiRedesigns) {
      const allListingImages = [...new Set([...uploadedImages, ...generatedImages])].slice(0, MAX_LISTING_IMAGES);
      data.images = {
        deleteMany: {},
        create: allListingImages.map((src, sortOrder) => ({ src, sortOrder })),
      };
    }
    if (hasPanoramaInput) {
      const allPanoramas = [...new Set(panoramaImagesFromBody)].slice(0, MAX_LISTING_IMAGES);
      data.panoramas = {
        deleteMany: {},
        create: allPanoramas.map((src, sortOrder) => ({ src, sortOrder })),
      };
    }

    const updated = await prisma.listing.update({
      where: { id },
      data,
      select: { id: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[PATCH /api/listings/[id]]", e);
    return NextResponse.json({ error: "Could not update listing" }, { status: 503 });
  }
}
