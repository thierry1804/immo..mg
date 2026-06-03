import { FOKONTANY, fokontanyGeoJSON } from "@/lib/fokontany";

/** Default viewport for Antananarivo (matches initial map zoom ~11). */
export const DEFAULT_TANA_BBOX = {
  minLng: 47.4,
  minLat: -19.0,
  maxLng: 47.6,
  maxLat: -18.8,
} as const;

/** Circle ~4 km radius around central Tana (15 min drive MVP). */
export function isochroneGeoJSON(): GeoJSON.FeatureCollection {
  const centerLng = 47.5079;
  const centerLat = -18.8792;
  const radiusKm = 4;
  const points = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const latRad = (centerLat * Math.PI) / 180;
    const dLat = (radiusKm / 6371) * Math.cos(angle) * (180 / Math.PI);
    const dLng =
      ((radiusKm / 6371) * Math.sin(angle) * (180 / Math.PI)) /
      Math.cos(latRad);
    coords.push([centerLng + dLng, centerLat + dLat]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "15 min centre" },
        geometry: { type: "Polygon", coordinates: [coords] },
      },
    ],
  };
}

export function fokontanyWithMedian(
  medians: { fokontany: string; medianPricePerSqm: number }[],
): GeoJSON.FeatureCollection {
  const byName = new Map(medians.map((m) => [m.fokontany, m.medianPricePerSqm]));
  const max =
    medians.length > 0
      ? Math.max(...medians.map((m) => m.medianPricePerSqm))
      : 1;
  const base = fokontanyGeoJSON();
  return {
    ...base,
    features: base.features.map((f) => {
      const name = String(f.properties?.name ?? "");
      const median = byName.get(name);
      const opacity =
        median != null && max > 0
          ? 0.08 + 0.22 * (median / max)
          : 0.04;
      return {
        ...f,
        properties: {
          ...f.properties,
          median,
          fillOpacity: opacity,
        },
      };
    }),
  };
}

const OSM_MAX_ZOOM = 19;

export function getMapStyle() {
  const key =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPTILER_KEY
      : undefined;
  if (key) {
    return {
      version: 8 as const,
      sources: {
        basemap: {
          type: "raster" as const,
          tiles: [
            `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${key}`,
          ],
          tileSize: 256,
          attribution: "© MapTiler © OpenStreetMap contributors",
        },
      },
      layers: [
        {
          id: "basemap",
          type: "raster" as const,
          source: "basemap",
        },
      ],
    };
  }
  return {
    version: 8 as const,
    sources: {
      osm: {
        type: "raster" as const,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: OSM_MAX_ZOOM,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster" as const,
        source: "osm",
        maxzoom: 22,
      },
    ],
  };
}
