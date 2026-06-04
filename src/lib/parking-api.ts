import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Modal = "walk" | "bike" | "bus" | "scooter" | "shuttle";

export interface ParkingOption {
  id: string;
  name: string;
  address: string;
  price: number;
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
}

export const DESTINATIONS = [
  "Marco Zero, Recife Antigo",
  "Paço do Frevo",
  "Rua do Bom Jesus",
  "Cais do Sertão",
  "Praça do Arsenal",
];

function mapLot(row: Record<string, unknown>, reservedByLot: Record<string, number>): ParkingOption {
  const id = String(row.id);
  const total = Number(row.total_spots);
  const reserved = reservedByLot[id] ?? 0;
  return {
    id,
    name: String(row.name),
    address: String(row.address),
    price: Number(row.hourly_price),
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
    setData((lots ?? []).map((l) => mapLot(l as Record<string, unknown>, reservedByLot)));
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
    const { data: routes } = await supabase
      .from("route_history")
      .select("*")
      .eq("user_id", userId);
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

export async function createTrip(opts: {
  userId: string;
  option: ParkingOption;
  destination: string;
}) {
  const { userId, option, destination } = opts;
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .insert({
      user_id: userId,
      lot_id: option.id,
      destination,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "active",
      total_price: option.price,
    })
    .select()
    .single();
  if (resErr) throw resErr;

  await supabase.from("route_history").insert({
    user_id: userId,
    reservation_id: reservation.id,
    origin: "Localização atual",
    destination,
    modal: option.modal,
    total_time_min: option.totalTime,
    distance_km: option.distanceKm,
    co2_saved_kg: option.co2Saved,
    money_saved: Math.max(0, 35 - option.price), // vs. estacionar no destino R$35
  });

  await supabase.from("payments").insert({
    user_id: userId,
    reservation_id: reservation.id,
    amount: option.price,
    method: "pix",
    status: "paid",
  });

  return reservation;
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
