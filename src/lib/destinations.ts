import { searchPhotonDestinations } from "./destination-search.functions";

export interface SelectedDestination {
  name: string;
  formatted_address: string;
  lat: number;
  lng: number;
  place_id: string;
  provider: "photon";
}

type CuratedDestination = SelectedDestination & {
  aliases?: string[];
};

const RECIFE_CENTER = { lat: -8.0476, lng: -34.877 };
const destinationCache = new Map<string, SelectedDestination[]>();

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const slugify = (value: string) =>
  normalizeSearchText(value).replace(/\s+/g, "-").replace(/^-|-$/g, "");

const QUICK_DESTINATION_DETAILS: Record<string, Omit<SelectedDestination, "provider">> = {
  "Marco Zero, Recife Antigo": {
    name: "Marco Zero",
    formatted_address: "Marco Zero - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0631,
    lng: -34.8711,
    place_id: "osm:quick:marco-zero-recife",
  },
  "Paço do Frevo": {
    name: "Paço do Frevo",
    formatted_address: "Praça do Arsenal - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0616,
    lng: -34.8725,
    place_id: "osm:quick:paco-do-frevo",
  },
  "Rua do Bom Jesus": {
    name: "Rua do Bom Jesus",
    formatted_address: "Rua do Bom Jesus - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0611,
    lng: -34.8714,
    place_id: "osm:quick:rua-do-bom-jesus",
  },
  "Cais do Sertão": {
    name: "Cais do Sertão",
    formatted_address: "Armazém 10 - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0615,
    lng: -34.8696,
    place_id: "osm:quick:cais-do-sertao",
  },
  "Praça do Arsenal": {
    name: "Praça do Arsenal",
    formatted_address: "Praça do Arsenal - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0618,
    lng: -34.8726,
    place_id: "osm:quick:praca-do-arsenal",
  },
};

const CURATED_RECIFE_ANTIGO_DESTINATIONS: CuratedDestination[] = [
  {
    name: "Amaro Café e Restaurante",
    formatted_address: "Rua do Apolo, 182 - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0609,
    lng: -34.8726,
    place_id: "osm:curated:amaro-cafe-restaurante",
    provider: "photon",
    aliases: ["Amaro Café", "Amaro Café e Gastronomia", "Amaro Recife Antigo"],
  },
  {
    name: "Frege Bar e Restaurante",
    formatted_address: "Avenida Rio Branco, 155 - Recife Antigo - Recife - Pernambuco - Brasil",
    lat: -8.0632,
    lng: -34.8724,
    place_id: "osm:curated:frege-bar-restaurante",
    provider: "photon",
    aliases: ["Restaurante Frege", "Frege Recife Antigo"],
  },
  {
    name: "CESAR School - Prédio Brum",
    formatted_address:
      "Avenida Cais do Apolo, 77 - Bairro do Recife - Recife - Pernambuco - Brasil",
    lat: -8.0583,
    lng: -34.87195,
    place_id: "osm:curated:cesar-school-predio-brum",
    provider: "photon",
  },
  {
    name: "CESAR School - Tiradentes",
    formatted_address:
      "Rua Bione, Cais do Apolo, 220 - Bairro do Recife - Recife - Pernambuco - Brasil",
    lat: -8.0577,
    lng: -34.872,
    place_id: "osm:curated:cesar-school-tiradentes",
    provider: "photon",
  },
  {
    name: "CESAR School - Apolo",
    formatted_address: "Cais do Apolo, 463 - Bairro do Recife - Recife - Pernambuco - Brasil",
    lat: -8.0562,
    lng: -34.8722,
    place_id: "osm:curated:cesar-school-apolo",
    provider: "photon",
  },
];

function curatedDestinationMatches(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 3) return [];
  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 2);

  return CURATED_RECIFE_ANTIGO_DESTINATIONS.filter((destination) => {
    const haystack = normalizeSearchText(
      `${destination.name} ${destination.formatted_address} ${destination.aliases?.join(" ") ?? ""}`,
    );
    return (
      haystack.includes(normalizedQuery) ||
      queryTokens.every((token) => haystack.includes(token)) ||
      (normalizedQuery.includes("frege") && haystack.includes("frege")) ||
      (normalizedQuery.includes("amaro") && haystack.includes("amaro")) ||
      (normalizedQuery.includes("cesar") && haystack.includes("cesar"))
    );
  });
}

function mergeDestinations(
  curated: SelectedDestination[],
  photon: SelectedDestination[],
): SelectedDestination[] {
  const seen = new Set<string>();
  const merged: SelectedDestination[] = [];

  for (const destination of [...curated, ...photon]) {
    const key = `${destination.place_id}:${normalizeSearchText(destination.formatted_address)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(destination);
  }

  return merged.slice(0, 5);
}

export async function searchDestinations(
  query: string,
  signal?: AbortSignal,
): Promise<SelectedDestination[]> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 3) return [];

  const cached = destinationCache.get(normalized);
  if (cached) return cached;

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const curated = curatedDestinationMatches(query);
  let destinations: SelectedDestination[];
  try {
    destinations = await searchPhotonDestinations({ data: { query: query.trim() } });
  } catch (error) {
    if (curated.length > 0) {
      destinationCache.set(normalized, curated);
      return curated;
    }
    throw error;
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const merged = mergeDestinations(curated, destinations);
  destinationCache.set(normalized, merged);
  return merged;
}

export function quickDestinationFromLabel(label: string): SelectedDestination {
  const details = QUICK_DESTINATION_DETAILS[label];
  if (details) {
    return { ...details, provider: "photon" };
  }

  return {
    name: label.split(",")[0] || label,
    formatted_address: label,
    lat: RECIFE_CENTER.lat,
    lng: RECIFE_CENTER.lng,
    place_id: `osm:quick:${slugify(label)}`,
    provider: "photon",
  };
}

export function typedDestinationFromQuery(query: string): SelectedDestination {
  const normalized = query.trim().replace(/\s+/g, " ");
  const formatted = normalized.toLowerCase().includes("recife")
    ? normalized
    : `${normalized} - Recife - Pernambuco - Brasil`;

  return {
    name: normalized,
    formatted_address: formatted,
    lat: RECIFE_CENTER.lat,
    lng: RECIFE_CENTER.lng,
    place_id: `osm:typed:${slugify(normalized)}`,
    provider: "photon",
  };
}
