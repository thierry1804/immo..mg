export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export function parseBbox(value: string | null | undefined): Bbox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (
    minLng < -180 ||
    maxLng > 180 ||
    minLat < -90 ||
    maxLat > 90 ||
    minLng >= maxLng ||
    minLat >= maxLat
  ) {
    return null;
  }
  return { minLng, minLat, maxLng, maxLat };
}
