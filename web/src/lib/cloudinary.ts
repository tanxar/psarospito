import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

function ensureConfigured() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

export async function uploadListingImageToCloudinary(file: File, ownerUserId: string) {
  ensureConfigured();

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const dataUri = `data:${file.type || "image/jpeg"};base64,${base64}`;

  return cloudinary.uploader.upload(dataUri, {
    folder: `listings/${ownerUserId}`,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
}
