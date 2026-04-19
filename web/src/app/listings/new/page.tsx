"use client";

import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  Home,
  ImageIcon,
  LayoutList,
  Loader2,
  Lightbulb,
  MapPin,
  PenLine,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { useSessionUser } from "@/components/auth/use-session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ListingLocationPickerMap = dynamic(
  () => import("@/components/map/listing-location-picker-map").then((m) => m.ListingLocationPickerMap),
  {
    ssr: false,
    loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted sm:h-[260px]" aria-hidden />,
  }
);

const DEFAULT_LAT = 37.9838;
const DEFAULT_LNG = 23.7275;

const HIGHLIGHT_OPTIONS = [
  { value: "Near metro", label: "Κοντά στο μετρό" },
  { value: "Near tram", label: "Κοντά στο τραμ" },
  { value: "Balcony", label: "Μπαλκόνι" },
  { value: "Parking", label: "Πάρκινγκ" },
  { value: "Elevator", label: "Ασανσέρ" },
  { value: "Bright", label: "Φωτεινό" },
  { value: "Renovated", label: "Ανακαινισμένο" },
  { value: "Pets ok", label: "Κατοικίδια" },
] as const;

const AI_ROOM_TYPE_OPTIONS = [
  { value: "livingroom", label: "Σαλόνι" },
  { value: "bedroom", label: "Υπνοδωμάτιο" },
  { value: "kitchen", label: "Κουζίνα" },
  { value: "bathroom", label: "Μπάνιο" },
  { value: "diningroom", label: "Τραπεζαρία" },
  { value: "office", label: "Γραφείο" },
] as const;

function formatEur(amount: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? <p className="text-[13px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

function SectionShell({
  step,
  icon: Icon,
  title,
  description,
  children,
  accent = "primary",
}: {
  step: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: "primary" | "violet" | "amber";
}) {
  const accentRing =
    accent === "violet"
      ? "from-violet-500/15 to-transparent"
      : accent === "amber"
        ? "from-amber-500/12 to-transparent"
        : "from-primary/12 to-transparent";

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-border/50 bg-card/85 shadow-sm ring-1 ring-border/25 backdrop-blur-sm"
      )}
    >
      <div className={cn("h-px bg-gradient-to-r", accentRing, accent === "primary" && "via-primary/20")} />
      <div className="p-6 sm:p-8">
        <div className="mb-8 flex gap-5">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/80",
              accent === "violet" && "text-violet-600 dark:text-violet-400",
              accent === "amber" && "text-amber-600 dark:text-amber-400",
              accent === "primary" && "text-primary"
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-muted/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {step}
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            {description ? (
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </Card>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1 text-[15px] leading-snug">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

type UploadedPhoto = {
  id: string;
  src: string;
  name: string;
};

type AddressSuggestion = {
  label: string;
  lat: number;
  lng: number;
  kind?: string;
};

const RECENT_ADDRESS_KEY = "listing-address-recent-v1";

function ListingEditorPage({ listingId }: { listingId?: string } = {}) {
  const router = useRouter();
  const { user, ready } = useSessionUser();
  const isEdit = Boolean(listingId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const geocodeDebounceRef = useRef<number | null>(null);
  const geocodeAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);
  const reverseGeocodeTimerRef = useRef<number | null>(null);
  /** Όταν διαλέγει πρόταση· αλλιώς το reverse από coords θα έγραφε πάνω από την επιλεγμένη ετικέτα. */
  const skipReverseGeocodeFromSuggestionRef = useRef(false);
  const recentAddressSuggestionsRef = useRef<AddressSuggestion[]>([]);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [rooms, setRooms] = useState<string>("2");
  const [dealType, setDealType] = useState<"rent" | "sale">("rent");
  const [sqm, setSqm] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressVisibility, setAddressVisibility] = useState<"exact" | "approximate">("approximate");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSuggestionsOpen, setAddressSuggestionsOpen] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressHighlightedIndex, setAddressHighlightedIndex] = useState(-1);
  /** Αυξάνεται σε κάθε επιλογή πρότασης διεύθυνσης ώστε ο χάρτης να κάνει fly στο σημείο */
  const [addressMapFocusNonce, setAddressMapFocusNonce] = useState(0);
  const [recentAddressSuggestions, setRecentAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [selectedHighlights, setSelectedHighlights] = useState<Set<string>>(new Set());
  const [highlightsExtra, setHighlightsExtra] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState<string | null>(null);
  const [generateAiRedesigns, setGenerateAiRedesigns] = useState(false);
  const [aiVariantsPerImage, setAiVariantsPerImage] = useState("5");
  const [aiRoomType, setAiRoomType] = useState<string>("livingroom");
  const [aiDesignStyle, setAiDesignStyle] = useState("modern");
  const [aiColorScheme, setAiColorScheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editLoadState, setEditLoadState] = useState<"loading" | "ready" | "error">(() =>
    listingId ? "loading" : "ready"
  );

  const canPostListing =
    ready && user !== null && user.role === "BROKER" && user.brokerOnboardingCompleted;

  useEffect(() => {
    if (!listingId) {
      setEditLoadState("ready");
      return;
    }
    if (!canPostListing) return;

    let cancelled = false;
    setEditLoadState("loading");

    fetch(`/api/listings/${listingId}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          let msg = `Σφάλμα ${r.status}`;
          try {
            const j = (await r.json()) as { error?: unknown };
            if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        return r.json() as Promise<{
          title: string;
          subtitle: string;
          description: string;
          priceEur: number;
          roomsCount: number;
          sqm: number;
          highlights: string[];
          imageSrc: string;
          images?: string[];
          dealType?: "rent" | "sale";
          addressLine?: string;
          locationPrecision?: "exact" | "approximate";
          location: { lat: number; lng: number };
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        setTitle(data.title);
        setSubtitle(data.subtitle ?? "");
        setDescription(data.description ?? "");
        setPriceEur(String(data.priceEur));
        setDealType((data.dealType ?? "rent") === "sale" ? "sale" : "rent");
        if (data.roomsCount === 0) setRooms("studio");
        else if (data.roomsCount >= 3) setRooms("3+");
        else setRooms(String(data.roomsCount));
        setSqm(String(data.sqm));
        setLat(data.location.lat.toFixed(6));
        setLng(data.location.lng.toFixed(6));
        setAddressLine(data.addressLine ?? "");
        setAddressVisibility(data.locationPrecision === "exact" ? "exact" : "approximate");

        const knownValues = new Set<string>(HIGHLIGHT_OPTIONS.map((h) => h.value));
        const sel = new Set<string>();
        const extraHl: string[] = [];
        for (const h of data.highlights ?? []) {
          if (knownValues.has(h)) sel.add(h);
          else extraHl.push(h);
        }
        setSelectedHighlights(sel);
        setHighlightsExtra(extraHl.join(", "));

        const imageUrls = [...new Set([data.imageSrc, ...(data.images ?? [])].filter(Boolean))];
        setUploadedPhotos(
          imageUrls.map((src, i) => ({
            id: `existing-${i}-${src.slice(-24)}`,
            src,
            name: "photo",
          }))
        );

        setEditLoadState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setEditLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [listingId, canPostListing]);

  const toggleHighlight = (value: string) => {
    setSelectedHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const roomsCountForApi = useMemo(() => {
    if (rooms === "studio") return 0;
    if (rooms === "3+") return 3;
    return Number(rooms);
  }, [rooms]);

  const roomsLabel = useMemo(() => {
    if (rooms === "studio") return "Στούντιο";
    if (rooms === "3+") return "3+ δωμ.";
    return `${rooms} δωμ.`;
  }, [rooms]);

  const parsedPrice = useMemo(() => {
    const p = Number(priceEur.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(p) && p > 0 ? p : null;
  }, [priceEur]);

  const parsedSqm = useMemo(() => {
    const s = Number(sqm.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(s) && s > 0 ? Math.round(s) : null;
  }, [sqm]);

  const previewSubtitle = useMemo(() => {
    if (subtitle.trim()) return subtitle.trim();
    if (parsedSqm !== null && roomsCountForApi >= 0) {
      const bed =
        roomsCountForApi === 0 ? "Στούντιο" : roomsCountForApi === 3 ? "3+ υπν." : `${roomsCountForApi} υπν.`;
      return `${bed} · ${parsedSqm} m²`;
    }
    return null;
  }, [subtitle, parsedSqm, roomsCountForApi]);

  const previewHighlights = useMemo(() => {
    const extra = highlightsExtra
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const fromSet = [...selectedHighlights].map((v) => HIGHLIGHT_OPTIONS.find((o) => o.value === v)?.label ?? v);
    return [...new Set([...fromSet, ...extra])].slice(0, 5);
  }, [selectedHighlights, highlightsExtra]);

  const hasTitle = title.trim().length > 0;
  const hasPrice = parsedPrice !== null;
  const hasSqm = parsedSqm !== null;
  const hasHighlights = selectedHighlights.size > 0 || highlightsExtra.trim().length > 0;
  const parsedUploadedImages = useMemo(() => {
    return uploadedPhotos.map((photo) => photo.src);
  }, [uploadedPhotos]);
  const coverImageSrc = parsedUploadedImages[0] ?? "";
  const parsedAiVariants = useMemo(() => {
    const n = Number(aiVariantsPerImage);
    return Number.isFinite(n) ? Math.floor(n) : NaN;
  }, [aiVariantsPerImage]);
  const totalAiOutputs = useMemo(() => {
    if (!generateAiRedesigns || !Number.isFinite(parsedAiVariants) || parsedAiVariants <= 0) return 0;
    return parsedUploadedImages.length * parsedAiVariants;
  }, [generateAiRedesigns, parsedAiVariants, parsedUploadedImages.length]);
  const mapCenter = useMemo(() => {
    const la = lat.trim() === "" ? DEFAULT_LAT : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? DEFAULT_LNG : Number(lng.replace(",", "."));
    return {
      lat: Number.isFinite(la) ? la : DEFAULT_LAT,
      lng: Number.isFinite(ln) ? ln : DEFAULT_LNG,
    };
  }, [lat, lng]);

  /**
   * Reverse geocode με debounce — καλείται απευθείας από τον χάρτη (όχι μόνο από useEffect(lat,lng)):
   * αν το React δεν κάνει re-render επειδή τα strings lat/lng μένουν ίδια μετά το toFixed(6), το effect δεν έτρεχε ποτέ.
   */
  const scheduleReverseGeocode = useCallback((coordLat: number, coordLng: number) => {
    if (!Number.isFinite(coordLat) || !Number.isFinite(coordLng)) return;
    if (reverseGeocodeTimerRef.current != null) {
      window.clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }
    reverseGeocodeAbortRef.current?.abort();

    reverseGeocodeTimerRef.current = window.setTimeout(() => {
      reverseGeocodeTimerRef.current = null;
      if (skipReverseGeocodeFromSuggestionRef.current) {
        skipReverseGeocodeFromSuggestionRef.current = false;
        return;
      }
      const ac = new AbortController();
      reverseGeocodeAbortRef.current = ac;
      fetch(`/api/geocode/reverse?lat=${encodeURIComponent(String(coordLat))}&lng=${encodeURIComponent(String(coordLng))}`, {
        signal: ac.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const json = (await res.json().catch(() => ({}))) as { label?: string | null };
          const raw = typeof json.label === "string" ? json.label.trim() : "";
          if (raw.length > 0) setAddressLine(raw);
        })
        .catch(() => {
          /* aborted or network */
        });
    }, 380);
  }, []);

  const handleMapCenterChange = useCallback(
    (nextLat: number, nextLng: number) => {
      setLat(nextLat.toFixed(6));
      setLng(nextLng.toFixed(6));
      scheduleReverseGeocode(nextLat, nextLng);
    },
    [scheduleReverseGeocode]
  );

  /** Όταν αλλάζεις χειροκίνητα lat/lng (το χάρτης δεν καλεί onCenterChange). */
  const scheduleReverseFromLatLngFields = useCallback(() => {
    const la = lat.trim() === "" ? NaN : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? NaN : Number(lng.replace(",", "."));
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
    scheduleReverseGeocode(la, ln);
  }, [lat, lng, scheduleReverseGeocode]);
  const visibleAddressSuggestions = useMemo(() => {
    const q = addressLine.trim();
    return q.length >= 2 ? addressSuggestions : recentAddressSuggestions;
  }, [addressLine, addressSuggestions, recentAddressSuggestions]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_ADDRESS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AddressSuggestion[];
      if (!Array.isArray(parsed)) return;
      const cleaned = parsed
        .filter((x) => x && typeof x.label === "string" && Number.isFinite(x.lat) && Number.isFinite(x.lng))
        .slice(0, 5);
      setRecentAddressSuggestions(cleaned);
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    recentAddressSuggestionsRef.current = recentAddressSuggestions;
  }, [recentAddressSuggestions]);

  /** Keyboard highlight when showing «Πρόσφατες» (query < 2 chars). */
  useEffect(() => {
    const q = addressLine.trim();
    if (q.length >= 2) return;
    setAddressHighlightedIndex(recentAddressSuggestions.length > 0 ? 0 : -1);
  }, [addressLine, recentAddressSuggestions]);

  const scheduleAddressGeocode = useCallback((raw: string) => {
    if (geocodeDebounceRef.current) {
      window.clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = null;
    }
    geocodeAbortRef.current?.abort();

    const q = raw.trim();
    if (q.length < 2) {
      setAddressSuggestions([]);
      setAddressLoading(false);
      setAddressHighlightedIndex(recentAddressSuggestionsRef.current.length > 0 ? 0 : -1);
      return;
    }

    geocodeDebounceRef.current = window.setTimeout(() => {
      geocodeDebounceRef.current = null;
      const ac = new AbortController();
      geocodeAbortRef.current = ac;
      setAddressLoading(true);
      fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
        signal: ac.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const json = (await res.json().catch(() => ({ results: [] }))) as {
            results?: AddressSuggestion[];
          };
          const next = Array.isArray(json.results) ? json.results : [];
          setAddressSuggestions(next);
          setAddressHighlightedIndex(next.length > 0 ? 0 : -1);
        })
        .catch(() => {
          setAddressSuggestions([]);
          setAddressHighlightedIndex(-1);
        })
        .finally(() => {
          setAddressLoading(false);
        });
    }, 220);
  }, []);

  useEffect(() => {
    return () => {
      if (geocodeDebounceRef.current) window.clearTimeout(geocodeDebounceRef.current);
      geocodeAbortRef.current?.abort();
      if (reverseGeocodeTimerRef.current != null) window.clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeAbortRef.current?.abort();
    };
  }, []);

  function applyAddressSuggestion(s: AddressSuggestion) {
    if (geocodeDebounceRef.current) {
      window.clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = null;
    }
    geocodeAbortRef.current?.abort();
    if (reverseGeocodeTimerRef.current != null) {
      window.clearTimeout(reverseGeocodeTimerRef.current);
      reverseGeocodeTimerRef.current = null;
    }
    reverseGeocodeAbortRef.current?.abort();
    skipReverseGeocodeFromSuggestionRef.current = true;
    setAddressLoading(false);

    setAddressLine(s.label);
    setLat(s.lat.toFixed(6));
    setLng(s.lng.toFixed(6));
    setAddressMapFocusNonce((n) => n + 1);
    setAddressSuggestionsOpen(false);
    setRecentAddressSuggestions((prev) => {
      const deduped = [s, ...prev.filter((item) => item.label !== s.label)].slice(0, 5);
      try {
        window.localStorage.setItem(RECENT_ADDRESS_KEY, JSON.stringify(deduped));
      } catch {
        // ignore storage failures
      }
      return deduped;
    });
  }

  async function uploadPhotos(filesInput: FileList | File[]) {
    const files = Array.from(filesInput).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Διάλεξε αρχεία εικόνας (jpg/png/webp).");
      return;
    }

    setUploadingPhotos(true);
    setUploadingCount(files.length);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/uploads/listing-images", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        throw new Error(raw.trim() || "Αποτυχία upload φωτογραφιών");
      }

      const data = (await res.json()) as { files?: Array<{ url?: string; name?: string }> };
      const uploaded = (data.files ?? [])
        .map((file) => {
          if (!file.url) return null;
          return {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            src: file.url,
            name: file.name ?? "photo",
          } satisfies UploadedPhoto;
        })
        .filter((x): x is UploadedPhoto => x != null);

      if (uploaded.length === 0) {
        throw new Error("Δεν επιστράφηκαν έγκυρες φωτογραφίες από το upload.");
      }

      setUploadedPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.src));
        const next = [...prev];
        for (const photo of uploaded) {
          if (seen.has(photo.src)) continue;
          seen.add(photo.src);
          next.push(photo);
        }
        return next;
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Αποτυχία upload");
    } finally {
      setUploadingPhotos(false);
      setUploadingCount(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void uploadPhotos(files);
  }

  function onDropFiles(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    void uploadPhotos(files);
  }

  function removePhoto(photo: UploadedPhoto) {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  function onPhotoDragStart(photoId: string) {
    setDraggingPhotoId(photoId);
  }

  function onPhotoDragOver(e: DragEvent<HTMLDivElement>, photoId: string) {
    e.preventDefault();
    if (draggingPhotoId && draggingPhotoId !== photoId) {
      setDragOverPhotoId(photoId);
    }
  }

  function onPhotoDrop(e: DragEvent<HTMLDivElement>, targetPhotoId: string) {
    e.preventDefault();
    if (!draggingPhotoId || draggingPhotoId === targetPhotoId) {
      setDraggingPhotoId(null);
      setDragOverPhotoId(null);
      return;
    }

    setUploadedPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === draggingPhotoId);
      const to = prev.findIndex((p) => p.id === targetPhotoId);
      if (from < 0 || to < 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    setDraggingPhotoId(null);
    setDragOverPhotoId(null);
  }

  const canSubmit = useMemo(() => {
    if (isEdit && editLoadState !== "ready") return false;
    if (uploadingPhotos) return false;
    if (!title.trim()) return false;
    if (!addressLine.trim()) return false;
    const p = Number(priceEur.replace(/\s/g, "").replace(",", "."));
    const s = Number(sqm.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(p) || p <= 0) return false;
    if (!Number.isFinite(s) || s <= 0) return false;
    if (!Number.isFinite(roomsCountForApi) || roomsCountForApi < 0) return false;
    const la = lat.trim() === "" ? DEFAULT_LAT : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? DEFAULT_LNG : Number(lng.replace(",", "."));
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
    if (generateAiRedesigns) {
      if (parsedUploadedImages.length === 0) return false;
      if (!Number.isFinite(parsedAiVariants) || parsedAiVariants < 1 || parsedAiVariants > 10) return false;
      if (!aiDesignStyle.trim()) return false;
    }
    return true;
  }, [
    isEdit,
    editLoadState,
    uploadingPhotos,
    title,
    addressLine,
    priceEur,
    sqm,
    roomsCountForApi,
    lat,
    lng,
    generateAiRedesigns,
    parsedUploadedImages.length,
    parsedAiVariants,
    aiDesignStyle,
  ]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);

    const la = lat.trim() === "" ? DEFAULT_LAT : Number(lat.replace(",", "."));
    const ln = lng.trim() === "" ? DEFAULT_LNG : Number(lng.replace(",", "."));

    const extra = highlightsExtra
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const highlights = [...new Set([...selectedHighlights, ...extra])];
    const coverImageToSave = parsedUploadedImages[0];
    const sqmRounded = Math.round(Number(sqm.replace(/\s/g, "").replace(",", ".")));
    const subtitleForApi =
      subtitle.trim() ||
      `${roomsCountForApi === 0 ? "Studio" : `${roomsCountForApi} bed`} · ${sqmRounded} m²`;

    try {
      if (listingId) {
        const res = await fetch(`/api/listings/${listingId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            subtitle: subtitleForApi,
            description: description.trim(),
            priceEur: Math.round(Number(priceEur.replace(/\s/g, "").replace(",", "."))),
            roomsCount: roomsCountForApi,
            sqm: sqmRounded,
            lat: la,
            lng: ln,
            highlights,
            coverImageSrc: coverImageToSave || undefined,
            addressLine: addressLine.trim(),
            addressVisibility,
            dealType,
            sourceImages: parsedUploadedImages,
            images: parsedUploadedImages,
            generateAiRedesigns,
            aiVariantsPerImage: parsedAiVariants,
            aiRoomType,
            aiDesignStyle: aiDesignStyle.trim(),
            aiColorScheme: aiColorScheme.trim() || undefined,
          }),
        });

        if (!res.ok) {
          let msg = "Αποτυχία ενημέρωσης αγγελίας";
          const raw = await res.text().catch(() => "");
          try {
            const j = JSON.parse(raw) as { error?: unknown };
            if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          } catch {
            if (raw.trim()) msg = raw.trim();
          }
          throw new Error(msg);
        }

        router.push(`/listing/${listingId}`);
        return;
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          priceEur: Math.round(Number(priceEur.replace(/\s/g, "").replace(",", "."))),
          roomsCount: roomsCountForApi,
          sqm: sqmRounded,
          lat: la,
          lng: ln,
          highlights,
          coverImageSrc: coverImageToSave || undefined,
          addressLine: addressLine.trim(),
          addressVisibility,
          dealType,
          sourceImages: parsedUploadedImages,
          images: parsedUploadedImages,
          generateAiRedesigns,
          aiVariantsPerImage: parsedAiVariants,
          aiRoomType,
          aiDesignStyle: aiDesignStyle.trim(),
          aiColorScheme: aiColorScheme.trim() || undefined,
        }),
      });

      if (!res.ok) {
        let msg = "Αποτυχία δημιουργίας αγγελίας";
        const raw = await res.text().catch(() => "");
        try {
          const j = JSON.parse(raw) as { error?: unknown };
          if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
        } catch {
          if (raw.trim()) msg = raw.trim();
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as { id: string };
      router.push(`/listing/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setSubtitle("");
    setDescription("");
    setPriceEur("");
    setRooms("2");
    setDealType("rent");
    setSqm("");
    setLat("");
    setLng("");
    setAddressLine("");
    scheduleAddressGeocode("");
    setAddressVisibility("approximate");
    setAddressSuggestions([]);
    setAddressSuggestionsOpen(false);
    setAddressLoading(false);
    setAddressHighlightedIndex(-1);
    setSelectedHighlights(new Set());
    setHighlightsExtra("");
    setUploadedPhotos([]);
    setGenerateAiRedesigns(false);
    setAiVariantsPerImage("5");
    setAiRoomType("livingroom");
    setAiDesignStyle("modern");
    setAiColorScheme("");
    setError(null);
  }

  if (!ready) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Φόρτωση…</div>
      </div>
    );
  }

  if (isEdit && editLoadState === "loading") {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          Φόρτωση αγγελίας…
        </div>
      </div>
    );
  }

  if (isEdit && editLoadState === "error") {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
          aria-hidden
        />
        <div className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6 sm:py-20">
          <Link
            href="/listings/mine"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "mb-8 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Οι αγγελίες μου
          </Link>
          <Card className="rounded-3xl border-border/50 bg-card/90 p-8 shadow-sm ring-1 ring-border/25">
            <h1 className="text-xl font-semibold text-foreground">Δεν βρέθηκε η αγγελία</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Δεν έχεις δικαίωμα πρόσβασης ή η αγγελία αφαιρέθηκε.
            </p>
            <Link
              href="/listings/mine"
              className={cn(buttonVariants({ variant: "default" }), "mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6")}
            >
              Οι αγγελίες μου
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (!canPostListing) {
    const loginHref = listingId
      ? `/auth/email?next=${encodeURIComponent(`/listings/${listingId}/edit`)}`
      : "/auth/email?next=%2Flistings%2Fnew";
    const registerBrokerHref = "/register/broker?next=%2Faccount%2Fbroker-onboarding";
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
          aria-hidden
        />
        <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

        <div className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6 sm:py-20">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "mb-8 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            Αρχική
          </Link>

          <Card className="rounded-3xl border-border/50 bg-card/90 p-8 shadow-sm ring-1 ring-border/25">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-border/50 bg-primary/10">
              <Building2 className="size-6 text-primary" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {listingId ? "Επεξεργασία αγγελίας" : "Καταχώρηση αγγελίας"}
            </h1>
            {!user ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Για να δημοσιεύσεις χρειάζεσαι λογαριασμό μεσίτη και σύντομο προφίλ γραφείου.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href={loginHref} className={cn(buttonVariants({ variant: "default" }), "h-12 justify-center rounded-xl")}>
                    Σύνδεση
                  </Link>
                  <Link
                    href={registerBrokerHref}
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "h-12 justify-center rounded-xl border-border/50 bg-background"
                    )}
                  >
                    Εγγραφή ως μεσίτης
                  </Link>
                </div>
              </>
            ) : user.role === "SEEKER" ? (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Οι δημοσιεύσεις είναι διαθέσιμες μόνο για επαγγελματίες μεσίτες. Ο λογαριασμός σου είναι ως αναζητητής
                  ακινήτου.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Για καταχωρήσεις χρειάζεται ξεχωριστός λογαριασμός με ρόλο μεσίτη (άλλο email).
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/" className={cn(buttonVariants({ variant: "default" }), "h-12 justify-center rounded-xl")}>
                    Αναζήτηση
                  </Link>
                  <Link
                    href="/account"
                    className={cn(
                      buttonVariants({ variant: "secondary" }),
                      "h-12 justify-center rounded-xl border-border/50 bg-background"
                    )}
                  >
                    Λογαριασμός
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Ολοκλήρωσε πρώτα τα στοιχεία του γραφείου σου — μετά μπορείς να δημοσιεύεις.
                </p>
                <Link
                  href="/account/broker-onboarding"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6"
                  )}
                >
                  Συνέχεια στο προφίλ
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(0,48,135,0.055),transparent)]"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/[0.04] to-transparent" aria-hidden />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Hero */}
        <div className="relative mb-12 overflow-hidden rounded-3xl border border-border/45 bg-card/75 p-8 shadow-sm ring-1 ring-border/25 backdrop-blur-md sm:mb-14 sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/[0.07] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-500/[0.06] blur-3xl"
            aria-hidden
          />

          <Link
            href={isEdit ? "/listings/mine" : "/"}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "relative z-[1] mb-8 inline-flex h-10 items-center gap-2 rounded-xl bg-background/90 px-4 shadow-sm ring-1 ring-border/40"
            )}
          >
            <ArrowLeft className="size-4" />
            {isEdit ? "Οι αγγελίες μου" : "Αρχική"}
          </Link>

          <div className="relative z-[1] flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-3 text-xs font-medium text-muted-foreground">
                {[
                  { n: "1", t: "Στοιχεία" },
                  { n: "2", t: "Χαρακτηριστικά" },
                  { n: "3", t: "Εικόνα & χάρτης" },
                ].map((s, i) => (
                  <span key={s.n} className="flex items-center gap-1">
                    {i > 0 ? <span className="px-1 text-border">/</span> : null}
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/85 px-3.5 py-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {s.n}
                      </span>
                      {s.t}
                    </span>
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
                {isEdit ? "Επεξεργασία αγγελίας" : "Νέα αγγελία"}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-[1.65] text-muted-foreground sm:text-base sm:leading-relaxed">
                {isEdit
                  ? "Ενημέρωσε στοιχεία, τιμή, φωτογραφίες και τοποθεσία. Η προεπισκόπηση ενημερώνεται ζωντανά."
                  : "Δημιούργησε μια καθαρή, ελκυστική καταχώρηση. Στα δεξιά βλέπεις ζωντανή προεπισκόπηση — ό,τι γράφεις ενημερώνεται αμέσως."}
              </p>
            </div>
            <div className="relative z-[1] max-w-md shrink-0 rounded-2xl border border-primary/12 bg-primary/[0.04] px-5 py-4 text-[15px] leading-relaxed text-primary">
              <LayoutList className="mb-2 size-5 opacity-75" aria-hidden />
              <span className="font-medium">
                {isEdit
                  ? "Οι αλλαγές θα φαίνονται αμέσως στη σελίδα της αγγελίας και στη λίστα αποτελεσμάτων."
                  : "Μετά τη δημοσίευση θα εμφανίζεται στην αρχική και στον χάρτη."}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start lg:gap-12">
          <form onSubmit={onSubmit} className="space-y-8 sm:space-y-10">
            <SectionShell
              step="Βήμα 01"
              icon={Home}
              title="Βασικά στοιχεία"
              description="Τίτλος, τιμή και μέγεθος — αυτά εμφανίζονται πρώτα στη λίστα αποτελεσμάτων."
              accent="primary"
            >
              <div className="grid gap-8">
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 sm:p-6">
                  <div className="text-sm font-medium text-foreground">Τύπος συναλλαγής</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Ενοικίαση ή πώληση — εμφανίζεται στην κάρτα και στο φιλτράρισμα.
                  </p>
                  <div className="mt-5 inline-flex rounded-xl border border-border/50 bg-background p-1">
                    <button
                      type="button"
                      onClick={() => setDealType("rent")}
                      className={cn(
                        "h-10 rounded-lg px-5 text-sm font-medium transition-colors",
                        dealType === "rent"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={dealType === "rent"}
                    >
                      Ενοικίαση
                    </button>
                    <button
                      type="button"
                      onClick={() => setDealType("sale")}
                      className={cn(
                        "h-10 rounded-lg px-5 text-sm font-medium transition-colors",
                        dealType === "sale"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-pressed={dealType === "sale"}
                    >
                      Πώληση
                    </button>
                  </div>
                </div>

                <Field id="listing-title" label="Τίτλος αγγελίας" hint="Κράτα τον σύντομο: περιοχή + τύπος ακινήτου.">
                  <Input
                    id="listing-title"
                    className="h-12 rounded-xl border-border/50 bg-background"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Π.χ. Κουκάκι · Διαμέρισμα"
                    required
                    autoComplete="off"
                  />
                </Field>

                <Field
                  id="listing-subtitle"
                  label="Υπότιτλος (προαιρετικό)"
                  hint="Δωμάτια, τετραγωνικά, όροφος. Αν το αφήσεις κενό, θα δημιουργηθεί αυτόματα από τα πεδία πιο κάτω."
                >
                  <textarea
                    id="listing-subtitle"
                    rows={3}
                    className={cn(
                      "min-h-[5.5rem] w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-[15px] leading-relaxed",
                      "outline-none transition-colors placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    )}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="2 υπνοδωμάτια · 70 m² · 3ος όροφος"
                  />
                </Field>

                <Field
                  id="listing-description"
                  label="Περιγραφή (προαιρετικό)"
                  hint="Εμφανίζεται στη σελίδα της αγγελίας πριν τα χαρακτηριστικά. Μπορείς να χρησιμοποιήσεις νέες γραμμές."
                >
                  <textarea
                    id="listing-description"
                    rows={6}
                    className={cn(
                      "min-h-[9rem] w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-[15px] leading-relaxed",
                      "outline-none transition-colors placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    )}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Περιέγραψε το ακίνητο, τη γειτονιά, κατάσταση, θέρμανση, διαθεσιμότητα κ.λπ."
                  />
                </Field>

                <div className="grid gap-7 sm:grid-cols-3 sm:gap-6">
                  <Field
                    id="listing-price"
                    label="Τιμή (€)"
                    hint={
                      dealType === "sale"
                        ? "Συνολική τιμή πώλησης του ακινήτου."
                        : "Μηνιαίο μίσθωμα (ανά μήνα)."
                    }
                  >
                    <Input
                      id="listing-price"
                      className="h-12 rounded-xl border-border/50 bg-background"
                      value={priceEur}
                      onChange={(e) => setPriceEur(e.target.value)}
                      inputMode="decimal"
                      placeholder="950"
                      required
                    />
                  </Field>
                  <Field id="listing-rooms" label="Δωμάτια" hint="Πόσα υπνοδωμάτια (ή στούντιο).">
                    <Select value={rooms} onValueChange={(v) => v != null && setRooms(v)}>
                      <SelectTrigger
                        id="listing-rooms"
                        className="h-12 w-full rounded-xl border-border/50 bg-background"
                      >
                        <SelectValue placeholder="Επίλεξε" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Στούντιο</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3+">3+</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="listing-sqm" label="Εμβαδόν (m²)">
                    <Input
                      id="listing-sqm"
                      className="h-12 rounded-xl border-border/50 bg-background"
                      value={sqm}
                      onChange={(e) => setSqm(e.target.value)}
                      inputMode="decimal"
                      placeholder="70"
                      required
                    />
                  </Field>
                </div>
              </div>
            </SectionShell>

            <SectionShell
              step="Βήμα 02"
              icon={Sparkles}
              title="Χαρακτηριστικά"
              description="Βοηθούν τους ενδιαφερόμενους να φιλτράρουν γρήγορα. Πρόσθεσε και δικά σου με κόμμα."
              accent="violet"
            >
              <div className="flex flex-wrap gap-2.5">
                {HIGHLIGHT_OPTIONS.map(({ value, label }) => {
                  const active = selectedHighlights.has(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleHighlight(value)}
                      className={cn(
                        "h-10 rounded-full border px-4 text-sm font-medium transition-all",
                        active
                          ? "border-primary/40 bg-accent text-accent-foreground"
                          : "border-border/50 bg-background/80 text-muted-foreground hover:border-border/80 hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <Field
                id="listing-highlights-extra"
                label="Επιπλέον λέξεις-κλειδιά"
                hint="Χώρισέ τες με κόμμα · π.χ. Ήσυχο, Θέα, Νεόδμητο"
                className="mt-8"
              >
                <Input
                  id="listing-highlights-extra"
                  className="h-12 rounded-xl border-border/50 bg-background"
                  value={highlightsExtra}
                  onChange={(e) => setHighlightsExtra(e.target.value)}
                  placeholder="Ήσυχο, Θέα στη θάλασσα"
                />
              </Field>
            </SectionShell>

            <SectionShell
              step="Βήμα 03"
              icon={ImageIcon}
              title="Φωτογραφία & τοποθεσία"
              description="Ανέβασε φωτογραφίες και όρισε διεύθυνση, ορατότητα τοποθεσίας και σημείο στον χάρτη."
              accent="amber"
            >
              <div className="mb-8 rounded-2xl border border-border/45 bg-gradient-to-b from-muted/25 to-background/90 p-5 sm:p-7">
                <Field
                  id="listing-photo-uploader"
                  label="Φωτογραφίες αγγελίας"
                  hint="Κάνε drag & drop ή επίλεξε αρχεία. Μπορείς να σβήσεις όσες δεν θέλεις πριν τη δημοσίευση."
                >
                  <div
                    id="listing-photo-uploader"
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDrop={onDropFiles}
                    className={cn(
                      "rounded-xl border-2 border-dashed bg-background px-4 py-8 text-center transition-colors",
                      dragActive ? "border-primary bg-primary/[0.04]" : "border-border/60 hover:border-primary/50",
                      uploadingPhotos && "cursor-progress"
                    )}
                    aria-label="Περιοχή μεταφόρτωσης φωτογραφιών"
                  >
                    {uploadingPhotos ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-foreground">
                        <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
                        <p className="text-sm font-medium">
                          Μεταφόρτωση {uploadingCount > 0 ? uploadingCount : ""} φωτογραφιών...
                        </p>
                        <p className="text-xs text-muted-foreground">Περίμενε να ολοκληρωθεί το upload.</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="mx-auto mb-2 size-7 text-muted-foreground" aria-hidden />
                        <p className="text-sm font-medium text-foreground">Drag & drop εικόνες εδώ</p>
                        <p className="mt-1 text-xs text-muted-foreground">ή πάτησε για επιλογή από τον υπολογιστή σου</p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onFilesSelected}
                    />
                  </div>
                </Field>

                {uploadedPhotos.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {uploadedPhotos.map((photo, index) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={() => onPhotoDragStart(photo.id)}
                        onDragOver={(e) => onPhotoDragOver(e, photo.id)}
                        onDrop={(e) => onPhotoDrop(e, photo.id)}
                        onDragEnd={() => {
                          setDraggingPhotoId(null);
                          setDragOverPhotoId(null);
                        }}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border border-border/50 bg-background",
                          dragOverPhotoId === photo.id && "ring-2 ring-primary/50",
                          draggingPhotoId === photo.id && "opacity-70"
                        )}
                      >
                        <div className="relative aspect-[4/3]">
                          <Image src={photo.src} alt={photo.name} fill className="object-cover" sizes="(max-width:640px) 50vw, 180px" />
                        </div>
                        {index === 0 ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Εξώφυλλο
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removePhoto(photo)}
                          className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white opacity-90 transition hover:opacity-100"
                          aria-label="Διαγραφή φωτογραφίας"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {uploadedPhotos.length > 1 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Σύρε τις φωτογραφίες για να αλλάξεις τη σειρά. Η πρώτη είναι το εξώφυλλο.</p>
                ) : null}

                {uploadingPhotos ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Γίνεται μεταφόρτωση εικόνων...
                  </div>
                ) : null}

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-border/45 bg-background/85 px-4 py-3">
                  <input
                    id="ai-redesign-toggle"
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-border/60"
                    checked={generateAiRedesigns}
                    onChange={(e) => setGenerateAiRedesigns(e.target.checked)}
                  />
                  <label htmlFor="ai-redesign-toggle" className="text-sm leading-relaxed text-foreground">
                    Δημιουργία AI ανακαινισμένων παραλλαγών με Decor8
                  </label>
                </div>

                {generateAiRedesigns ? (
                  <div className="mt-5 grid gap-6 rounded-xl border border-primary/20 bg-primary/[0.04] p-4 sm:grid-cols-2">
                    <Field id="ai-variants" label="Παραλλαγές ανά φωτογραφία (1-10)">
                      <Input
                        id="ai-variants"
                        className="h-11 rounded-xl border-border/50 bg-background"
                        value={aiVariantsPerImage}
                        onChange={(e) => setAiVariantsPerImage(e.target.value)}
                        inputMode="numeric"
                        placeholder="5"
                      />
                    </Field>
                    <Field id="ai-room-type" label="Τύπος χώρου">
                      <Select value={aiRoomType} onValueChange={(v) => v != null && setAiRoomType(v)}>
                        <SelectTrigger id="ai-room-type" className="h-11 w-full rounded-xl border-border/50 bg-background">
                          <SelectValue placeholder="Επίλεξε χώρο" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_ROOM_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="ai-style" label="Design style (Decor8)">
                      <Input
                        id="ai-style"
                        className="h-11 rounded-xl border-border/50 bg-background"
                        value={aiDesignStyle}
                        onChange={(e) => setAiDesignStyle(e.target.value)}
                        placeholder="modern"
                      />
                    </Field>
                    <Field id="ai-color-scheme" label="Χρωματική παλέτα (προαιρετικό)">
                      <Input
                        id="ai-color-scheme"
                        className="h-11 rounded-xl border-border/50 bg-background"
                        value={aiColorScheme}
                        onChange={(e) => setAiColorScheme(e.target.value)}
                        placeholder="warm neutrals"
                      />
                    </Field>

                    <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{parsedUploadedImages.length}</span> φωτογραφίες ×{" "}
                      <span className="font-medium text-foreground">
                        {Number.isFinite(parsedAiVariants) && parsedAiVariants > 0 ? parsedAiVariants : 0}
                      </span>{" "}
                      παραλλαγές = <span className="font-semibold text-primary">{totalAiOutputs}</span> AI εικόνες
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/45 bg-gradient-to-b from-muted/25 to-background/90 p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-foreground">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden />
                  Διεύθυνση ακινήτου
                </div>
                <p className="mb-6 text-[13px] leading-relaxed text-muted-foreground">
                  Δήλωσε τη διεύθυνση και διάλεξε αν θέλεις να εμφανίζεται ακριβώς ή περίπου στο κοινό.
                </p>
                <Field
                  id="listing-address-line"
                  label="Διεύθυνση"
                  hint="Π.χ. Ερμού 14, Σύνταγμα, Αθήνα"
                  className="mb-6"
                >
                  <div className="relative">
                    <Input
                      id="listing-address-line"
                      className="h-12 rounded-xl border-border/50 bg-background"
                      value={addressLine}
                      autoComplete="off"
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddressLine(v);
                        setAddressSuggestionsOpen(true);
                        scheduleAddressGeocode(v);
                      }}
                      onFocus={() => {
                        setAddressSuggestionsOpen(true);
                        setAddressHighlightedIndex(visibleAddressSuggestions.length > 0 ? 0 : -1);
                      }}
                      onKeyDown={(e) => {
                        if (!addressSuggestionsOpen) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          if (visibleAddressSuggestions.length === 0) return;
                          setAddressHighlightedIndex((prev) => {
                            const base = prev < 0 ? 0 : prev;
                            return Math.min(base + 1, visibleAddressSuggestions.length - 1);
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          if (visibleAddressSuggestions.length === 0) return;
                          setAddressHighlightedIndex((prev) => Math.max((prev < 0 ? 0 : prev) - 1, 0));
                        } else if (e.key === "Enter") {
                          if (addressHighlightedIndex >= 0 && addressHighlightedIndex < visibleAddressSuggestions.length) {
                            e.preventDefault();
                            applyAddressSuggestion(visibleAddressSuggestions[addressHighlightedIndex]!);
                          } else {
                            e.preventDefault();
                          }
                        } else if (e.key === "Escape") {
                          setAddressSuggestionsOpen(false);
                        }
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setAddressSuggestionsOpen(false), 120);
                      }}
                      placeholder="Οδός, αριθμός, περιοχή"
                      required
                    />
                    {addressSuggestionsOpen &&
                    (addressLine.trim().length >= 2 || recentAddressSuggestions.length > 0 || addressLoading) ? (
                      <div className="absolute left-0 right-0 z-20 mt-2 max-h-56 overflow-auto rounded-xl border border-border/60 bg-background p-1 shadow-lg">
                        {addressLine.trim().length < 2 && recentAddressSuggestions.length > 0 ? (
                          <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Πρόσφατες αναζητήσεις
                          </div>
                        ) : null}
                        {addressLoading ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">Αναζήτηση διευθύνσεων...</div>
                        ) : visibleAddressSuggestions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {addressLine.trim().length < 4
                              ? "Συνέχισε να γράφεις για πιο ακριβή αποτελέσματα..."
                              : "Δεν βρέθηκαν αποτελέσματα."}
                          </div>
                        ) : (
                          visibleAddressSuggestions.map((s, index) => (
                            <button
                              key={`${s.label}-${s.lat}-${s.lng}`}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setAddressHighlightedIndex(index)}
                              onClick={() => applyAddressSuggestion(s)}
                              className={cn(
                                "w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted",
                                index === addressHighlightedIndex && "bg-muted"
                              )}
                            >
                              <span className="block font-medium">{s.label.split(",")[0] ?? s.label}</span>
                              {s.label.includes(",") ? (
                                <span className="block text-xs text-muted-foreground">{s.label.split(",").slice(1).join(",").trim()}</span>
                              ) : null}
                              {s.kind ? <span className="block text-xs text-muted-foreground">{s.kind}</span> : null}
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                </Field>
                <div className="mb-6 rounded-xl border border-border/45 bg-background/85 p-4">
                  <div className="mb-3 text-sm font-medium text-foreground">Εμφάνιση διεύθυνσης</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setAddressVisibility("exact")}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        addressVisibility === "exact"
                          ? "border-primary/45 bg-primary/10 text-foreground"
                          : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Ακριβής διεύθυνση
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressVisibility("approximate")}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        addressVisibility === "approximate"
                          ? "border-primary/45 bg-primary/10 text-foreground"
                          : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Περίπου περιοχή
                    </button>
                  </div>
                </div>
                <div className="mb-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 shadow-inner">
                  <ListingLocationPickerMap
                    lat={mapCenter.lat}
                    lng={mapCenter.lng}
                    locationPrecision={addressVisibility}
                    focusNonce={addressMapFocusNonce}
                    onCenterChange={handleMapCenterChange}
                  />
                </div>
                <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
                  Αν χρειάζεται, προσαρμόζεις χειροκίνητα το σημείο με lat/lng (π.χ. από Google Maps δεξί κλικ → αντιγραφή
                  συντεταγμένων).
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field id="listing-lat" label="Πλάτος (lat)">
                    <Input
                      id="listing-lat"
                      className="h-12 rounded-xl border-border/50 bg-background font-mono text-sm"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      onBlur={scheduleReverseFromLatLngFields}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_LAT)}
                    />
                  </Field>
                  <Field id="listing-lng" label="Μήκος (lng)">
                    <Input
                      id="listing-lng"
                      className="h-12 rounded-xl border-border/50 bg-background font-mono text-sm"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      onBlur={scheduleReverseFromLatLngFields}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_LNG)}
                    />
                  </Field>
                </div>
              </div>
            </SectionShell>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/8 px-5 py-4 text-[15px] leading-relaxed text-destructive"
              >
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-4 rounded-2xl border border-border/45 bg-card/70 p-6 shadow-sm ring-1 ring-border/20 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-7">
              {!isEdit ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-xl border-border/50 bg-background"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Εκκαθάριση φόρμας
                </Button>
              ) : (
                <div className="min-h-12 w-full min-w-0 sm:w-auto sm:flex-1" aria-hidden />
              )}
              <Button type="submit" className="h-12 min-w-[220px] rounded-xl px-10" disabled={!canSubmit || loading}>
                {loading
                  ? isEdit
                    ? "Αποθήκευση…"
                    : "Δημοσίευση…"
                  : isEdit
                    ? "Αποθήκευση αλλαγών"
                    : "Δημοσίευση αγγελίας"}
              </Button>
            </div>
          </form>

          {/* Sidebar: preview + checklist */}
          <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
            <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/90 shadow-sm ring-1 ring-border/25">
              <div className="border-b border-border/40 bg-muted/15 px-5 py-4">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                  <PenLine className="size-4 text-primary" aria-hidden />
                  Προεπισκόπηση
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">Έτσι θα φαίνεται περίπου στη λίστα.</p>
              </div>
              <div className="p-5 sm:p-6">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted shadow-inner ring-1 ring-border/40">
                  {coverImageSrc ? (
                    <Image
                      src={coverImageSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width:1024px) 100vw, 340px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                      Ανέβασε φωτογραφία για προεπισκόπηση εξώφυλλου
                    </div>
                  )}
                  {coverImageSrc ? (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  ) : null}
                  <div className="absolute left-3 top-3">
                    <span className="rounded-full border border-white/30 bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {dealType === "sale" ? "Πώληση" : "Ενοικίαση"}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug drop-shadow-sm">
                      {hasTitle ? title.trim() : "Ο τίτλος της αγγελίας σου"}
                    </p>
                    {previewSubtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs text-white/85 drop-shadow-sm">{previewSubtitle}</p>
                    ) : (
                      <p className="mt-1 text-xs italic text-white/60">Συμπλήρωσε εμβαδόν & δωμάτια για υπότιτλο</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex items-baseline justify-between gap-2 border-t border-border/40 pt-5">
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {hasPrice ? formatEur(parsedPrice!) : "— €"}
                  </span>
                  <span className="text-xs text-muted-foreground">{roomsLabel}</span>
                </div>
                {parsedSqm !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">{parsedSqm} m²</p>
                ) : (
                  <p className="mt-1 text-xs italic text-muted-foreground">Πρόσθεσε m²</p>
                )}
                {previewHighlights.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {previewHighlights.map((h) => (
                      <span
                        key={h}
                        className="rounded-full border border-border/60 bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground/90"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] text-muted-foreground">Διάλεξε χαρακτηριστικά για ετικέτες.</p>
                )}
              </div>
            </Card>

            <Card className="rounded-2xl border-border/50 bg-card/85 p-5 shadow-sm ring-1 ring-border/25 sm:p-6">
              <div className="mb-4 text-sm font-semibold text-foreground">
                {isEdit ? "Έλεγχος πριν την αποθήκευση" : "Έλεγχος πριν τη δημοσίευση"}
              </div>
              <div className="space-y-2">
                <CheckRow done={hasTitle} label="Τίτλος συμπληρωμένος" />
                <CheckRow done={hasPrice} label="Έγκυρη τιμή" />
                <CheckRow done={hasSqm} label="Εμβαδόν (m²)" />
                <CheckRow done={true} label="Δωμάτια επιλεγμένα" />
                <CheckRow done={hasHighlights} label="Τουλάχιστον ένα χαρακτηριστικό (προτείνεται)" />
              </div>
            </Card>

            <div className="flex gap-4 rounded-2xl border border-primary/12 bg-primary/[0.035] p-5 text-[15px] leading-relaxed text-foreground sm:p-6">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary/90" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">Συμβουλή</p>
                <p className="mt-2 text-muted-foreground">
                  Καλοί τίτλοι αναφέρουν περιοχή και τύπο ακινήτου. Στο υπότιτλο βάλε όροφο, κατάσταση ή απόσταση από μετρό.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function NewListingPage() {
  return <ListingEditorPage />;
}

export { ListingEditorPage };
