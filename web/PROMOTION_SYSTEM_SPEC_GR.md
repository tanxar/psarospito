# Προώθηση Αγγελιών: Αναλυτικός Τρόπος Λειτουργίας (Ελληνικά)

## 1) Στόχος

Να μπορούν οι ιδιοκτήτες/μεσίτες να πληρώνουν για να αυξάνεται η ορατότητα των αγγελιών τους, χωρίς να χαλάει η εμπειρία του χρήστη και χωρίς να μειώνεται η αξιοπιστία της πλατφόρμας.

Βασικές αρχές:
- Διαφάνεια προς τον επισκέπτη (badge "Προωθημένη").
- Ισορροπημένο ranking (όχι 100% pay-to-win).
- Ασφαλής ενεργοποίηση μόνο μέσω webhook πληρωμών.
- Μετρήσιμη απόδοση (impressions/clicks/leads).

---

## 2) Προτεινόμενο προϊόν για MVP

### 2.1 Πακέτα προώθησης
- `Boost 3 ημέρες`
- `Boost 7 ημέρες`
- `Boost 14 ημέρες`

Κάθε πακέτο:
- Ενεργοποιεί προώθηση μόνο για την επιλεγμένη αγγελία.
- Ισχύει σε ενεργές αγγελίες (`isActive = true`).
- Έχει συγκεκριμένη ημερομηνία λήξης.

### 2.2 Τι σημαίνει "προώθηση"
- Αύξηση προτεραιότητας στα αποτελέσματα αναζήτησης.
- Προαιρετική ένταξη σε "Featured" ενότητα στην αρχική.
- Πάντα εμφανές badge "Προωθημένη" στις κάρτες.

---

## 3) Ρόλοι και δικαιώματα

Δικαίωμα αγοράς προώθησης:
- Ο κάτοχος της αγγελίας (ιδιώτης ή μεσίτης).

Περιορισμοί:
- Δεν μπορεί να αγοράσει προώθηση τρίτος χρήστης.
- Δεν μπορεί να αγοράσει προώθηση για ανενεργή ή "resolved" αγγελία.
- Αν η αγγελία απενεργοποιηθεί νωρίς, η προώθηση παγώνει/τερματίζεται (πολιτική στο κεφάλαιο 12).

---

## 4) Μοντέλο δεδομένων (προτεινόμενο)

### 4.1 Πίνακας `ListingPromotion`

Προτεινόμενα πεδία:
- `id` (uuid/string)
- `listingId` (FK -> Listing)
- `ownerUserId` (FK -> User)
- `status` (`pending`, `active`, `expired`, `cancelled`, `refunded`, `payment_failed`)
- `planCode` (`boost_3d`, `boost_7d`, `boost_14d`)
- `startsAt` (datetime)
- `endsAt` (datetime)
- `amountCents` (int)
- `currency` (string, π.χ. `EUR`)
- `provider` (π.χ. `stripe`)
- `providerCheckoutId` (string)
- `providerPaymentIntentId` (string)
- `providerEventId` (unique για idempotency webhook)
- `metadata` (json)
- `createdAt`, `updatedAt`

### 4.2 Προτεινόμενα indexes
- `(listingId, status, endsAt)`
- `(ownerUserId, createdAt DESC)`
- `(status, startsAt, endsAt)`
- `providerEventId UNIQUE` (για ασφαλές webhook replay handling)

---

## 5) Ροή πληρωμής (end-to-end)

### 5.1 Δημιουργία checkout
1. Ο χρήστης πατάει "Προώθηση αγγελίας".
2. Επιλέγει πακέτο.
3. Backend endpoint κάνει validation ownership + listing state.
4. Δημιουργείται checkout session στον provider.
5. Δημιουργείται εγγραφή `ListingPromotion` με `status = pending`.
6. Ο χρήστης ανακατευθύνεται στη σελίδα πληρωμής.

### 5.2 Επιβεβαίωση πληρωμής
1. Provider καλεί webhook endpoint.
2. Backend επαληθεύει υπογραφή webhook.
3. Ελέγχει idempotency (`providerEventId`).
4. Ενημερώνει promotion:
   - `status = active`
   - `startsAt = now`
   - `endsAt = now + διάρκεια πακέτου`
5. Επιστρέφει `200 OK`.

### 5.3 Σημαντικό
- Το frontend `success_url` δεν αρκεί.
- Η ενεργοποίηση γίνεται ΜΟΝΟ από webhook.

---

## 6) Ranking και εμφάνιση αποτελεσμάτων

## 6.1 Βασική ιδέα
Τελικό σκορ:
- `finalScore = organicScore + promotionBoost`

Όπου:
- `organicScore`: relevance, recency, ποιότητα listing, φίλτρα, τοποθεσία.
- `promotionBoost`: προσθήκη μόνο όταν promotion είναι ενεργό.

### 6.2 Κανόνες ισορροπίας (fairness)
- Max promoted ανά σελίδα (π.χ. 3 στα πρώτα 12 αποτελέσματα).
- Max συνεχόμενες promoted (π.χ. έως 2 στη σειρά).
- Diversity owner: να μην εμφανίζεται συνέχεια ο ίδιος ιδιοκτήτης.
- Αν η αγγελία δεν ταιριάζει στα φίλτρα, δεν εμφανίζεται επειδή είναι promoted.

### 6.3 Badge και διαφάνεια
- Σε listing card και detail: μικρό badge "Προωθημένη".
- Σε tooltip/λεζάντα: "Προωθημένη καταχώρηση".

---

## 7) Backend API (προτεινόμενη δομή)

### 7.1 Endpoints
- `POST /api/listings/{id}/promotions/checkout`
  - Δημιουργία checkout.
- `POST /api/payments/webhook`
  - Λήψη events από provider.
- `GET /api/listings/{id}/promotions`
  - Κατάσταση προώθησης listing (για owner).
- `GET /api/account/promotions`
  - Ιστορικό αγορών/προωθήσεων.

### 7.2 Ασφάλεια
- Auth required.
- Ownership check σε κάθε listing-specific endpoint.
- Rate limiting σε checkout endpoint.
- Idempotency key support όπου γίνεται.

---

## 8) UI/UX ροές

### 8.1 Σελίδα "Οι αγγελίες μου"
Για κάθε αγγελία:
- Button "Προώθηση".
- Αν ενεργή: "Προωθημένη - λήγει σε X ημέρες".
- Αν pending: "Πληρωμή σε εκκρεμότητα".

### 8.2 Modal/Sheet αγοράς
- Επιλογή πακέτου.
- Καθαρή τιμή + διάρκεια.
- Σύντομη περιγραφή τι κερδίζει.
- CTA "Συνέχεια στην πληρωμή".

### 8.3 Μετά την πληρωμή
- UI δείχνει "Επεξεργαζόμαστε την πληρωμή σου".
- Poll ή refetch για ενημέρωση status.

---

## 9) Καταστάσεις και edge-cases

### 9.1 Payment success αλλά webhook καθυστερεί
- Στο UI δείχνουμε "Σε επεξεργασία".
- Backend παραμένει source of truth.

### 9.2 Failed payment
- `status = payment_failed`
- Επιτρέπεται retry checkout.

### 9.3 Refund
- `status = refunded`
- Απενεργοποίηση boost από την ώρα refund.

### 9.4 Listing inactive πριν τη λήξη
Δύο επιλογές πολιτικής:
- **Απλή (MVP):** χάνεται ο υπολειπόμενος χρόνος.
- **Φιλική:** pause/resume υπό όρους.

Προτείνεται MVP: απλή πολιτική + καθαροί όροι.

---

## 10) Analytics και reporting

Για κάθε promoted listing:
- `impressions_promoted`
- `clicks_promoted`
- `ctr_promoted`
- `contacts/leads`
- `bookings` (αν υπάρχει viewing flow)

Σύγκριση:
- πριν/μετά promotion
- promoted vs non-promoted listings ίδιας κατηγορίας

Dashboard (admin):
- έσοδα ανά ημέρα/πακέτο
- conversion checkout
- top-performing plans

---

## 11) Anti-abuse / ποιότητα πλατφόρμας

- Review pipeline για listings χαμηλής ποιότητας.
- Promotion disabled σε listings που παραβιάζουν κανόνες.
- Soft limits ανά λογαριασμό (π.χ. μέγιστες ταυτόχρονες promoted).
- Logging audit trail για αλλαγές status.

---

## 12) Νομικά / κανονιστική συμμόρφωση

Υποχρεωτικά:
- Σαφής ένδειξη "Προωθημένη".
- Όροι υπηρεσίας για promoted placements.
- Πολιτική επιστροφών.
- Τιμολόγηση/παραστατικά ανά χώρα και εταιρικό setup.
- GDPR-safe αποθήκευση payment metadata (όχι πλήρη στοιχεία κάρτας).

---

## 13) Τεχνικό rollout πλάνου

### Φάση 1 (MVP)
- DB model `ListingPromotion`
- Checkout + webhook
- Boost στο ranking
- Badge "Προωθημένη"
- Basic owner status UI

### Φάση 2
- Ιστορικό πληρωμών στο account
- Admin dashboard
- A/B test boost strength

### Φάση 3
- Featured slots
- Συνδρομητικά πακέτα για επαγγελματίες
- Dynamic pricing ανά κατηγορία/ζώνη

---

## 14) Προτεινόμενες default τιμές (MVP)

- Πακέτα:
  - 3 ημέρες: 4.90 EUR
  - 7 ημέρες: 9.90 EUR
  - 14 ημέρες: 17.90 EUR
- Ranking:
  - max promoted first page: 3
  - max consecutive promoted: 2
  - owner diversity ενεργή

Σημείωση: οι τιμές είναι ενδεικτικές και πρέπει να ρυθμιστούν με βάση αγορά/ζήτηση.

---

## 15) Πότε θεωρείται επιτυχημένο

Success criteria για 30 ημέρες:
- +X% έσοδα από προωθήσεις
- +Y% CTR σε promoted
- χωρίς σημαντική πτώση ικανοποίησης χρηστών
- χωρίς αύξηση παραπόνων για "άδικη" κατάταξη

---

## 16) Σύντομη απόφαση υλοποίησης

Για το τρέχον προϊόν προτείνεται:
- **Boost διάρκειας (3/7/14 ημέρες)**,
- **Stripe checkout + webhook ενεργοποίηση**,
- **ήπιο ranking boost με safeguards**,
- **υποχρεωτικό badge "Προωθημένη"**,
- **analytics από την πρώτη μέρα**.

Αυτό δίνει γρήγορο monetization, καθαρό UX και ελεγχόμενο ρίσκο.

---

## 17) Fair Rotation όταν πολλές promoted είναι στην ίδια περιοχή

### 17.1 Πρόβλημα που λύνουμε
Αν στην ίδια περιοχή τρέχουν πολλές προωθήσεις ταυτόχρονα, δεν είναι δίκαιο να εμφανίζονται συνεχώς οι ίδιες αγγελίες.  
Θέλουμε **ισότιμη κατανομή προβολών** (impressions) μεταξύ promoted listings.

### 17.2 Επιθυμητό αποτέλεσμα
- Διαφορετικοί χρήστες βλέπουν διαφορετικό promoted υποσύνολο.
- Σε βάθος χρόνου, όλα τα promoted listings της περιοχής παίρνουν παρόμοιο exposure.
- Δεν θυσιάζεται η ποιότητα αποτελεσμάτων (διατηρείται οργανικό ranking).

### 17.3 Κανόνες fair εμφάνισης
- `PROMOTED_SLOTS_PER_PAGE = 3` (στα πρώτα 12 αποτελέσματα).
- `MAX_PROMOTED_PER_OWNER = 1` ανά σελίδα.
- `MAX_CONSECUTIVE_PROMOTED = 2` (να μην φαίνεται "γεμάτη διαφήμιση" η κορυφή).
- Όλα τα promoted listings πρέπει να περνάνε πρώτα από τα φίλτρα αναζήτησης.

### 17.4 Rotation λογική (ανά request)
1. Παίρνουμε το pool `P` των promoted listings που είναι:
   - ενεργά χρονικά (`startsAt <= now < endsAt`),
   - ενεργές αγγελίες (`isActive = true`),
   - συμβατές με query φίλτρα/περιοχή.
2. Υπολογίζουμε `fairnessScore` για κάθε listing:
   - χαμηλότερα impressions σήμερα => υψηλότερη προτεραιότητα,
   - tie-breaker με deterministic hash.
3. Παράγουμε `rotationSeed` από:
   - περιοχή + ώρα (π.χ. 15λεπτο bucket) + session/user hash.
4. Κάνουμε deterministic shuffle με βάση το `rotationSeed`.
5. Παίρνουμε πρώτα N listings (`N = promoted slots`) εφαρμόζοντας owner cap.
6. Ενσωματώνουμε τα selected promoted στις κορυφαίες θέσεις με interleave κανόνες.

### 17.5 Γιατί deterministic και όχι random κάθε φορά
- Σταθερή εμπειρία μέσα στο ίδιο session.
- Προβλέψιμη κατανομή impressions.
- Πιο εύκολη ανάλυση/έλεγχος απόδοσης.

### 17.6 Session-level ποικιλία
Για να μην βλέπει ο ίδιος χρήστης συνέχεια τα ίδια:
- κρατάμε `recentPromotedSeen` (session/local cache),
- εφαρμόζουμε μικρό cooldown (π.χ. να μην ξαναμπεί ίδιο listing για Χ requests όπου γίνεται).

### 17.7 Ψευδοκώδικας

```ts
function selectPromotedForPage(context) {
  const pool = getEligiblePromoted(context); // active + filtered + region
  if (pool.length === 0) return [];

  const fairnessRanked = pool.sort((a, b) => {
    const fa = a.impressionsToday;
    const fb = b.impressionsToday;
    if (fa !== fb) return fa - fb; // λιγότερα πρώτα
    return hash(a.id + context.seed) - hash(b.id + context.seed);
  });

  const shuffled = deterministicShuffle(fairnessRanked, context.seed);

  const out = [];
  const ownerCount = new Map<string, number>();
  for (const item of shuffled) {
    if (out.length >= PROMOTED_SLOTS_PER_PAGE) break;
    const c = ownerCount.get(item.ownerUserId) ?? 0;
    if (c >= MAX_PROMOTED_PER_OWNER) continue;
    if (context.recentSeen.has(item.listingId)) continue; // optional cooldown
    out.push(item);
    ownerCount.set(item.ownerUserId, c + 1);
  }
  return out;
}
```

### 17.8 Ενσωμάτωση με οργανικό ranking
Η τελική λίστα δεν πρέπει να είναι "μόνο promoted":
- Παράγουμε πρώτα το οργανικό top list.
- "Inject/interleave" τα promoted slots σε προκαθορισμένες θέσεις (π.χ. 2, 6, 10).
- Αν δεν υπάρχουν αρκετά promoted, μένει οργανικό αποτέλεσμα.

### 17.9 Τι υπόσχεται το προϊόν στον πελάτη
Στο checkout/όρους:
- "Αυξημένη προβολή με ισότιμη εναλλαγή μεταξύ προωθημένων αγγελιών."
- Όχι "εγγυημένη 1η θέση".

### 17.10 Μετρικές fairness που πρέπει να παρακολουθούνται
- `impressions_per_promoted_listing_per_day`
- `p95 / p50 impressions ratio` ανά περιοχή (όσο πιο κοντά στο 1, τόσο πιο δίκαιο)
- `owner_share_of_promoted_impressions` (να μη μονοπωλεί κανείς)
- CTR promoted vs non-promoted

### 17.11 Guardrails σε oversubscription περιοχών
Αν μια περιοχή έχει υπερβολική ζήτηση:
- hard cap promoted slots (σταθερό),
- πιθανή waitlist ή delayed activation window,
- optional dynamic pricing για premium hotspots.

### 17.12 Συμπέρασμα
Το fair rotation λύνει το πρόβλημα "πλήρωσαν πολλοί στην ίδια περιοχή" με τρόπο:
- δίκαιο για πληρωμένους πελάτες,
- υγιή για marketplace,
- καθαρό για τελικό χρήστη.

