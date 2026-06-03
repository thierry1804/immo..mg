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
  /** Agglomération Ivato (hors piste) — centroïde côté Antanetibe / Paon d'Or */
  { name: "Ivato", lng: 47.472, lat: -18.832, radiusKm: 2.2 },
  { name: "Anjomakely", lng: 47.465, lat: -18.818, radiusKm: 1.5 },
  /** Antanetibe : zone Paon d'Or / Leader Price, pas l'aéroport */
  { name: "Antanetibe", lng: 47.4697, lat: -18.8353, radiusKm: 1.5 },
  {
    name: "Andrefan'ambohijanahary",
    lng: 47.448,
    lat: -18.872,
    radiusKm: 2,
  },
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

/**
 * Build a GeoJSON FeatureCollection of polygon circles (one per neighborhood)
 * approximating each fokontany's radius, for the translucent map layer. Pure —
 * returns plain GeoJSON; the map component styles and adds it.
 */
export function fokontanyGeoJSON(steps = 48): {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties: { name: string };
    geometry: { type: "Polygon"; coordinates: number[][][] };
  }[];
} {
  const features = FOKONTANY.map((f) => {
    // Degrees per km: latitude ~constant; longitude scaled by cos(lat).
    const dLat = f.radiusKm / 110.574;
    const dLng = f.radiusKm / (111.32 * Math.cos(toRad(f.lat)));
    const ring: number[][] = [];
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      ring.push([
        f.lng + dLng * Math.cos(theta),
        f.lat + dLat * Math.sin(theta),
      ]);
    }
    return {
      type: "Feature" as const,
      properties: { name: f.name },
      geometry: { type: "Polygon" as const, coordinates: [ring] },
    };
  });
  return { type: "FeatureCollection", features };
}

/** Find the longest neighborhood name mentioned in free text (NLP / autocomplete). */
export function fokontanyCentroid(
  name: string,
): { lng: number; lat: number } | null {
  const f = FOKONTANY.find((x) => x.name === name);
  return f ? { lng: f.lng, lat: f.lat } : null;
}

export function matchFokontanyByName(text: string): string | null {
  const folded = fold(text);
  let best: { name: string; len: number } | null = null;
  for (const f of FOKONTANY) {
    const key = fold(f.name);
    if (folded.includes(key) && (!best || key.length > best.len)) {
      best = { name: f.name, len: key.length };
    }
  }
  return best?.name ?? null;
}
