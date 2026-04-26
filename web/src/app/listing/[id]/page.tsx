import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Building2, FileText, MapPin, PenLine, Sparkles } from "lucide-react";

import { prisma } from "@/db/prisma";
import { getSessionUserFromRequest } from "@/lib/auth-user";
import { ListingDescriptionExpand } from "@/components/listings/listing-description-expand";
import { ListingFavoritesNavLink } from "@/components/listings/listing-favorites-nav-link";
import { ListingHighlightsGrid } from "@/components/listings/listing-highlights-grid";
import { ListingSpecTable, type ListingSpecRow } from "@/components/listings/listing-spec-table";
import { ListingDetailMap } from "@/components/map/listing-detail-map";
import { ListingGallery } from "@/components/listings/listing-gallery";
import type { Listing } from "@/components/listings/types";
import { ListingBrokerInviteBanner } from "@/components/listings/listing-broker-invite-banner";
import { ListingBrokerOfferPanel } from "@/components/listings/listing-broker-offer-panel";
import { ListingOwnerResolvePanel } from "@/components/listings/listing-owner-resolve-panel";
import { ListingPriceOffer } from "@/components/listings/listing-price-offer";
import { ListingViewingBooking } from "@/components/listings/listing-viewing-booking";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatListedDate(d: Date) {
  return d.toLocaleDateString("el-GR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function roomsLabel(roomsCount: number) {
  if (roomsCount <= 0) return "Στούντιο";
  if (roomsCount >= 3) return "3+ υπνοδωμάτια";
  return roomsCount === 1 ? "1 υπνοδωμάτιο" : `${roomsCount} υπνοδωμάτια`;
}

/** Αν το Prisma client δεν έχει ανανεωθεί μετά το `description`, το findUnique μπορεί να μην επιστρέφει το πεδίο — διαβάζουμε απευθείας από τη στήλη. */
async function resolveListingDescription(
  id: string,
  row: { description?: string | null }
): Promise<string> {
  if (typeof row.description === "string") return row.description;
  const rows = await prisma.$queryRaw<Array<{ description: string }>>`
    SELECT description FROM "Listing" WHERE id = ${id} LIMIT 1
  `;
  return rows[0]?.description ?? "";
}

function BrokerProfileInner({
  owner,
  ownerId,
  completedListingsCount,
}: {
  owner: {
    name: string;
    role: "BROKER" | "SEEKER";
    brokerCompanyName: string | null;
    brokerPhone: string | null;
  };
  ownerId: string;
  /** Αγγελίες με «ενοικιάστηκε» / «πουλήθηκε» — υπολογίζεται από τη βάση */
  completedListingsCount?: number;
}) {
  const initial = owner.name.trim().charAt(0).toUpperCase() || "?";
  const isBroker = owner.role === "BROKER";
  const roleLabel = isBroker ? "Μεσίτης" : "Ιδιώτης";

  const completedLabel =
    completedListingsCount === 1
      ? "1 ολοκληρωμένη αγγελία"
      : `${completedListingsCount} ολοκληρωμένες αγγελίες`;

  return (
    <>
      <div className="flex items-center">
        <span className="text-sm font-semibold tracking-tight text-foreground">{roleLabel}</span>
      </div>
      <div className="mt-5 flex gap-4 sm:mt-6 sm:gap-5">
        <div
          className="flex size-[3.35rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/22 to-primary/[0.07] text-base font-semibold text-primary shadow-sm ring-1 ring-primary/22 sm:size-14 sm:text-lg"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <Link
            href={isBroker ? `/brokers/${ownerId}` : "#"}
            className={cn(
              "text-[1.06rem] font-semibold leading-snug tracking-tight sm:text-lg",
              isBroker
                ? "text-foreground underline-offset-4 hover:text-primary hover:underline"
                : "pointer-events-none text-foreground"
            )}
            aria-disabled={!isBroker}
            tabIndex={isBroker ? undefined : -1}
          >
            {owner.name}
          </Link>
          {isBroker && owner.brokerCompanyName ? (
            <p className="flex items-start gap-2 rounded-xl border border-border/35 bg-muted/35 py-2 pl-2.5 pr-2.5 text-[13px] leading-snug text-muted-foreground dark:bg-muted/20">
              <Building2 className="mt-0.5 size-3.5 shrink-0 text-primary/60" aria-hidden />
              <span>{owner.brokerCompanyName}</span>
            </p>
          ) : null}
          {isBroker && completedListingsCount != null && completedListingsCount > 0 ? (
            <p className="text-[13px] leading-snug text-muted-foreground">{completedLabel}</p>
          ) : null}
          {!owner.brokerPhone ? (
            <p className="text-xs text-muted-foreground">Δεν έχει δηλωθεί τηλέφωνο.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Preview: aspect 16/9 + γκαλερί (μία εικόνα τη φορά + βέλη / κουκκίδες). */
function ListingPreviewBlock({
  gallery,
  panoramas,
  title,
}: {
  gallery: string[];
  panoramas: string[];
  title: string;
}) {
  return <ListingGallery images={gallery} panoramas={panoramas} alt={title} />;
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const bi = sp.brokerInvite;
  const brokerInviteOn = bi === "1" || (Array.isArray(bi) && bi[0] === "1");
  const session = await getSessionUserFromRequest();
  const row = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      panoramas: { orderBy: { sortOrder: "asc" } },
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
          brokerCompanyName: true,
          brokerPhone: true,
        },
      },
    },
  });

  /** Ανενεργές αγγελίες (π.χ. μετά από πώληση/ενοικίαση): μόνο ο ιδιοκτήτης τις βλέπει δημόσια σελίδα. */
  let listing = row;
  if (row && !row.isActive) {
    const isOwner = session != null && row.ownerUserId != null && session.id === row.ownerUserId;
    listing = isOwner ? row : null;
  }

  const descriptionText = listing ? await resolveListingDescription(listing.id, listing) : "";

  let brokerCompletedListingsCount: number | undefined;
  if (listing?.ownerUserId) {
    brokerCompletedListingsCount = await prisma.listing.count({
      where: {
        ownerUserId: listing.ownerUserId,
        resolvedOutcome: { not: null },
      },
    });
  }

  const highlights = listing && Array.isArray(listing.highlights) ? (listing.highlights as string[]) : [];
  const gallery = listing ? [listing.coverImageSrc, ...listing.images.map((i) => i.src)].filter(Boolean) : [];
  const panoramas = listing ? listing.panoramas.map((p) => p.src).filter(Boolean) : [];

  const listingDateMeta =
    listing &&
    listing.updatedAt.getTime() - listing.createdAt.getTime() > 86_400_000
      ? (`Δημοσίευση ${formatListedDate(listing.createdAt)} · Ενημέρωση ${formatListedDate(listing.updatedAt)}` as const)
      : listing
        ? (`Δημοσίευση ${formatListedDate(listing.createdAt)}` as const)
        : "";

  const mapListing: Listing | null = listing
    ? {
        id: listing.id,
        priceEur: listing.priceEur,
        title: listing.title,
        subtitle: listing.subtitle,
        description: descriptionText,
        roomsCount: listing.roomsCount,
        sqm: listing.sqm,
        highlights,
        imageSrc: listing.coverImageSrc,
        images: gallery,
        panoramaImages: panoramas,
        dealType: listing.dealType === "sale" ? "sale" : "rent",
        addressLine: listing.addressLine ?? "",
        locationPrecision: listing.addressVisibility === "exact" ? "exact" : "approximate",
        location: { lat: listing.lat, lng: listing.lng },
      }
    : null;

  const dealLabel = listing?.dealType === "sale" ? "Πώληση" : "Ενοικίαση";

  let specRows: ListingSpecRow[] = [];
  if (listing) {
    const pricePerSqm = listing.sqm > 0 ? Math.round(listing.priceEur / listing.sqm) : null;
    const showUpdatedRow = listing.updatedAt.getTime() - listing.createdAt.getTime() > 86_400_000;
    specRows = [
      {
        label: "Τιμή",
        value: (
          <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
            <span>{formatEur(listing.priceEur)}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {listing.dealType === "sale" ? "συνολική" : "μηνιαίο μίσθωμα"}
            </span>
          </span>
        ),
      },
      ...(pricePerSqm != null
        ? ([{ label: "Τιμή ανά τ.μ.", value: formatEur(pricePerSqm) }] satisfies ListingSpecRow[])
        : []),
      { label: "Εμβαδόν", value: `${listing.sqm} m²` },
      { label: "Δωμάτια", value: roomsLabel(listing.roomsCount) },
      { label: "Συναλλαγή", value: listing.dealType === "sale" ? "Πώληση" : "Ενοικίαση" },
      { label: "Δημοσίευση αγγελίας", value: formatShortDate(listing.createdAt) },
      ...(showUpdatedRow
        ? ([{ label: "Τελευταία ενημέρωση", value: formatShortDate(listing.updatedAt) }] satisfies ListingSpecRow[])
        : []),
      {
        label: "Κωδικός αγγελίας",
        value: (
          <span className="block break-all text-end font-mono text-[13px] font-medium tracking-tight text-foreground/85">
            {listing.id}
          </span>
        ),
      },
    ];
  }

  const showOwnerEdit = !!listing && !!listing.ownerUserId && session?.id === listing.ownerUserId;
  const sessionRole = session?.role ?? null;
  const isBrokerViewer = sessionRole === "BROKER";
  const ownerRole = listing?.owner?.role ?? null;

  const ownerPendingOffers =
    listing && showOwnerEdit && ownerRole === "SEEKER"
      ? await prisma.listingBrokerOffer.findMany({
          where: {
            listingId: listing.id,
            ownerUserId: session!.id,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            message: true,
            direction: true,
            status: true,
            createdAt: true,
            broker: {
              select: {
                id: true,
                name: true,
                brokerCompanyName: true,
                brokerPhone: true,
              },
            },
          },
        })
      : [];

  const brokerOwnOffer =
    listing && isBrokerViewer && session && listing.ownerUserId !== session.id && ownerRole === "SEEKER"
      ? await prisma.listingBrokerOffer.findFirst({
          where: {
            listingId: listing.id,
            brokerUserId: session.id,
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, direction: true, message: true, createdAt: true },
        })
      : null;

  const hasActiveOwnerBrokerRequest = ownerPendingOffers.some(
    (offer) =>
      offer.direction === "OWNER_TO_BROKER" &&
      (offer.status === "PENDING" || offer.status === "BROKER_ACCEPTED")
  );
  const activeOwnerBrokerRequest =
    ownerPendingOffers.find(
      (offer) =>
        offer.direction === "OWNER_TO_BROKER" &&
        (offer.status === "PENDING" || offer.status === "BROKER_ACCEPTED")
    ) ?? null;

  const showBrokerCoopBanner =
    showOwnerEdit &&
    listing?.owner?.role === "SEEKER" &&
    listing?.isActive === true &&
    !hasActiveOwnerBrokerRequest;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-[20%] -top-[35%] h-[min(85vh,720px)] w-[min(120vw,900px)] rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/[0.12]" />
        <div className="absolute -right-[15%] top-[10%] h-[min(60vh,520px)] w-[min(90vw,640px)] rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.08]" />
        <div className="absolute bottom-0 left-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-border/80 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-8">
        {listing ? (
          <div className="space-y-8 sm:space-y-10">
            <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "group h-10 min-h-10 w-fit shrink-0 gap-2 rounded-full border-border/60 bg-card/90 px-4 text-foreground shadow-sm ring-1 ring-black/[0.03] transition-[transform,box-shadow] hover:bg-card hover:shadow-md active:scale-[0.98] dark:bg-card/80 dark:ring-white/[0.05] sm:h-9 sm:min-h-9 sm:px-3.5"
                )}
              >
                <ArrowLeft
                  className="size-[1.125rem] shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 sm:size-4"
                  aria-hidden
                />
                <span className="hidden sm:inline">Λίστα αγγελιών</span>
                <span className="sm:hidden">Πίσω</span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                {showOwnerEdit ? (
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "inline-flex h-10 items-center gap-2 rounded-full border-border/60 bg-card/90 px-4 text-foreground shadow-sm ring-1 ring-black/[0.03] sm:h-9"
                    )}
                  >
                    <PenLine className="size-4 shrink-0" aria-hidden />
                    <span className="hidden sm:inline">Επεξεργασία</span>
                  </Link>
                ) : null}
                <ListingFavoritesNavLink listingId={listing.id} />
              </div>
            </div>

            {showBrokerCoopBanner ? (
              <Suspense fallback={null}>
                <ListingBrokerInviteBanner listingId={listing.id} />
              </Suspense>
            ) : hasActiveOwnerBrokerRequest ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.08] px-4 py-3.5 text-sm text-foreground dark:text-primary-foreground">
                <p className="font-semibold tracking-tight">
                  Εκκρεμεί ανάθεση μεσίτη για τη συγκεκριμένη αγγελία.
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {activeOwnerBrokerRequest?.status === "BROKER_ACCEPTED"
                    ? "Ο μεσίτης έχει αποδεχτεί το αίτημά σου και αναμένεται η τελική επιβεβαίωση από εσένα."
                    : "Αναμένεται απάντηση από τον επιλεγμένο μεσίτη."}{" "}
                  {activeOwnerBrokerRequest ? (
                    <Link
                      href={`/brokers/${activeOwnerBrokerRequest.broker.id}`}
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {activeOwnerBrokerRequest.broker.name}
                    </Link>
                  ) : null}
                </p>
              </div>
            ) : null}

            <article className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:items-start lg:gap-x-14 lg:gap-y-0 xl:grid-cols-[minmax(0,1fr)_min(100%,360px)] xl:gap-x-16">
              <div className="flex min-w-0 flex-col gap-8 sm:gap-10">
                <div className="relative">
                  <div
                    className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-primary/[0.14] via-transparent to-primary/[0.06] opacity-90 blur-2xl sm:-inset-5 sm:rounded-[2.25rem]"
                    aria-hidden
                  />
                  <div className="relative z-10 overflow-hidden rounded-2xl border border-border/55 bg-muted shadow-[0_28px_90px_-32px_rgba(0,48,135,0.22)] ring-1 ring-black/[0.04] dark:border-white/[0.08] dark:shadow-[0_36px_100px_-28px_rgba(0,0,0,0.75)] sm:rounded-3xl">
                    <ListingPreviewBlock gallery={gallery} panoramas={panoramas} title={listing.title} />
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border/50 bg-gradient-to-b from-card via-card to-muted/[0.18] p-6 shadow-[0_4px_24px_-8px_rgba(0,48,135,0.08)] ring-1 ring-black/[0.03] sm:p-8 dark:from-card dark:via-card dark:to-muted/10 dark:ring-white/[0.05]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-sm">
                      {dealLabel}
                    </span>
                    <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm dark:bg-background/40">
                      {listingDateMeta}
                    </span>
                  </div>

                  <h1 className="mt-5 max-w-[26ch] text-balance text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-foreground sm:mt-6 sm:text-4xl sm:leading-[1.04] lg:text-[2.5rem] lg:leading-[1.02]">
                    {listing.title}
                  </h1>
                  <p className="mt-3 max-w-prose text-pretty text-base leading-relaxed text-muted-foreground sm:text-[1.05rem] sm:leading-[1.7]">
                    {listing.subtitle}
                  </p>

                  {showOwnerEdit ? (
                    <div className="mt-6 max-w-2xl space-y-4">
                      <ListingBrokerOfferPanel
                        listingId={listing.id}
                        ownerRole={ownerRole}
                        isOwner={showOwnerEdit}
                        userRole={sessionRole}
                        userBrokerOnboardingCompleted={!!session?.brokerOnboardingCompleted}
                        ownerPendingOffers={ownerPendingOffers.map((o) => ({
                          id: o.id,
                          createdAtIso: o.createdAt.toISOString(),
                          message: o.message,
                          direction: o.direction,
                          status: o.status,
                          broker: o.broker,
                        }))}
                        brokerOffer={
                          brokerOwnOffer
                            ? {
                                id: brokerOwnOffer.id,
                                direction: brokerOwnOffer.direction,
                                status: brokerOwnOffer.status,
                                message: brokerOwnOffer.message ?? null,
                                createdAtIso: brokerOwnOffer.createdAt.toISOString(),
                              }
                            : null
                        }
                      />
                      <ListingOwnerResolvePanel
                        listingId={listing.id}
                        dealType={listing.dealType === "sale" ? "sale" : "rent"}
                        isActive={listing.isActive}
                        resolvedOutcome={listing.resolvedOutcome}
                      />
                    </div>
                  ) : null}
                  {!showOwnerEdit && sessionRole === "BROKER" && ownerRole === "SEEKER" ? (
                    <div className="mt-6 max-w-2xl">
                      <ListingBrokerOfferPanel
                        listingId={listing.id}
                        ownerRole={ownerRole}
                        isOwner={false}
                        userRole={sessionRole}
                        userBrokerOnboardingCompleted={!!session?.brokerOnboardingCompleted}
                        ownerPendingOffers={[]}
                        brokerOffer={
                          brokerOwnOffer
                            ? {
                                id: brokerOwnOffer.id,
                                direction: brokerOwnOffer.direction,
                                status: brokerOwnOffer.status,
                                message: brokerOwnOffer.message ?? null,
                                createdAtIso: brokerOwnOffer.createdAt.toISOString(),
                              }
                            : null
                        }
                      />
                    </div>
                  ) : null}

                  <dl className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
                    <div className="rounded-xl border border-border/45 bg-background/70 px-4 py-3.5 shadow-sm dark:bg-background/25">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Τιμή</dt>
                      <dd className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                        {formatEur(listing.priceEur)}
                      </dd>
                      <dd className="mt-1 text-[11px] text-muted-foreground">
                        {listing.dealType !== "sale" ? "ανά μήνα" : "συνολικά"}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/45 bg-background/70 px-4 py-3.5 shadow-sm dark:bg-background/25">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Εμβαδόν</dt>
                      <dd className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">
                        {listing.sqm}{" "}
                        <span className="text-base font-medium text-muted-foreground">m²</span>
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/45 bg-background/70 px-4 py-3.5 shadow-sm dark:bg-background/25">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Δωμάτια</dt>
                      <dd className="mt-1.5 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                        {roomsLabel(listing.roomsCount)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="min-w-0 space-y-8 sm:space-y-10">
                  {descriptionText.trim() ? (
                    <section className="rounded-[1.35rem] border border-border/50 bg-card p-6 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.025] sm:p-8 dark:border-white/[0.08] dark:bg-card/95 dark:shadow-none dark:ring-white/[0.04]">
                      <div className="grid grid-cols-[2.5rem_1fr] gap-x-3 gap-y-5 sm:grid-cols-[2.5rem_1fr]">
                        <span className="row-span-2 flex size-10 shrink-0 items-center justify-center self-start rounded-xl bg-primary/12 text-primary ring-1 ring-primary/18">
                          <FileText className="size-[19px] shrink-0" aria-hidden />
                        </span>
                        <h2 className="min-w-0 border-b border-border/35 pb-4 text-lg font-semibold tracking-tight text-foreground sm:pb-5">
                          Περιγραφή
                        </h2>
                        <div className="col-start-2 min-w-0 max-w-prose">
                          <ListingDescriptionExpand text={descriptionText.trim()} />
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className="overflow-hidden rounded-[1.35rem] border border-border/50 bg-card shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.025] dark:border-white/[0.08] dark:bg-card/95 dark:shadow-none dark:ring-white/[0.04]">
                    <header className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-border/35 px-6 py-5 sm:px-8 sm:py-6">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/18">
                        <Sparkles className="size-[19px] shrink-0" aria-hidden />
                      </span>
                      <h2 className="min-w-0 self-center text-lg font-semibold tracking-tight text-foreground">
                        Χαρακτηριστικά
                      </h2>
                    </header>
                    <ListingSpecTable
                      rows={specRows}
                      className="rounded-none border-0 bg-transparent shadow-none ring-0 sm:text-[15px]"
                    />
                    {highlights.length > 0 ? (
                      <div className="border-t border-border/40 bg-gradient-to-b from-muted/25 to-transparent px-6 py-6 sm:px-8 sm:py-7 dark:from-muted/12 dark:to-transparent">
                        <ListingHighlightsGrid items={highlights.slice(0, 24)} />
                      </div>
                    ) : null}
                  </section>
                </div>
              </div>

              <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-start">
                <div className="lg:sticky lg:top-28">
                  <div className="overflow-hidden rounded-2xl border border-border/45 bg-card shadow-[0_22px_56px_-22px_rgba(0,48,135,0.14),0_2px_8px_-2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03] dark:border-white/[0.09] dark:bg-card dark:shadow-[0_28px_64px_-26px_rgba(0,0,0,0.55)] sm:rounded-[1.35rem]">
                    <div className="relative bg-gradient-to-b from-primary/[0.07] via-card to-card px-5 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
                      <div
                        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent sm:inset-x-8"
                        aria-hidden
                      />
                      {listing.owner ? (
                        <BrokerProfileInner
                          owner={listing.owner}
                          ownerId={listing.owner.id}
                          completedListingsCount={brokerCompletedListingsCount}
                        />
                      ) : (
                        <>
                          <div className="flex items-center">
                            <span className="text-sm font-semibold tracking-tight text-foreground">Μεσίτης</span>
                          </div>
                          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                            Δεν έχει ανατεθεί υπεύθυνος για αυτή την αγγελία.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="border-t border-border/35 bg-muted/[0.22] px-5 py-5 sm:px-6 sm:py-6 dark:bg-muted/[0.12]">
                      <div className="mb-4 flex items-center">
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                          {showOwnerEdit ? "Διαχείριση αγγελίας" : "Επικοινωνία"}
                        </span>
                      </div>
                      <ListingViewingBooking
                        listingId={listing.id}
                        listingTitle={listing.title}
                        ownerUserId={listing.ownerUserId}
                        hostName={listing.owner?.name ?? null}
                        brokerPhone={listing.owner?.brokerPhone ?? null}
                      />
                      <ListingPriceOffer listingId={listing.id} listingPriceEur={listing.priceEur} ownerUserId={listing.ownerUserId} />
                    </div>

                    <div className="border-t border-border/35 px-5 py-5 sm:px-6 sm:py-6">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/18">
                          <MapPin className="size-[18px]" aria-hidden />
                        </span>
                        <div>
                          <span className="text-sm font-semibold tracking-tight text-foreground">Τοποθεσία</span>
                          {listing.addressLine ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {listing.addressLine}
                              {listing.addressVisibility === "approximate" ? " (εμφάνιση περίπου)" : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-inner dark:border-white/[0.08] dark:bg-muted/15">
                        {mapListing ? <ListingDetailMap listing={mapListing} /> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </article>
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-5">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "group inline-flex h-9 gap-2 rounded-full border-border/50 bg-card/90 px-3.5 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg"
              )}
            >
              <ArrowLeft className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden />
              Λίστα αγγελιών
            </Link>
            <Card className="overflow-hidden border-border/50 bg-card/90 shadow-2xl ring-1 ring-black/[0.05] backdrop-blur-sm dark:ring-white/[0.06]">
              <div
                className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
                aria-hidden
              />
              <CardHeader className="space-y-2 px-6 pb-0 pt-10 text-center sm:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Δεν βρέθηκε</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Η αγγελία δεν υπάρχει</h2>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-10 pt-4 text-center text-sm leading-relaxed text-muted-foreground sm:px-8">
                <p>Έλεγξε τον σύνδεσμο ή επίστρεψε στην αναζήτηση.</p>
                <p className="font-mono text-[11px] text-foreground/45">ID: {id}</p>
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "inline-flex h-11 rounded-full px-8 shadow-lg shadow-primary/25"
                  )}
                >
                  Αναζήτηση ακινήτων
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
