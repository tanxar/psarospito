import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BrokerListingsWithMap } from "@/components/brokers/broker-listings-with-map";
import type { Listing as ListingViewModel } from "@/components/listings/types";
import { prisma } from "@/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BrokerListingsByModePage({
  params,
}: {
  params: Promise<{ id: string; mode: string }>;
}) {
  const { id, mode } = await params;
  if (mode !== "sale" && mode !== "rent") notFound();

  const broker = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      listingsOwned: {
        where: {
          isActive: true,
          dealType: mode,
        },
        orderBy: { updatedAt: "desc" },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!broker || broker.role !== "BROKER") notFound();

  const listingCards: ListingViewModel[] = broker.listingsOwned.map((listing) => ({
    id: listing.id,
    title: listing.title,
    subtitle: listing.subtitle,
    description: listing.description ?? "",
    priceEur: listing.priceEur,
    roomsCount: listing.roomsCount,
    sqm: listing.sqm,
    highlights: Array.isArray(listing.highlights) ? (listing.highlights as string[]) : [],
    imageSrc: listing.coverImageSrc,
    images: listing.images.map((img) => img.src),
    dealType: listing.dealType === "sale" ? "sale" : "rent",
    addressLine: listing.addressLine ?? "",
    locationPrecision: listing.addressVisibility === "exact" ? "exact" : "approximate",
    location: { lat: listing.lat, lng: listing.lng },
  }));
  const brokerPhoto = listingCards[0]?.imageSrc ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,48,135,0.08),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href={`/brokers/${broker.id}`}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "mb-6 inline-flex h-10 items-center gap-2 rounded-xl border-border/60 bg-card/90 px-4 shadow-sm"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Προφίλ μεσίτη
        </Link>

        <div className="mb-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/25 sm:size-16">
                {brokerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brokerPhoto} alt={broker.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Μεσιτικό χαρτοφυλάκιο</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {broker.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "sale" ? "Ακίνητα προς πώληση" : "Ακίνητα προς ενοικίαση"}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {listingCards.length} αγγελίες
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-border/60 bg-background p-1">
            <Link
              href={`/brokers/${broker.id}/listings/sale`}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                mode === "sale" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Προς Πώληση
            </Link>
            <Link
              href={`/brokers/${broker.id}/listings/rent`}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                mode === "rent" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Προς Ενοικίαση
            </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              Φιλτράρισε αποτελέσματα και δες ταυτόχρονα αγγελίες και χάρτη.
            </p>
          </div>
        </div>

        {listingCards.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν αγγελίες σε αυτή την κατηγορία.
          </div>
        ) : (
          <BrokerListingsWithMap listings={listingCards} />
        )}
      </div>
    </div>
  );
}
