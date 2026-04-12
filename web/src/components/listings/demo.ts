import type { Listing } from "./types";

export const DEMO_LISTINGS: Listing[] = [
  {
    id: "l1",
    priceEur: 980,
    title: "Koukaki · Apartment",
    subtitle: "2 bed · 68 m² · 3rd floor",
    description:
      "Φωτεινό διαμέρισμα στο Κουκάκι κοντά στο μετρό, με μπαλκόνι και άνετους χώρους. Ιδανικό για ζευγάρι ή remote work.",
    roomsCount: 2,
    sqm: 68,
    highlights: ["Near metro", "Balcony", "Bright"],
    imageSrc: "/listings/koukaki.svg",
    location: { lat: 37.9656, lng: 23.7257 },
  },
  {
    id: "l2",
    priceEur: 1250,
    title: "Pagrati · Apartment",
    subtitle: "2 bed · 82 m² · Renovated",
    description:
      "Ανακαινισμένο διαμέρισμα στο Παγκράτι με ανελκυστήρα και parking. Ήσυχος δρόμος, κοντά σε συγκοινωνίες και καφέ.",
    roomsCount: 2,
    sqm: 82,
    highlights: ["Parking", "Elevator", "Quiet street"],
    imageSrc: "/listings/pagrati.svg",
    location: { lat: 37.9689, lng: 23.744 },
  },
  {
    id: "l3",
    priceEur: 740,
    title: "Ampelokipoi · Studio",
    subtitle: "1 bed · 38 m² · Furnished",
    description:
      "Στούντιο στους Αμπελόκηπους, επιπλωμένο, κοντά σε πάρκο. Ιδανικό για φοιτητή· επιτρέπονται κατοικίδια κατόπιν συνεννόησης.",
    roomsCount: 0,
    sqm: 38,
    highlights: ["Pets ok", "Fast internet", "Close to park"],
    imageSrc: "/listings/ampelokipoi.svg",
    location: { lat: 37.9873, lng: 23.7617 },
  },
];

