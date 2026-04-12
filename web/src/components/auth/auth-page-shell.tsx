import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthPageShell({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/45 bg-card/75 p-6 shadow-sm ring-1 ring-border/25 backdrop-blur-md sm:mb-10 sm:p-8">
          <div
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/[0.06] blur-3xl"
            aria-hidden
          />

          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "relative z-[1] mb-6 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Αρχική
          </Link>

          <div className="relative z-[1]">
            <div className="mb-3 inline-flex rounded-full border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {badge}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">{title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/25">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
