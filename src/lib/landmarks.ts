import { haversineKm } from "@/lib/fokontany";

/** Repères précis (OSM / adresses publiques) — prioritaires sur les centroïdes quartier. */
export type Landmark = {
  name: string;
  lng: number;
  lat: number;
  /** Quartier parent pour filtres / médiane */
  fokontany: string;
  aliases: string[];
};

/** Centre de l'aéroport Ivato (TNR) — à éviter pour les annonces résidentielles. */
export const IVATO_AIRPORT = { lng: 47.4789, lat: -18.7969 };

export const LANDMARKS: Landmark[] = [
  {
    name: "Paon d'Or",
    lng: 47.4697,
    lat: -18.8353,
    fokontany: "Antanetibe",
    aliases: [
      "paon d or",
      "paon d'or",
      "paon dor",
      "paon d&#39;or",
      "hotel paon",
    ],
  },
  {
    name: "Leader Price Ivato",
    lng: 47.476,
    lat: -18.828,
    fokontany: "Antanetibe",
    aliases: ["leader price"],
  },
  {
    name: "Croc Farm",
    lng: 47.452,
    lat: -18.852,
    fokontany: "Ivato",
    aliases: ["croc farm", "crocfarm"],
  },
  {
    name: "Gare Soarano",
    lng: 47.5210347,
    lat: -18.9031635,
    fokontany: "Antaninarenina",
    aliases: [
      "gare soarano",
      "gare de soarano",
      "soarano",
      "station soarano",
    ],
  },
];

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
}

export function isNearIvatoAirport(
  lng: number,
  lat: number,
  maxKm = 0.85,
): boolean {
  return haversineKm(lng, lat, IVATO_AIRPORT.lng, IVATO_AIRPORT.lat) <= maxKm;
}

/** Repère cité explicitement (nom ou alias). */
export function matchLandmark(text: string): Landmark | null {
  const folded = fold(text);
  let best: { lm: Landmark; len: number } | null = null;
  for (const lm of LANDMARKS) {
    const keys = [lm.name, ...lm.aliases].map(fold);
    for (const key of keys) {
      if (key.length < 4 || !folded.includes(key)) continue;
      if (!best || key.length > best.len) {
        best = { lm, len: key.length };
      }
    }
  }
  return best?.lm ?? null;
}

/** Cible après « près de / proche de ». */
export function extractProximityTarget(text: string): string | null {
  const re =
    /(?:près de|proche de|proche|à côté de|face à)\s+([A-Za-zÀ-ÿ0-9''\-\s]+?)(?:\s*,|\.|$|\s+et\s)/i;
  const m = re.exec(text);
  if (!m?.[1]) return null;
  const t = m[1].trim().replace(/\s+/g, " ");
  return t.length >= 3 ? t : null;
}

export function mentionsAirport(text: string): boolean {
  return /aéroport|aeroport|airport|\bTNR\b/i.test(text);
}
