/**
 * Στατικές προτάσεις τοποθεσίας + bbox (WGS84) για φιλτράρισμα `lat`/`lng` στο API.
 * Το κείμενο `q` χρησιμοποιείται μόνο όταν δεν στέλνεται bbox (λοιπές πόλεις).
 */
export type GeoBBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type SelectedSearchArea = {
  id: string;
  chipLabel: string;
  bbox: GeoBBox;
};

export type LocationSuggestion = {
  id: string;
  label: string;
  q: string;
  rank?: number;
  bbox: GeoBBox;
};

function foldGreek(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ς/g, "σ");
}

function B(minLat: number, maxLat: number, minLng: number, maxLng: number): GeoBBox {
  return { minLat, maxLat, minLng, maxLng };
}

/** Προσεγγιστικό κουτί γύρω από σημείο (~3–4 km). */
function near(lat: number, lng: number, dLat = 0.02, dLng = 0.024): GeoBBox {
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

const Z_ATH_KENTRO = B(37.92, 38.035, 23.675, 23.795);
const Z_ATH_ANATOLIKA = B(37.945, 38.025, 23.715, 23.808);
const Z_ATH_VOREIA = B(38.005, 38.12, 23.745, 23.84);
const Z_ATH_DYTIKA = B(37.93, 38.025, 23.605, 23.725);
const Z_ATH_NOTIA = B(37.885, 37.98, 23.655, 23.752);
const Z_ATH_PIREAS = B(37.915, 37.975, 23.605, 23.705);
const Z_ATH_DYTIKI_ATT = B(37.88, 38.18, 23.22, 23.58);
const Z_ATH_ANATOLIKI_ATT = B(37.82, 38.22, 23.82, 24.22);

const THESS_METRO = B(40.54, 40.74, 22.86, 23.08);
const PATRAS = B(38.2, 38.32, 21.7, 21.88);
const LARISA = B(39.6, 39.68, 22.38, 22.48);
const VOLOS = B(39.34, 39.42, 22.9, 23.0);
const HERAKLION = B(35.3, 35.38, 25.1, 25.2);
const CHANIA = B(35.48, 35.56, 23.96, 24.1);
const IOANNINA = B(39.6, 39.72, 20.78, 20.92);
const KAVALA = B(40.91, 40.98, 24.36, 24.46);
const SERRES = B(41.05, 41.13, 23.5, 23.58);
const KATERINI = B(40.24, 40.32, 22.46, 22.54);
const RHODES = B(36.4, 36.5, 28.16, 28.28);
const CORFU = B(39.58, 39.66, 19.88, 19.96);
const MYTILENE = B(39.08, 39.14, 26.52, 26.58);

const RAW: LocationSuggestion[] = [
  { id: "ath-zone-kentro", label: "Αθήνα - Κέντρο • Αττική", q: "Αθήνα", rank: 0, bbox: Z_ATH_KENTRO },
  { id: "ath-zone-anatolika", label: "Αθήνα - Ανατολικά Προάστια • Αττική", q: "Αθήνα", rank: 1, bbox: Z_ATH_ANATOLIKA },
  { id: "ath-zone-voreia", label: "Αθήνα - Βόρεια Προάστια • Αττική", q: "Αθήνα", rank: 2, bbox: Z_ATH_VOREIA },
  { id: "ath-zone-dytika", label: "Αθήνα - Δυτικά Προάστια • Αττική", q: "Αθήνα", rank: 3, bbox: Z_ATH_DYTIKA },
  { id: "ath-zone-notia", label: "Αθήνα - Νότια Προάστια • Αττική", q: "Αθήνα", rank: 4, bbox: Z_ATH_NOTIA },
  { id: "ath-zone-pireas", label: "Αθήνα - Πειραιάς • Αττική", q: "Πειραιάς", rank: 5, bbox: Z_ATH_PIREAS },
  { id: "ath-zone-dytiki-attiki", label: "Αθήνα - Δυτική Αττική • Αττική", q: "Αθήνα", rank: 6, bbox: Z_ATH_DYTIKI_ATT },
  { id: "ath-zone-anatoliki-attiki", label: "Αθήνα - Ανατολική Αττική • Αττική", q: "Αθήνα", rank: 7, bbox: Z_ATH_ANATOLIKI_ATT },

  { id: "ath-m-agia-varvara", label: "Αγία Βαρβάρα • Αθήνα - Δυτικά Προάστια", q: "Αγία Βαρβάρα", rank: 50, bbox: near(37.9833, 23.6833) },
  { id: "ath-m-agia-paraskevi", label: "Αγία Παρασκευή • Αθήνα - Βόρεια Προάστια", q: "Αγία Παρασκευή", rank: 51, bbox: near(38.0125, 23.8331) },
  { id: "ath-m-agioi-anargyroi", label: "Άγιοι Ανάργυροι • Αθήνα - Δυτικά Προάστια", q: "Άγιοι Ανάργυροι", rank: 52, bbox: near(38.025, 23.72) },
  { id: "ath-m-agios-dimitrios", label: "Άγιος Δημήτριος • Αθήνα - Νότια Προάστια", q: "Άγιος Δημήτριος", rank: 53, bbox: near(37.935, 23.725) },
  { id: "ath-m-aigaleo", label: "Αιγάλεω • Αθήνα - Δυτικά Προάστια", q: "Αιγάλεω", rank: 54, bbox: near(37.995, 23.68) },
  { id: "ath-m-alimos", label: "Άλιμος • Αθήνα - Νότια Προάστια", q: "Άλιμος", rank: 55, bbox: near(37.918, 23.723) },
  { id: "ath-m-amarousio", label: "Αμαρούσιο • Αθήνα - Βόρεια Προάστια", q: "Μαρούσι", rank: 56, bbox: near(38.0562, 23.806) },
  { id: "ath-m-ampelokipoi", label: "Αμπελόκηποι • Αθήνα - Κέντρο", q: "Αμπελόκηποι", rank: 57, bbox: near(37.9873, 23.7617) },
  { id: "ath-m-anakasa", label: "Ανάκασα • Αθήνα - Κέντρο", q: "Αθήνα", rank: 58, bbox: near(37.972, 23.726) },
  { id: "ath-m-argyroupoli", label: "Αργυρούπολη • Αθήνα - Νότια Προάστια", q: "Αργυρούπολη", rank: 59, bbox: near(37.91, 23.75) },
  { id: "ath-m-artemis", label: "Αρτέμιδα • Αθήνα - Ανατολική Αττική", q: "Αρτέμιδα", rank: 60, bbox: near(37.968, 24.0) },
  { id: "ath-m-aspropyrgos", label: "Ασπρόπυργος • Αθήνα - Δυτική Αττική", q: "Ασπρόπυργος", rank: 61, bbox: near(38.055, 23.59) },
  { id: "ath-m-athina", label: "Αθήνα • Αθήνα - Κέντρο", q: "Αθήνα", rank: 62, bbox: Z_ATH_KENTRO },
  { id: "ath-m-chalandri", label: "Χαλάνδρι • Αθήνα - Βόρεια Προάστια", q: "Χαλάνδρι", rank: 63, bbox: near(38.0246, 23.7997) },
  { id: "ath-m-cholargos", label: "Χολαργός • Αθήνα - Βόρεια Προάστια", q: "Χολαργός", rank: 64, bbox: near(38.005, 23.795) },
  { id: "ath-m-dafni", label: "Δάφνη • Αθήνα - Νότια Προάστια", q: "Δάφνη", rank: 65, bbox: near(37.9499, 23.7377) },
  { id: "ath-m-elliniko", label: "Ελληνικό • Αθήνα - Νότια Προάστια", q: "Ελληνικό", rank: 66, bbox: near(37.893, 23.755) },
  { id: "ath-m-exarcheia", label: "Εξάρχεια • Αθήνα - Κέντρο", q: "Αθήνα", rank: 67, bbox: near(37.9878, 23.7346) },
  { id: "ath-m-filothei", label: "Φιλοθέη • Αθήνα - Βόρεια Προάστια", q: "Φιλοθέη", rank: 68, bbox: near(38.025, 23.795) },
  { id: "ath-m-galatsi", label: "Γαλάτσι • Αθήνα - Κέντρο", q: "Γαλάτσι", rank: 69, bbox: near(38.0179, 23.7521) },
  { id: "ath-m-glyfada", label: "Γλυφάδα • Αθήνα - Νότια Προάστια", q: "Γλυφάδα", rank: 70, bbox: near(37.862, 23.758) },
  { id: "ath-m-ilion", label: "Ίλιον • Αθήνα - Δυτικά Προάστια", q: "Ίλιον", rank: 71, bbox: near(38.035, 23.7) },
  { id: "ath-m-ilioupoli", label: "Ηλιούπολη • Αθήνα - Νότια Προάστια", q: "Ηλιούπολη", rank: 72, bbox: near(37.93, 23.753) },
  { id: "ath-m-kallithea", label: "Καλλιθέα • Αθήνα - Κέντρο", q: "Καλλιθέα", rank: 73, bbox: near(37.95, 23.7033) },
  { id: "ath-m-kamatero", label: "Καματερό • Αθήνα - Δυτικά Προάστια", q: "Καματερό", rank: 74, bbox: near(38.055, 23.71) },
  { id: "ath-m-kesariani", label: "Καισαριανή • Αθήνα - Κέντρο", q: "Καισαριανή", rank: 75, bbox: near(37.968, 23.765) },
  { id: "ath-m-kifisia", label: "Κηφισιά • Αθήνα - Βόρεια Προάστια", q: "Κηφισιά", rank: 76, bbox: near(38.074, 23.811) },
  { id: "ath-m-kolonaki", label: "Κολωνάκι • Αθήνα - Κέντρο", q: "Αθήνα", rank: 77, bbox: near(37.9789, 23.7418) },
  { id: "ath-m-koukaki", label: "Κουκάκι • Αθήνα - Κέντρο", q: "Αθήνα", rank: 78, bbox: near(37.9656, 23.7257) },
  { id: "ath-m-korydallos", label: "Κορυδαλλός • Αθήνα - Πειραιάς", q: "Κορυδαλλός", rank: 79, bbox: near(37.978, 23.647) },
  { id: "ath-m-likavitos", label: "Λυκαβηττός • Αθήνα - Κέντρο", q: "Αθήνα", rank: 80, bbox: near(37.982, 23.743) },
  { id: "ath-m-marousi", label: "Μαρούσι • Αθήνα - Βόρεια Προάστια", q: "Μαρούσι", rank: 81, bbox: near(38.0562, 23.806) },
  { id: "ath-m-melissia", label: "Μελίσσια • Αθήνα - Βόρεια Προάστια", q: "Μελίσσια", rank: 82, bbox: near(38.067, 23.833) },
  { id: "ath-m-moschato", label: "Μοσχάτο • Αθήνα - Νότια Προάστια", q: "Μοσχάτο", rank: 83, bbox: near(37.948, 23.682) },
  { id: "ath-m-nea-ionia", label: "Νέα Ιωνία • Αθήνα - Κέντρο", q: "Νέα Ιωνία", rank: 84, bbox: near(38.0356, 23.7543) },
  { id: "ath-m-nea-smirni", label: "Νέα Σμύρνη • Αθήνα - Νότια Προάστια", q: "Νέα Σμύρνη", rank: 85, bbox: near(37.945, 23.715) },
  { id: "ath-m-nea-filadelfeia", label: "Νέα Φιλαδέλφεια • Αθήνα - Κέντρο", q: "Νέα Φιλαδέλφεια", rank: 86, bbox: near(38.035, 23.738) },
  { id: "ath-m-nikaia", label: "Νίκαια • Αθήνα - Πειραιάς", q: "Νίκαια", rank: 87, bbox: near(37.965, 23.645) },
  { id: "ath-m-palaio-faliro", label: "Παλαιό Φάληρο • Αθήνα - Νότια Προάστια", q: "Παλαιό Φάληρο", rank: 88, bbox: near(37.9293, 23.701) },
  { id: "ath-m-papagou", label: "Παπάγου • Αθήνα - Κέντρο", q: "Παπάγου", rank: 89, bbox: near(37.987, 23.794) },
  { id: "ath-m-pagrati", label: "Παγκράτι • Αθήνα - Κέντρο", q: "Αθήνα", rank: 90, bbox: near(37.9689, 23.744) },
  { id: "ath-m-kypseli", label: "Κυψέλη • Αθήνα - Κέντρο", q: "Αθήνα", rank: 91, bbox: near(37.9949, 23.7427) },
  { id: "ath-m-neos-kosmos", label: "Νέος Κόσμος • Αθήνα - Νότια Προάστια", q: "Αθήνα", rank: 92, bbox: near(37.9574, 23.7287) },
  { id: "ath-m-ilisia", label: "Ιλίσια • Αθήνα - Ανατολικά Προάστια", q: "Αθήνα", rank: 93, bbox: near(37.9766, 23.761) },
  { id: "ath-m-peiraias", label: "Πειραιάς • Αθήνα - Πειραιάς", q: "Πειραιάς", rank: 94, bbox: near(37.942, 23.646) },
  { id: "ath-m-peristeri", label: "Περιστέρι • Αθήνα - Δυτικά Προάστια", q: "Περιστέρι", rank: 95, bbox: near(38.015, 23.692) },
  { id: "ath-m-petroupoli", label: "Πετρούπολη • Αθήνα - Δυτικά Προάστια", q: "Πετρούπολη", rank: 96, bbox: near(38.055, 23.685) },
  { id: "ath-m-psychiko", label: "Ψυχικό • Αθήνα - Βόρεια Προάστια", q: "Ψυχικό", rank: 97, bbox: near(38.013, 23.772) },
  { id: "ath-m-rafina", label: "Ραφήνα • Αθήνα - Ανατολική Αττική", q: "Ραφήνα", rank: 98, bbox: near(38.018, 24.006) },
  { id: "ath-m-spata", label: "Σπάτα • Αθήνα - Ανατολική Αττική", q: "Σπάτα", rank: 99, bbox: near(37.962, 23.915) },
  { id: "ath-m-voula", label: "Βούλα • Αθήνα - Νότια Προάστια", q: "Βούλα", rank: 100, bbox: near(37.842, 23.758) },
  { id: "ath-m-vouliagmeni", label: "Βουλιαγμένη • Αθήνα - Νότια Προάστια", q: "Βουλιαγμένη", rank: 101, bbox: near(37.818, 23.792) },
  { id: "ath-m-vrilissia", label: "Βριλήσσια • Αθήνα - Βόρεια Προάστια", q: "Βριλήσσια", rank: 102, bbox: near(38.033, 23.83) },
  { id: "ath-m-vyronas", label: "Βύρωνας • Αθήνα - Ανατολικά Προάστια", q: "Βύρωνας", rank: 103, bbox: near(37.9613, 23.7584) },
  { id: "ath-m-zografou", label: "Ζωγράφου • Αθήνα - Κέντρο", q: "Ζωγράφου", rank: 104, bbox: near(37.9762, 23.7736) },
  { id: "ath-m-petralona", label: "Πετράλωνα • Αθήνα - Δυτικά Προάστια", q: "Αθήνα", rank: 105, bbox: near(37.9669, 23.7097) },

  { id: "thess-dimos", label: "Θεσσαλονίκη - Δήμος • Θεσσαλονίκη", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-perif", label: "Θεσσαλονίκη - Περιφ/κοί δήμοι • Θεσσαλονίκη", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-40ek", label: "40 Εκκλησιές - Ευαγγελίστρια • Θεσσαλονίκη - Δήμος", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-agia-sofia", label: "Αγία Σοφία • Κέντρο Θεσσαλονίκης", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-ag-ath", label: "Άγιος Αθανάσιος • Θεσσαλονίκη - Υπόλ. Νομού", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-kentro", label: "Κέντρο • Θεσσαλονίκη", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-napoli", label: "Νεάπολη - Συκιές • Θεσσαλονίκη", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-pylaia", label: "Πυλαία • Θεσσαλονίκη", q: "Πυλαία", bbox: near(40.599, 22.987) },
  { id: "thess-kalamaria", label: "Καλαμαριά • Θεσσαλονίκη", q: "Καλαμαριά", bbox: near(40.582, 22.95) },
  { id: "thess-evosmos", label: "Εύοσμος • Θεσσαλονίκη", q: "Εύοσμος", bbox: near(40.67, 22.907) },
  { id: "thess-stavroupoli", label: "Σταυρούπολη • Θεσσαλονίκη", q: "Σταυρούπολη", bbox: near(40.68, 22.932) },
  { id: "thess-polichni", label: "Πολίχνη • Θεσσαλονίκη", q: "Πολίχνη", bbox: near(40.672, 22.948) },
  { id: "thess-ampelokipoi", label: "Αμπελόκηποι • Θεσσαλονίκη", q: "Αμπελόκηποι", bbox: near(40.658, 22.915) },
  { id: "thess-toumpa", label: "Τούμπα • Θεσσαλονίκη", q: "Τούμπα", bbox: near(40.618, 22.972) },
  { id: "thess-analipsi", label: "Ανάληψη • Θεσσαλονίκη", q: "Θεσσαλονίκη", bbox: THESS_METRO },
  { id: "thess-panorama", label: "Πανόραμα • Θεσσαλονίκη", q: "Πανόραμα", bbox: near(40.588, 23.031) },
  { id: "thess-oreokastro", label: "Ωραιόκαστρο • Θεσσαλονίκη", q: "Ωραιόκαστρο", bbox: near(40.73, 22.917) },
  { id: "thess-thermi", label: "Θέρμη • Θεσσαλονίκη", q: "Θέρμη", bbox: near(40.547, 23.019) },

  { id: "patra", label: "Πάτρα • Αχαΐα", q: "Πάτρα", bbox: PATRAS },
  { id: "larisa", label: "Λάρισα • Θεσσαλία", q: "Λάρισα", bbox: LARISA },
  { id: "volos", label: "Βόλος • Μαγνησία", q: "Βόλος", bbox: VOLOS },
  { id: "heraklion", label: "Ηράκλειο • Κρήτη", q: "Ηράκλειο", bbox: HERAKLION },
  { id: "chania", label: "Χανιά • Κρήτη", q: "Χανιά", bbox: CHANIA },
  { id: "ioannina", label: "Ιωάννινα • Ήπειρος", q: "Ιωάννινα", bbox: IOANNINA },
  { id: "kavala", label: "Καβάλα • Ανατολική Μακεδονία", q: "Καβάλα", bbox: KAVALA },
  { id: "serres", label: "Σέρρες • Κεντρική Μακεδονία", q: "Σέρρες", bbox: SERRES },
  { id: "katerini", label: "Κατερίνη • Πιερία", q: "Κατερίνη", bbox: KATERINI },
  { id: "rhodes", label: "Ρόδος • Δωδεκάνησα", q: "Ρόδος", bbox: RHODES },
  { id: "corfu", label: "Κέρκυρα • Ιόνια Νησιά", q: "Κέρκυρα", bbox: CORFU },
  { id: "mytilene", label: "Μυτιλήνη • Βόρειο Αιγαίο", q: "Μυτιλήνη", bbox: MYTILENE },
];

export function chipLabelFromSuggestion(s: LocationSuggestion): string {
  const p = s.label.split(" • ");
  return (p[0] ?? s.label).trim();
}

export function getLocationSuggestionById(id: string): LocationSuggestion | undefined {
  return RAW.find((r) => r.id === id);
}

function compareSuggestions(a: LocationSuggestion, b: LocationSuggestion, t: string): number {
  const fa = foldGreek(a.label);
  const fb = foldGreek(b.label);
  const ta = fa.startsWith(t) ? 0 : 1;
  const tb = fb.startsWith(t) ? 0 : 1;
  if (ta !== tb) return ta - tb;

  const ath = foldGreek("αθηνα");
  const athensTyping = ath.startsWith(t) || (t.length >= 3 && ath.includes(t));
  const hitAthens = (s: LocationSuggestion) => foldGreek(`${s.label} ${s.q}`).includes(ath);

  if (athensTyping && hitAthens(a) && hitAthens(b)) {
    const ra = a.rank ?? 500;
    const rb = b.rank ?? 500;
    if (ra !== rb) return ra - rb;
  }

  return fa.localeCompare(fb, "el");
}

export function filterLocationSuggestions(raw: string, limit = 12): LocationSuggestion[] {
  const t = foldGreek(raw.trim());
  if (!t) return [];

  const matched = RAW.filter((s) => {
    const hay = foldGreek(`${s.label} ${s.q}`);
    return hay.includes(t);
  });

  matched.sort((a, b) => compareSuggestions(a, b, t));
  return matched.slice(0, limit);
}

