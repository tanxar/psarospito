import { NextResponse } from "next/server";

import { getSessionUserFromRequest } from "@/lib/auth-user";
import { isCloudinaryConfigured, uploadListingImageToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

const MAX_FILES_PER_REQUEST = 20;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUserFromRequest();
    if (!session) return jsonError("Συνδέσου για upload φωτογραφιών", 401);
    if (session.role === "BROKER" && !session.brokerOnboardingCompleted) {
      return jsonError("Ολοκλήρωσε πρώτα το προφίλ μεσίτη", 403);
    }
    if (session.role !== "SEEKER" && session.role !== "BROKER") {
      return jsonError("Δεν επιτρέπεται μεταφόρτωση για αυτόν τον λογαριασμό", 403);
    }
    if (!isCloudinaryConfigured()) return jsonError("Λείπει το Cloudinary configuration στο περιβάλλον", 500);

    const form = await req.formData();
    const incoming = form.getAll("files");
    const files = incoming.filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return jsonError("Δεν στάλθηκαν αρχεία", 400);
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return jsonError(`Μέχρι ${MAX_FILES_PER_REQUEST} αρχεία ανά αποστολή`, 400);
    }

    const uploaded: Array<{ url: string; name: string; size: number }> = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return jsonError("Επιτρέπονται μόνο εικόνες", 400);
      }
      if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
        return jsonError("Κάθε αρχείο πρέπει να είναι έως 10MB", 400);
      }

      const result = await uploadListingImageToCloudinary(file, session.id);

      uploaded.push({
        url: result.secure_url,
        name: file.name,
        size: file.size,
      });
    }

    return NextResponse.json({ files: uploaded });
  } catch (e) {
    console.error("[POST /api/uploads/listing-images]", e);
    return jsonError("Αποτυχία μεταφόρτωσης", 503);
  }
}
