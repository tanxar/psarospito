import { prisma } from "../src/db/prisma";
import { hashPassword } from "../src/lib/auth-password";
import { LISTINGS } from "../src/data/listings";
import type { Listing } from "../src/components/listings/types";

const gallery = [
  "/listings/photos/apt1.jpg",
  "/listings/photos/apt2.jpg",
  "/listings/photos/apt3.jpg",
  "/listings/photos/apt4.jpg",
  "/listings/photos/apt5.jpg",
  "/listings/photos/apt6.jpg",
] as const;

const panoramaGallery = [
  "/listings/photos/apt1.jpg",
  "/listings/photos/apt2.jpg",
] as const;

const BROKER_SEEDS = [
  {
    email: "seed.nikos@nestio.demo",
    name: "Νίκος Παπαδόπουλος",
    brokerCompanyName: "Κέντρο Ακινήτων Αθήνα",
    brokerPhone: "+30 210 5550101",
  },
  {
    email: "seed.maria@nestio.demo",
    name: "Μαρία Αλεξίου",
    brokerCompanyName: "Metro Properties",
    brokerPhone: "+30 210 5550102",
  },
  {
    email: "seed.kostas@nestio.demo",
    name: "Κώστας Γεωργίου",
    brokerCompanyName: "Nexus Realty",
    brokerPhone: "+30 210 5550103",
  },
  {
    email: "seed.eleni@nestio.demo",
    name: "Ελένη Δημητρίου",
    brokerCompanyName: "Coastal Homes Athens",
    brokerPhone: "+30 210 5550104",
  },
] as const;

/** Ευρετηρίαση ανά broker seed για φίλτρο περιοχής στον κατάλογο */
const SEED_BROKER_REGIONS: readonly (readonly string[])[] = [
  ["athens_metro"],
  ["thessaloniki_metro"],
  ["athens_metro"],
  ["thessaloniki_metro"],
];

const PROMOTED_BROKER_EMAIL = "seed.nikos@nestio.demo";
const SEEKER_SEED = {
  email: "seed.private@nestio.demo",
  name: "Ιδιώτης Demo",
} as const;

const HIGHLIGHT_POOL = [
  "Κοντά στο μετρό",
  "Κοντά στο τραμ",
  "Μπαλκόνι",
  "Πάρκινγκ",
  "Ασανσέρ",
  "Φωτεινό",
  "Ανακαινισμένο",
  "Ήσυχο δρόμο",
  "Θέα",
  "Νεόδμητο",
  "Αποθήκη",
  "Κουφώματα αλουμινίου",
  "Αυτόνομη θέρμανση",
  "Κλιματισμός",
  "Διπλά τζάμια",
  "Κατοικίδια επιτρέπονται",
  "Κοινόχρηστος κήπος",
  "Βαμμένο 2024",
  "Έξυπνο σπίτι",
  "Θερμομόνωση",
] as const;

function roomsPhrase(roomsCount: number) {
  if (roomsCount <= 0) return "Στούντιο";
  if (roomsCount >= 3) return "3+ υπνοδωμάτια";
  return roomsCount === 1 ? "1 υπνοδωμάτιο" : `${roomsCount} υπνοδωμάτια`;
}

function greekDescription(l: Listing, index: number) {
  const area =
    l.title.includes("Κουκάκι") || l.title.toLowerCase().includes("koukaki")
      ? "Κοντά σε καφετέριες και συγκοινωνίες."
      : l.title.includes("Κολωνάκι") || l.title.includes("Πλάκα")
        ? "Ήσυχο σημείο με άμεση πρόσβαση στο κέντρο."
        : "Άνετη πρόσβαση σε συγκοινωνίες και αγορά.";
  const cond = index % 3 === 0 ? "Πρόσφατη ανακαίνιση." : index % 3 === 1 ? "Άριστη κατάσταση." : "Έτοιμο για είσοδο.";
  return `${roomsPhrase(l.roomsCount)} σε ${l.sqm} m². ${cond} ${area} Ιδανικό για μόνιμη κατοικία ή επένδυση.`;
}

function greekSubtitle(l: Listing, index: number) {
  const floorHints = ["3ος όροφος", "4ος όροφος", "2ος όροφος", "υψηλό όροφο", "ισόγειο με αυλή"] as const;
  const extras = [
    "άριστη κατάσταση",
    "πλήρως επιπλωμένο",
    "άμεσα διαθέσιμο",
    "νεοανακαινισμένο",
    "ήσυχη γειτονιά",
  ] as const;
  const floor = floorHints[index % floorHints.length];
  const extra = extras[(index + 2) % extras.length];
  return `${roomsPhrase(l.roomsCount)} · ${l.sqm} m² · ${floor} · ${extra}`;
}

function richHighlights(index: number): string[] {
  const count = 7 + (index % 5);
  const out: string[] = [];
  let j = 0;
  while (out.length < count && j < count + HIGHLIGHT_POOL.length) {
    const h = HIGHLIGHT_POOL[(index * 7 + j) % HIGHLIGHT_POOL.length];
    if (!out.includes(h)) out.push(h);
    j++;
  }
  return out;
}

async function main() {
  const passwordHash = await hashPassword("seedbroker123");
  const seekerPasswordHash = await hashPassword("seedseeker123");

  for (let i = 0; i < BROKER_SEEDS.length; i++) {
    const b = BROKER_SEEDS[i]!;
    const regions = [...SEED_BROKER_REGIONS[i]!];
    await prisma.user.upsert({
      where: { email: b.email },
      create: {
        email: b.email,
        name: b.name,
        role: "BROKER",
        passwordHash,
        brokerCompanyName: b.brokerCompanyName,
        brokerPhone: b.brokerPhone,
        brokerOnboardingCompleted: true,
        brokerServiceRegions: regions,
        brokerPromotionActiveUntil:
          b.email === PROMOTED_BROKER_EMAIL ? new Date("2099-01-01T00:00:00.000Z") : null,
      },
      update: {
        name: b.name,
        role: "BROKER",
        passwordHash,
        brokerCompanyName: b.brokerCompanyName,
        brokerPhone: b.brokerPhone,
        brokerOnboardingCompleted: true,
        brokerServiceRegions: regions,
        brokerPromotionActiveUntil:
          b.email === PROMOTED_BROKER_EMAIL ? new Date("2099-01-01T00:00:00.000Z") : null,
      },
    });
  }

  const seeker = await prisma.user.upsert({
    where: { email: SEEKER_SEED.email },
    create: {
      email: SEEKER_SEED.email,
      name: SEEKER_SEED.name,
      role: "SEEKER",
      passwordHash: seekerPasswordHash,
      brokerOnboardingCompleted: false,
    },
    update: {
      name: SEEKER_SEED.name,
      role: "SEEKER",
      passwordHash: seekerPasswordHash,
      brokerOnboardingCompleted: false,
      brokerCompanyName: null,
      brokerPhone: null,
      brokerServiceRegions: [],
      brokerPromotionActiveUntil: null,
    },
  });

  const brokers = await prisma.user.findMany({
    where: { email: { in: [...BROKER_SEEDS.map((b) => b.email)] } },
  });
  const brokerByEmail = new Map(brokers.map((u) => [u.email, u] as const));
  const brokerOrder = BROKER_SEEDS.map((b) => brokerByEmail.get(b.email)).filter(
    (u): u is NonNullable<typeof u> => u != null
  );

  if (brokerOrder.length === 0) {
    throw new Error("Failed to load seed brokers");
  }

  for (const [i, l] of LISTINGS.entries()) {
    const dealType = i % 2 === 0 ? "rent" : "sale";
    const idx = Math.abs(
      Array.from(l.id).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 997, 7)
    );
    const images = Array.from({ length: 5 }, (_, k) => {
      const src = gallery[(idx + k) % gallery.length];
      return { src, sortOrder: k };
    });
    const panoramas = Array.from({ length: 2 }, (_, k) => {
      const src = panoramaGallery[(idx + k) % panoramaGallery.length];
      return { src, sortOrder: k };
    });

    const owner = i < 3 ? seeker : brokerOrder[i % brokerOrder.length]!;

    await prisma.listing.upsert({
      where: { id: l.id },
      update: {
        title: l.title,
        subtitle: greekSubtitle(l, i),
        description: l.description?.trim() || greekDescription(l, i),
        priceEur: l.priceEur,
        roomsCount: l.roomsCount,
        sqm: l.sqm,
        lat: l.location.lat,
        lng: l.location.lng,
        highlights: richHighlights(i),
        coverImageSrc: l.imageSrc,
        dealType,
        isActive: true,
        ownerUserId: owner.id,
        images: {
          deleteMany: {},
          create: images,
        },
        panoramas: {
          deleteMany: {},
          create: panoramas,
        },
      },
      create: {
        id: l.id,
        title: l.title,
        subtitle: greekSubtitle(l, i),
        description: l.description?.trim() || greekDescription(l, i),
        priceEur: l.priceEur,
        roomsCount: l.roomsCount,
        sqm: l.sqm,
        lat: l.location.lat,
        lng: l.location.lng,
        highlights: richHighlights(i),
        coverImageSrc: l.imageSrc,
        dealType,
        isActive: true,
        ownerUserId: owner.id,
        images: {
          create: images,
        },
        panoramas: {
          create: panoramas,
        },
      },
    });
  }

  console.log(`Seeded ${LISTINGS.length} listings with rich highlights & Greek subtitles.`);
  console.log(
    `Brokers (${brokerOrder.length}): ${brokerOrder.map((u) => u.email).join(", ")} — login password: seedbroker123`
  );
  console.log(`Seeker: ${seeker.email} — login password: seedseeker123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
