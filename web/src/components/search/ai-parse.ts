import type { Filters } from "@/components/listings/types";

function parseFirstInt(s: string) {
  const m = s.match(/(\d{1,4})/);
  return m ? Number(m[1]) : undefined;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replaceAll("€", " eur ")
    .replaceAll("τμ", " m2 ")
    .replaceAll("τ.μ.", " m2 ")
    .replaceAll("τ.μ", " m2 ");
}

export function parseAiQueryToFilters(rawQuery: string): {
  filters: Filters;
  applied: string[];
} {
  const q = normalize(rawQuery);
  const applied: string[] = [];
  const filters: Filters = {};

  // price: "under 1000", "μέχρι 900", "max 1200", "κάτω από 850"
  const priceMatch =
    q.match(/(?:under|max|up to|<=)\s*(\d{2,5})/) ??
    q.match(/(?:μέχρι|εως|έως|max)\s*(\d{2,5})/) ??
    q.match(/(?:κάτω από|κατω απο)\s*(\d{2,5})/);
  if (priceMatch) {
    const v = Number(priceMatch[1]);
    if (Number.isFinite(v)) {
      filters.priceMaxEur = v;
      applied.push(`max €${v}`);
    }
  }

  // rooms: "studio", "1 bedroom", "2 bed", "3+"
  if (q.includes("studio") || q.includes("γκαρσον") || q.includes("garson")) {
    filters.rooms = "studio";
    applied.push("studio");
  } else {
    const roomsMatch = q.match(/(\d)\s*(?:bed|bedroom|br|rooms?|δωμ)/);
    if (roomsMatch) {
      const n = Number(roomsMatch[1]);
      if (n >= 3) {
        filters.rooms = "3+";
        applied.push("3+ rooms");
      } else if (n === 2) {
        filters.rooms = "2";
        applied.push("2 rooms");
      } else if (n === 1) {
        filters.rooms = "1";
        applied.push("1 room");
      }
    }
  }

  // size: "70 m2", ">= 60 m2", "πάνω από 50 τμ"
  const sqmMatch =
    q.match(/(?:>=|at least|over|more than)\s*(\d{2,3})\s*(?:m2|sqm)/) ??
    q.match(/(?:πάνω από|πανω απο|τουλάχιστον|τουλαχιστον)\s*(\d{2,3})\s*(?:m2|sqm)/) ??
    q.match(/(\d{2,3})\s*(?:m2|sqm)/);
  if (sqmMatch) {
    const v = Number(sqmMatch[1]);
    if (Number.isFinite(v)) {
      filters.sqmMin = v;
      applied.push(`≥${v} m²`);
    }
  }

  // features
  if (q.includes("parking") || q.includes("πάρκινγκ") || q.includes("parking")) {
    filters.parking = true;
    applied.push("parking");
  }
  if (q.includes("balcony") || q.includes("μπαλκ") || q.includes("βεράν")) {
    filters.balcony = true;
    applied.push("balcony");
  }
  if (q.includes("pets") || q.includes("κατοικ") || q.includes("pet")) {
    filters.pets = true;
    applied.push("pets ok");
  }

  if (q.includes("elevator") || q.includes("ασανσ") || q.includes("lift")) {
    filters.elevator = true;
    applied.push("elevator");
  }
  if (q.includes("renovated") || q.includes("ανακαιν") || q.includes("renov")) {
    filters.renovated = true;
    applied.push("renovated");
  }
  if (q.includes("bright") || q.includes("φωτειν") || q.includes("sunny")) {
    filters.bright = true;
    applied.push("bright");
  }

  if (q.includes("metro") || q.includes("μετρο") || q.includes("μετρό")) {
    filters.nearMetro = true;
    applied.push("near metro");
  }
  if (q.includes("tram") || q.includes("τραμ")) {
    filters.nearTram = true;
    applied.push("near tram");
  }

  // if query is only numbers etc, keep it as free text; caller decides
  void parseFirstInt;

  return { filters, applied };
}

