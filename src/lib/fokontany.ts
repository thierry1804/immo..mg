/**
 * Antananarivo neighborhoods (fokontany / quartiers). Coordinates are
 * APPROXIMATE centroids (hand-placed from OSM), sufficient for nearest-match
 * resolution, autocomplete, and map layers. Pure module — no DB/network.
 */
export type Fokontany = {
  name: string;
  lng: number;
  lat: number;
  radiusKm: number;
};

export const FOKONTANY: Fokontany[] = [
  { name: "Ivandry", lng: 47.5286, lat: -18.8694, radiusKm: 1.5 },
  { name: "Ankorondrano", lng: 47.5236, lat: -18.8853, radiusKm: 1.5 },
  { name: "Andraharo", lng: 47.5111, lat: -18.8806, radiusKm: 1.5 },
  { name: "Ambohijatovo", lng: 47.5269, lat: -18.9136, radiusKm: 1.2 },
  { name: "Ankadivato", lng: 47.5253, lat: -18.9075, radiusKm: 1.0 },
  { name: "Analakely", lng: 47.5211, lat: -18.9100, radiusKm: 1.0 },
  { name: "Isoraka", lng: 47.5197, lat: -18.9119, radiusKm: 0.9 },
  { name: "Antaninarenina", lng: 47.5244, lat: -18.9089, radiusKm: 0.9 },
  { name: "Ambatobe", lng: 47.5489, lat: -18.8736, radiusKm: 1.5 },
  { name: "Ivato", lng: 47.4789, lat: -18.7969, radiusKm: 2.5 },
  { name: "Tsimbazaza", lng: 47.5256, lat: -18.9242, radiusKm: 1.0 },
  { name: "Andohalo", lng: 47.5314, lat: -18.9203, radiusKm: 0.9 },
];

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lng/lat points, in kilometers. */
export function haversineKm(
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
}

/**
 * Resolve a coordinate to the nearest neighborhood whose centroid is within
 * its radius. Returns null if the point falls outside every neighborhood.
 */
export function resolveFokontany(lng: number, lat: number): string | null {
  let best: { name: string; dist: number } | null = null;
  for (const f of FOKONTANY) {
    const dist = haversineKm(lng, lat, f.lng, f.lat);
    if (dist <= f.radiusKm && (best === null || dist < best.dist)) {
      best = { name: f.name, dist };
    }
  }
  return best?.name ?? null;
}

/** Find the first neighborhood named in free text (NLP / autocomplete). */
export function matchFokontanyByName(text: string): string | null {
  const folded = fold(text);
  for (const f of FOKONTANY) {
    if (folded.includes(fold(f.name))) return f.name;
  }
  return null;
}
