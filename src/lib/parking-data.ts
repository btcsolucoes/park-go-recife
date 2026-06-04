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
  modalTime: number; // min from parking to destination
  driveTime: number; // min driving to parking
  totalTime: number;
  rating: number;
  co2Saved: number; // kg
  badge?: string;
  coords: { x: number; y: number }; // % on map
}

export const DESTINATIONS = [
  "Marco Zero, Recife Antigo",
  "Paço do Frevo",
  "Rua do Bom Jesus",
  "Cais do Sertão",
  "Praça do Arsenal",
];

export const PARKING_OPTIONS: ParkingOption[] = [
  {
    id: "boa-vista",
    name: "Estacionamento Boa Vista",
    address: "R. da Aurora, 295 — Boa Vista",
    price: 15,
    spotsAvailable: 23,
    spotsTotal: 80,
    distanceKm: 1.2,
    modal: "bike",
    modalLabel: "Bicicleta",
    modalTime: 5,
    driveTime: 7,
    totalTime: 12,
    rating: 4.7,
    co2Saved: 0.9,
    badge: "Mais rápido",
    coords: { x: 32, y: 38 },
  },
  {
    id: "recife-antigo",
    name: "Estacionamento Recife Antigo",
    address: "Av. Rio Branco, 14 — Recife",
    price: 20,
    spotsAvailable: 7,
    spotsTotal: 60,
    distanceKm: 0.4,
    modal: "walk",
    modalLabel: "Caminhada",
    modalTime: 3,
    driveTime: 7,
    totalTime: 10,
    rating: 4.9,
    co2Saved: 1.2,
    badge: "Recomendado",
    coords: { x: 62, y: 48 },
  },
  {
    id: "tacaruna",
    name: "Shopping Tacaruna",
    address: "Av. Gov. Agamenon Magalhães",
    price: 10,
    spotsAvailable: 142,
    spotsTotal: 400,
    distanceKm: 3.5,
    modal: "bus",
    modalLabel: "Ônibus integrado",
    modalTime: 11,
    driveTime: 7,
    totalTime: 18,
    rating: 4.4,
    co2Saved: 2.1,
    badge: "Mais barato",
    coords: { x: 22, y: 18 },
  },
];

export const USER_METRICS = {
  timeSavedMin: 184,
  moneySaved: 312,
  co2AvoidedKg: 14.8,
  trips: 27,
  weeklyTrend: [3, 5, 2, 6, 4, 7, 5],
  modalSplit: [
    { modal: "Caminhada", pct: 42, color: "var(--color-brand)" },
    { modal: "Bicicleta", pct: 28, color: "oklch(0.65 0.16 220)" },
    { modal: "Ônibus", pct: 22, color: "oklch(0.7 0.16 50)" },
    { modal: "Shuttle", pct: 8, color: "oklch(0.6 0.18 300)" },
  ],
};
