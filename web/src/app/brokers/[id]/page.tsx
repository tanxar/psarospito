import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Phone } from "lucide-react";

import { prisma } from "@/db/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function extractArea(addressLine: string): string | null {
  const area = addressLine.split(",")[0]?.trim();
  return area && area.length > 0 ? area : null;
}

export default async function BrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const broker = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      brokerCompanyName: true,
      brokerPhone: true,
      listingsOwned: {
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          dealType: true,
          priceEur: true,
          coverImageSrc: true,
          addressLine: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!broker || broker.role !== "BROKER") notFound();

  const listings = broker.listingsOwned;
  const total = listings.length;
  const saleCount = listings.filter((l) => l.dealType === "sale").length;
  const rentCount = total - saleCount;
  const avgPrice =
    broker.listingsOwned.length > 0
      ? Math.round(broker.listingsOwned.reduce((acc, listing) => acc + listing.priceEur, 0) / broker.listingsOwned.length)
      : 0;
  const minPrice = total > 0 ? Math.min(...listings.map((l) => l.priceEur)) : 0;
  const maxPrice = total > 0 ? Math.max(...listings.map((l) => l.priceEur)) : 0;
  const latestUpdate = listings[0]?.updatedAt ?? null;
  const heroImage = listings[0]?.coverImageSrc ?? null;
  const topAreas = Array.from(
    listings.reduce((map, listing) => {
      const area = extractArea(listing.addressLine ?? "");
      if (!area) return map;
      map.set(area, (map.get(area) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "mb-6 inline-flex h-10 items-center gap-2 rounded-xl border-border/60 bg-card px-4"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Επιστροφή στην αναζήτηση
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="relative h-[220px] sm:h-[280px]">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={broker.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Premium Broker Profile</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                {broker.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                {broker.brokerCompanyName || "Ανεξάρτητος συνεργάτης"} · Επαγγελματική εκπροσώπηση και διαχείριση
                χαρτοφυλακίου κατοικιών.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-4">
          <Card className="border-border/60 bg-card lg:col-span-3">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">Εταιρεία</p>
                <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium">
                  <Building2 className="size-4 text-muted-foreground" aria-hidden />
                  {broker.brokerCompanyName || "Ανεξάρτητος συνεργάτης"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">Τηλέφωνο</p>
                <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium">
                  <Phone className="size-4 text-muted-foreground" aria-hidden />
                  {broker.brokerPhone || "Δεν έχει δηλωθεί"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Τελευταία ενημέρωση</p>
              <p className="mt-2 text-sm font-semibold">{latestUpdate ? formatDate(latestUpdate) : "-"}</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="border-border/60 bg-card"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Σύνολο</p><p className="mt-1 text-xl font-semibold">{total}</p></CardContent></Card>
          <Card className="border-border/60 bg-card"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Ενοικίαση</p><p className="mt-1 text-xl font-semibold">{rentCount}</p></CardContent></Card>
          <Card className="border-border/60 bg-card"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Πώληση</p><p className="mt-1 text-xl font-semibold">{saleCount}</p></CardContent></Card>
          <Card className="border-border/60 bg-card"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Μέση τιμή</p><p className="mt-1 text-sm font-semibold">{avgPrice > 0 ? formatEur(avgPrice) : "-"}</p></CardContent></Card>
          <Card className="border-border/60 bg-card"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground">Εύρος τιμών</p><p className="mt-1 text-sm font-semibold">{total > 0 ? `${formatEur(minPrice)} - ${formatEur(maxPrice)}` : "-"}</p></CardContent></Card>
        </section>

        {topAreas.length > 0 ? (
          <section className="mt-5">
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Κύριες περιοχές δραστηριότητας</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topAreas.map(([area, count]) => (
                    <span key={area} className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground">
                      {area} · {count} αγγελίες
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Διαθέσιμες αγγελίες</h2>
            <span className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {total} σύνολο
            </span>
          </div>
          {total === 0 ? (
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5 text-sm text-muted-foreground">
                Δεν υπάρχουν ενεργές αγγελίες προς το παρόν.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/brokers/${broker.id}/listings/sale`}
                className={cn(buttonVariants({ variant: "default" }), "h-11 rounded-xl")}
              >
                Προς Πώληση ({saleCount})
              </Link>
              <Link
                href={`/brokers/${broker.id}/listings/rent`}
                className={cn(buttonVariants({ variant: "secondary" }), "h-11 rounded-xl border-border")}
              >
                Προς Ενοικίαση ({rentCount})
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
