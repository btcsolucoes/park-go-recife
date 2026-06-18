import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Modal = "walk" | "bike" | "bus" | "scooter" | "shuttle";

export interface ParkingOption {
  id: string;
  name: string;
  address: string;
  price: number | null;
  spotsAvailable: number;
  spotsTotal: number;
  distanceKm: number;
  modal: Modal;
  modalLabel: string;
  modalTime: number;
  driveTime: number;
  totalTime: number;
  rating: number;
  co2Saved: number;
  badge?: string | null;
  coords: { x: number; y: number };
  location?: { lat: number; lng: number };
  curated?: boolean;
  priceEstimated?: boolean;
}

export const DESTINATIONS = [
  "Marco Zero, Recife Antigo",
  "Paço do Frevo",
  "Rua do Bom Jesus",
  "Cais do Sertão",
  "Praça do Arsenal",
];

const PRIVATE_RECIFE_ANTIGO_LOTS: ParkingOption[] = [
  {
    id: "curated-anima-marco-zero",
    name: "Ânima Estacionamentos Marco Zero",
    address: "Rua Vigário Tenório, 56 — Recife Antigo",
    price: null,
    spotsAvailable: 42,
    spotsTotal: 70,
    distanceKm: 0.35,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 4,
    driveTime: 7,
    totalTime: 11,
    rating: 4.8,
    co2Saved: 1.2,
    badge: "Marco Zero",
    coords: { x: 54, y: 66 },
    location: { lat: -8.0631, lng: -34.8742 },
    curated: true,
  },
  {
    id: "curated-servau-apolo",
    name: "Servau Estacionamento",
    address: "Rua do Apolo, 169 — Recife Antigo",
    price: null,
    spotsAvailable: 18,
    spotsTotal: 35,
    distanceKm: 0.45,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 5,
    driveTime: 7,
    totalTime: 12,
    rating: 4.4,
    co2Saved: 1,
    badge: "Rua do Apolo",
    coords: { x: 63, y: 60 },
    location: { lat: -8.0599, lng: -34.8731 },
    curated: true,
  },
  {
    id: "curated-caape-cais-apolo",
    name: "Estacionamento CAAPE",
    address: "Cais do Apolo, 539 — Bairro do Recife",
    price: null,
    spotsAvailable: 34,
    spotsTotal: 70,
    distanceKm: 0.85,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 9,
    driveTime: 6,
    totalTime: 15,
    rating: 4.5,
    co2Saved: 1.1,
    badge: "Cais do Apolo",
    coords: { x: 66, y: 35 },
    location: { lat: -8.0563036, lng: -34.8728048 },
    curated: true,
  },
  {
    id: "curated-moinho-recife",
    name: "Estacionamento Moinho Recife",
    address: "Rua de São Jorge, 215 — Recife Antigo",
    price: null,
    spotsAvailable: 130,
    spotsTotal: 590,
    distanceKm: 0.55,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 6,
    driveTime: 7,
    totalTime: 13,
    rating: 4.6,
    co2Saved: 1.2,
    badge: "590 vagas",
    coords: { x: 70, y: 48 },
    location: { lat: -8.0588157, lng: -34.8706357 },
    curated: true,
  },
  {
    id: "curated-paco-alfandega",
    name: "Edifício Garagem Paço Alfândega",
    address: "Rua da Alfândega, 35 — Bairro do Recife",
    price: null,
    spotsAvailable: 76,
    spotsTotal: 180,
    distanceKm: 0.25,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 3,
    driveTime: 8,
    totalTime: 11,
    rating: 4.7,
    co2Saved: 1.2,
    badge: "Mais central",
    coords: { x: 58, y: 78 },
    location: { lat: -8.0665077, lng: -34.8728982 },
    curated: true,
  },
  {
    id: "curated-porto-marco-zero",
    name: "Estacionamento Porto Recife",
    address: "Avenida Alfredo Lisboa, 2 — Marco Zero",
    price: null,
    spotsAvailable: 52,
    spotsTotal: 110,
    distanceKm: 0.2,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 3,
    driveTime: 8,
    totalTime: 11,
    rating: 4.5,
    co2Saved: 1.2,
    badge: "Marco Zero",
    coords: { x: 74, y: 70 },
    location: { lat: -8.0633, lng: -34.87085 },
    curated: true,
  },
  {
    id: "curated-neto-park",
    name: "Neto Park",
    address: "Rua Bernardo Vieira de Melo — Recife Antigo",
    price: null,
    spotsAvailable: 28,
    spotsTotal: 50,
    distanceKm: 0.5,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 6,
    driveTime: 7,
    totalTime: 13,
    rating: 4.4,
    co2Saved: 1,
    badge: "OSM",
    coords: { x: 69, y: 49 },
    location: { lat: -8.0592307, lng: -34.8710491 },
    curated: true,
  },
];

const FALLBACK_AVERAGE_HOURLY_PRICE = 15;
const RECIFE_ANTIGO_BOUNDS = {
  north: -8.052,
  south: -8.0688,
  west: -34.8798,
  east: -34.8685,
};

const KNOWN_LOT_LOCATIONS: Array<{
  match: string[];
  location: { lat: number; lng: number };
}> = [
  {
    match: ["estacionamento recife antigo", "rio branco"],
    location: { lat: -8.063, lng: -34.8746 },
  },
  {
    match: ["paco alfandega", "alfandega"],
    location: { lat: -8.0665077, lng: -34.8728982 },
  },
  {
    match: ["anima estacionamentos", "vigario tenorio"],
    location: { lat: -8.0631, lng: -34.8742 },
  },
  {
    match: ["servau", "rua do apolo"],
    location: { lat: -8.0599, lng: -34.8731 },
  },
  {
    match: ["caape", "cais do apolo"],
    location: { lat: -8.0563036, lng: -34.8728048 },
  },
  {
    match: ["moinho recife", "sao jorge"],
    location: { lat: -8.0588157, lng: -34.8706357 },
  },
  {
    match: ["porto recife", "alfredo lisboa"],
    location: { lat: -8.0633, lng: -34.87085 },
  },
  {
    match: ["neto park", "bernardo vieira de melo"],
    location: { lat: -8.0592307, lng: -34.8710491 },
  },
];

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isInRecifeAntigo(location: { lat: number; lng: number }) {
  return (
    location.lat <= RECIFE_ANTIGO_BOUNDS.north &&
    location.lat >= RECIFE_ANTIGO_BOUNDS.south &&
    location.lng >= RECIFE_ANTIGO_BOUNDS.west &&
    location.lng <= RECIFE_ANTIGO_BOUNDS.east
  );
}

function knownLotLocation(name: string, address: string) {
  const text = normalizeSearch(`${name} ${address}`);
  return KNOWN_LOT_LOCATIONS.find((entry) =>
    entry.match.some((term) => text.includes(normalizeSearch(term))),
  )?.location;
}

function isRecifeAntigoLot(lot: ParkingOption) {
  if (lot.curated) return true;
  if (lot.location && isInRecifeAntigo(lot.location)) return true;

  const text = normalizeSearch(`${lot.name} ${lot.address}`);
  return [
    "recife antigo",
    "bairro do recife",
    "rio branco",
    "marco zero",
    "cais do apolo",
    "alfredo lisboa",
    "rua do apolo",
    "vigario tenorio",
    "alfandega",
    "bernardo vieira de melo",
  ].some((term) => text.includes(term));
}

function averageHourlyPrice(lots: ParkingOption[]) {
  const prices = lots
    .map((lot) => lot.price)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price));

  if (prices.length === 0) return FALLBACK_AVERAGE_HOURLY_PRICE;
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return Math.round(average * 100) / 100;
}

function applyAveragePrice(lot: ParkingOption, averagePrice: number): ParkingOption {
  if (lot.price != null) return lot;
  return {
    ...lot,
    price: averagePrice,
    priceEstimated: true,
  };
}

function mergeParkingLots(remoteLots: ParkingOption[]) {
  const seen = new Set<string>();
  const merged: ParkingOption[] = [];
  const averagePrice = averageHourlyPrice(remoteLots);
  const relevantRemoteLots = remoteLots.filter(isRecifeAntigoLot);
  const privateLotsWithAverage = PRIVATE_RECIFE_ANTIGO_LOTS.map((lot) =>
    applyAveragePrice(lot, averagePrice),
  );

  for (const lot of [...relevantRemoteLots, ...privateLotsWithAverage]) {
    const key = `${normalizeKey(lot.name)}:${normalizeKey(lot.address)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(lot);
  }

  return merged.sort(
    (a, b) =>
      a.totalTime - b.totalTime ||
      (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY),
  );
}

function mapLot(
  row: Record<string, unknown>,
  reservedByLot: Record<string, number>,
): ParkingOption {
  const id = String(row.id);
  const total = Number(row.total_spots);
  const reserved = reservedByLot[id] ?? 0;
  const hasLocation = row.latitude != null && row.longitude != null;
  const lat = hasLocation ? Number(row.latitude) : NaN;
  const lng = hasLocation ? Number(row.longitude) : NaN;
  const rawPrice = row.hourly_price == null ? null : Number(row.hourly_price);
  const name = String(row.name);
  const address = String(row.address);
  const dbLocation =
    Number.isFinite(lat) && Number.isFinite(lng) && isInRecifeAntigo({ lat, lng })
      ? { lat, lng }
      : undefined;
  const location = knownLotLocation(name, address) ?? dbLocation;

  return {
    id,
    name,
    address,
    price: Number.isFinite(rawPrice) ? rawPrice : null,
    spotsAvailable: Math.max(0, total - reserved),
    spotsTotal: total,
    distanceKm: Number(row.distance_km),
    modal: String(row.modal) as Modal,
    modalLabel: String(row.modal_label),
    modalTime: Number(row.modal_time_min),
    driveTime: Number(row.drive_time_min),
    totalTime: Number(row.modal_time_min) + Number(row.drive_time_min),
    rating: Number(row.rating),
    co2Saved: Number(row.co2_saved_kg),
    badge: row.badge ? String(row.badge) : null,
    coords: { x: Number(row.map_x), y: Number(row.map_y) },
    location,
  };
}

export function useParkingLots() {
  const [data, setData] = useState<ParkingOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: lots } = await supabase
      .from("parking_lots")
      .select("*")
      .order("hourly_price", { ascending: true });
    const { data: actives } = await supabase
      .from("reservations")
      .select("lot_id")
      .eq("status", "active");
    const reservedByLot: Record<string, number> = {};
    (actives ?? []).forEach((r) => {
      reservedByLot[r.lot_id] = (reservedByLot[r.lot_id] ?? 0) + 1;
    });
    const remoteLots = (lots ?? []).map((l) => mapLot(l as Record<string, unknown>, reservedByLot));
    setData(mergeParkingLots(remoteLots));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, reload: load };
}

export interface UserMetrics {
  timeSavedMin: number;
  moneySaved: number;
  co2AvoidedKg: number;
  trips: number;
  weeklyTrend: number[];
  modalSplit: { modal: string; pct: number; color: string }[];
}

const MODAL_LABELS: Record<string, { label: string; color: string }> = {
  walk: { label: "Caminhada", color: "var(--color-brand)" },
  bike: { label: "Bicicleta", color: "oklch(0.65 0.16 220)" },
  bus: { label: "Ônibus", color: "oklch(0.7 0.16 50)" },
  scooter: { label: "Patinete", color: "oklch(0.6 0.18 300)" },
  shuttle: { label: "Shuttle", color: "oklch(0.6 0.18 160)" },
};

export function useUserMetrics(userId: string | null) {
  const [metrics, setMetrics] = useState<UserMetrics>({
    timeSavedMin: 0,
    moneySaved: 0,
    co2AvoidedKg: 0,
    trips: 0,
    weeklyTrend: [0, 0, 0, 0, 0, 0, 0],
    modalSplit: [],
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: routes } = await supabase.from("route_history").select("*").eq("user_id", userId);
    const list = routes ?? [];
    const timeSavedMin = list.reduce((a, r) => a + Number(r.total_time_min ?? 0), 0);
    const moneySaved = list.reduce((a, r) => a + Number(r.money_saved ?? 0), 0);
    const co2 = list.reduce((a, r) => a + Number(r.co2_saved_kg ?? 0), 0);

    // weekly trend (last 7 days, Mon..Sun)
    const week = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    list.forEach((r) => {
      const d = new Date(r.created_at as string);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) week[6 - diff] += 1;
    });

    // modal split
    const counts: Record<string, number> = {};
    list.forEach((r) => {
      const m = String(r.modal);
      counts[m] = (counts[m] ?? 0) + 1;
    });
    const total = list.length || 1;
    const split = Object.entries(counts).map(([m, c]) => ({
      modal: MODAL_LABELS[m]?.label ?? m,
      pct: Math.round((c / total) * 100),
      color: MODAL_LABELS[m]?.color ?? "var(--color-primary)",
    }));

    setMetrics({
      timeSavedMin,
      moneySaved: Math.round(moneySaved),
      co2AvoidedKg: Math.round(co2 * 10) / 10,
      trips: list.length,
      weeklyTrend: week,
      modalSplit: split,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { metrics, loading, reload: load };
}

export interface Ticket {
  id: string;
  code: string;
  fullName: string;
  plate: string;
  destination: string;
  arrivalAt: string;
  status: string;
  lotName: string;
  lotAddress: string;
  hourlyPrice: number | null;
  estimatedHours: number;
  estimatedTotal: number | null;
  priceEstimated: boolean;
}

function generateTicketCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PZ-${part()}-${part()}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function trackRouteImpact(opts: {
  userId: string;
  destination: string;
  option: ParkingOption;
}) {
  const { userId, destination, option } = opts;
  await supabase.from("route_history").insert({
    user_id: userId,
    origin: "Localização atual",
    destination,
    modal: option.modal,
    total_time_min: option.totalTime,
    distance_km: option.distanceKm,
    co2_saved_kg: option.co2Saved,
    money_saved: option.price == null ? 0 : Math.max(0, 35 - option.price),
  });
}

export async function createTicket(opts: {
  userId: string;
  fullName: string;
  plate: string;
  option: ParkingOption;
  destination: string;
  arrivalAt?: Date;
}): Promise<Ticket> {
  const { userId, fullName, plate, option, destination } = opts;
  const arrivalAt = opts.arrivalAt ?? new Date(Date.now() + 20 * 60 * 1000);
  const code = generateTicketCode();
  const estimatedHours = 2;

  if (!isUuid(option.id)) {
    await trackRouteImpact({ userId, destination, option });

    return {
      id: `local-${code}`,
      code,
      fullName,
      plate: plate.toUpperCase(),
      destination,
      arrivalAt: arrivalAt.toISOString(),
      status: "awaiting_arrival",
      lotName: option.name,
      lotAddress: option.address,
      hourlyPrice: option.price,
      estimatedHours,
      estimatedTotal: option.price == null ? null : option.price * estimatedHours,
      priceEstimated: option.priceEstimated ?? false,
    };
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      user_id: userId,
      lot_id: option.id,
      code,
      destination,
      full_name: fullName,
      plate: plate.toUpperCase(),
      arrival_at: arrivalAt.toISOString(),
      status: "awaiting_arrival",
    })
    .select()
    .single();
  if (error) throw error;

  // Track environmental/financial impact (no payment created)
  await trackRouteImpact({ userId, destination, option });

  return {
    id: data.id,
    code: data.code,
    fullName: data.full_name,
    plate: data.plate,
    destination: data.destination,
    arrivalAt: data.arrival_at,
    status: data.status,
    lotName: option.name,
    lotAddress: option.address,
    hourlyPrice: option.price,
    estimatedHours,
    estimatedTotal: option.price == null ? null : option.price * estimatedHours,
    priceEstimated: option.priceEstimated ?? false,
  };
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  initials: string;
}

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      hydrate(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session?.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();

    async function hydrate(u: { id: string; email?: string } | null) {
      if (!u) return setUser(null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.id)
        .maybeSingle();
      const fullName = profile?.full_name || (u.email ?? "").split("@")[0] || "Usuário";
      const initials = fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      setUser({ id: u.id, email: u.email ?? "", fullName, initials });
    }
  }, []);

  return { user, ready };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
