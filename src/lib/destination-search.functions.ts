import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SelectedDestination } from "./destinations";

interface PhotonFeature {
  properties?: {
    osm_type?: string;
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

const RECIFE_CENTER = { lat: -8.0476, lng: -34.877 };
const serverDestinationCache = new Map<string, SelectedDestination[]>();

const compactParts = (parts: Array<string | number | undefined>) =>
  parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .filter(
      (part, index, all) =>
        all.findIndex((item) => item.toLowerCase() === part.toLowerCase()) === index,
    );

function formatAddress(
  properties: NonNullable<PhotonFeature["properties"]>,
  fallbackName: string,
  queryHouseNumber?: string,
) {
  const houseNumber = properties.housenumber || queryHouseNumber;
  const streetLine = compactParts([properties.street || properties.name, houseNumber]).join(", ");
  return compactParts([
    properties.name || fallbackName,
    streetLine,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ]).join(" - ");
}

function extractHouseNumber(query: string) {
  return query.match(/\b\d+[a-zA-Z]?\b/)?.[0];
}

function toDestination(feature: PhotonFeature, query: string): SelectedDestination | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) return null;

  const properties = feature.properties ?? {};
  const queryHouseNumber = extractHouseNumber(query);
  const houseNumber = properties.housenumber || queryHouseNumber;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const streetLine = compactParts([properties.street || properties.name, houseNumber]).join(", ");
  const hasDistinctName =
    properties.name &&
    properties.street &&
    properties.name.toLowerCase() !== properties.street.toLowerCase();
  const name =
    hasDistinctName && streetLine
      ? `${properties.name} - ${streetLine}`
      : streetLine ||
        properties.name ||
        compactParts([properties.street, properties.district, properties.city]).join(", ") ||
        "Destino";

  return {
    name,
    formatted_address: formatAddress(properties, name, queryHouseNumber),
    lat,
    lng,
    place_id: `osm:${properties.osm_type ?? "unknown"}:${properties.osm_id ?? `${lng},${lat}`}`,
    provider: "photon",
  };
}

function recifePriority(destination: SelectedDestination) {
  const text = `${destination.formatted_address} ${destination.name}`.toLowerCase();
  if (text.includes("recife") && text.includes("pernambuco")) return 0;
  if (text.includes("recife")) return 1;
  if (text.includes("pernambuco")) return 2;
  if (text.includes("brasil") || text.includes("brazil")) return 3;
  return 4;
}

function searchableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function relevancePriority(destination: SelectedDestination, query: string) {
  const text = searchableText(`${destination.name} ${destination.formatted_address}`);
  const normalizedQuery = searchableText(query);
  const houseNumber = extractHouseNumber(query);

  if (normalizedQuery.includes("amaro") && text.includes("amaro")) return 0;
  if (normalizedQuery.includes("frege") && text.includes("frege")) return 0;
  if (normalizedQuery.includes("cesar") && text.includes("cesar")) return 0;
  if (normalizedQuery.includes("brum") && text.includes("brum")) return 1;
  if (houseNumber && text.includes(houseNumber)) return 2;
  return 3;
}

async function fetchPhoton(query: string) {
  const params = new URLSearchParams({
    q: query,
    limit: "5",
    lang: "default",
    lat: String(RECIFE_CENTER.lat),
    lon: String(RECIFE_CENTER.lng),
  });

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!response.ok) throw new Error("Photon search failed");

  const payload = (await response.json()) as PhotonResponse;
  return payload.features ?? [];
}

function buildSearchQueries(query: string) {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();
  const shouldAddRecifeContext =
    !normalized.includes("recife") &&
    !normalized.includes("pernambuco") &&
    !normalized.includes("brasil") &&
    !normalized.includes("brazil");

  const queries = new Set<string>([
    trimmed,
    shouldAddRecifeContext ? `${trimmed} Recife Pernambuco Brasil` : trimmed,
  ]);

  const addressMatch = trimmed.match(
    /\b(?:avenida|av\.?|rua|r\.?|travessa|estrada|praça|praca|cais|alameda)\s+[\p{L}\p{M}\d\s.'-]*?\b\d+[a-zA-Z]?\b/iu,
  );

  if (addressMatch?.[0]) {
    const addressQuery = addressMatch[0].replace(/\s+/g, " ").trim();
    queries.add(addressQuery);
    queries.add(`${addressQuery} Recife Pernambuco Brasil`);
  }

  const roadIndex = normalized.search(
    /\b(?:avenida|av\.?|rua|r\.?|travessa|estrada|praça|praca|cais|alameda)\b/i,
  );

  if (roadIndex > 0) {
    const placeQuery = trimmed.slice(0, roadIndex).replace(/\s+/g, " ").trim();
    if (placeQuery.length >= 3) {
      queries.add(placeQuery);
      queries.add(`${placeQuery} Recife Pernambuco Brasil`);
    }
  }

  if (normalized.includes("cesar school") || normalized.includes("cesar")) {
    queries.add("CESAR School Recife");
    queries.add("Cesar School Cais do Apolo Recife");
  }

  if (normalized.includes("amaro")) {
    queries.add("Amaro Cafe Recife Antigo");
    queries.add("Amaro Cafe Rua do Apolo Recife");
    queries.add("Rua do Apolo 182 Recife");
  }

  if (normalized.includes("frege")) {
    queries.add("Frege Recife Antigo");
    queries.add("Frege Avenida Rio Branco Recife");
    queries.add("Avenida Rio Branco 155 Recife");
  }

  return [...queries].slice(0, 8);
}

export const searchPhotonDestinations = createServerFn({ method: "GET" })
  .inputValidator(z.object({ query: z.string().min(3).max(120) }))
  .handler(async ({ data }) => {
    const normalized = data.query.trim().toLowerCase();
    const cached = serverDestinationCache.get(normalized);
    if (cached) return cached;

    const seen = new Set<string>();
    const features = (
      await Promise.all(buildSearchQueries(data.query).map((query) => fetchPhoton(query)))
    ).flat();

    const destinations = features
      .map((feature) => toDestination(feature, data.query))
      .filter((destination): destination is SelectedDestination => destination != null)
      .sort(
        (a, b) =>
          relevancePriority(a, data.query) - relevancePriority(b, data.query) ||
          recifePriority(a) - recifePriority(b),
      )
      .filter((destination) => {
        const key = `${destination.place_id}:${destination.name}:${destination.formatted_address}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);

    serverDestinationCache.set(normalized, destinations);
    return destinations;
  });
