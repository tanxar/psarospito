export type Listing = {
  id: string;
  priceEur: number;
  title: string;
  subtitle: string;
  /** Μεγάλο κείμενο · εμφανίζεται στη σελίδα αγγελίας πριν τα χαρακτηριστικά */
  description?: string;
  roomsCount: number; // 0 => studio
  sqm: number;
  highlights: string[];
  imageSrc: string;
  images?: string[];
  /** "rent" = ενοικίαση, "sale" = πώληση */
  dealType?: "rent" | "sale";
  /** Προαιρετικό — π.χ. στη σελίδα «Οι αγγελίες μου» */
  isActive?: boolean;
  /** Ολοκληρωμένη συναλλαγή — φαίνεται μόνο στον ιδιοκτήτη */
  resolvedOutcome?: "RENTED" | "SOLD" | null;
  addressLine?: string;
  locationPrecision?: "exact" | "approximate";
  location: {
    lat: number;
    lng: number;
  };
};

export type Filters = {
  priceMinEur?: number;
  priceMaxEur?: number;
  rooms?: "studio" | "1" | "2" | "3+";
  sqmMin?: number;
  sqmMax?: number;
  parking?: boolean;
  balcony?: boolean;
  pets?: boolean;
  elevator?: boolean;
  nearMetro?: boolean;
  nearTram?: boolean;
  renovated?: boolean;
  bright?: boolean;
};

