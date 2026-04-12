import Link from "next/link";

const linkClass =
  "text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 dark:from-muted/15 dark:to-muted/5">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-12">
          <div className="space-y-3">
            <p className="text-base font-semibold tracking-tight text-foreground">Nestio</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Αναζήτηση ακινήτων με χάρτη και φίλτρα. Αποθήκευσε αγγελίες και επικοινώνησε με μεσίτες όταν είσαι έτοιμος.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Πλοήγηση</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className={linkClass}>
                  Αρχική
                </Link>
              </li>
              <li>
                <Link href="/saved" className={linkClass}>
                  Αποθηκευμένα
                </Link>
              </li>
              <li>
                <Link href="/account" className={linkClass}>
                  Λογαριασμός
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Για επαγγελματίες</p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/register/broker" className={linkClass}>
                  Εγγραφή μεσίτη
                </Link>
              </li>
              <li>
                <Link href="/listings/new" className={linkClass}>
                  Νέα αγγελία
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row sm:pt-7">
          <p>© {new Date().getFullYear()} Nestio · Επίδειξη</p>
          <p className="text-center sm:text-end">Δεδομένα επίδειξης — όχι πραγματικές συναλλαγές.</p>
        </div>
      </div>
    </footer>
  );
}
