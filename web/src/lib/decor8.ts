const DECOR8_ENDPOINT = "https://api.decor8.ai/generate_designs_for_room";
const DECOR8_MAX_IMAGES_PER_REQUEST = 4;

/** Generic interior — avoids asking the user for room type; works reasonably across listing photos. */
const DECOR8_DEFAULT_ROOM_TYPE = "livingroom";

/** Rotated per source image so batches feel varied without user tuning. */
const DECOR8_DESIGN_STYLES = [
  "modern",
  "scandinavian",
  "minimalist",
  "mediterranean",
  "contemporary",
  "coastal",
  "industrial",
  "classic",
  "japandi",
  "bohemian",
] as const;

type Decor8ImageInfo = {
  url?: unknown;
};

type Decor8ResponseShape = {
  info?: {
    images?: Decor8ImageInfo[];
  };
};

export type Decor8GenerateInput = {
  inputImageUrls: string[];
  variantsPerImage: number;
};

function pickRandomDesignStyle() {
  const i = Math.floor(Math.random() * DECOR8_DESIGN_STYLES.length);
  return DECOR8_DESIGN_STYLES[i]!;
}

export function isDecor8Configured() {
  return Boolean(process.env.DECOR8_API_KEY?.trim());
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function generateForSingleImage(params: {
  apiKey: string;
  inputImageUrl: string;
  variantsPerImage: number;
  roomType: string;
  designStyle: string;
}) {
  const generated: string[] = [];
  let remaining = params.variantsPerImage;

  while (remaining > 0) {
    const numImages = Math.min(DECOR8_MAX_IMAGES_PER_REQUEST, remaining);
    const res = await fetch(DECOR8_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_image_url: params.inputImageUrl,
        room_type: params.roomType,
        design_style: params.designStyle,
        num_images: numImages,
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(`Decor8 request failed (${res.status}): ${raw || "no details"}`);
    }

    const json = (await res.json().catch(() => null)) as Decor8ResponseShape | null;
    const urls =
      json?.info?.images
        ?.map((img) => normalizeImageUrl(img?.url))
        .filter((v): v is string => Boolean(v)) ?? [];

    if (urls.length === 0) {
      throw new Error("Decor8 returned no images");
    }

    generated.push(...urls.slice(0, numImages));
    remaining -= numImages;
  }

  return generated;
}

export async function generateDecor8Designs(input: Decor8GenerateInput) {
  const apiKey = process.env.DECOR8_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing DECOR8_API_KEY");
  }

  const results: string[] = [];
  for (const src of input.inputImageUrls) {
    const designStyle = pickRandomDesignStyle();
    const fromImage = await generateForSingleImage({
      apiKey,
      inputImageUrl: src,
      variantsPerImage: input.variantsPerImage,
      roomType: DECOR8_DEFAULT_ROOM_TYPE,
      designStyle,
    });
    results.push(...fromImage);
  }

  return results;
}
