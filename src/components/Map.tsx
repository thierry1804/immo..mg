"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type LngLatBounds, type Map as MlMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { fokontanyGeoJSON } from "@/lib/fokontany";
import { shortPriceLabel } from "@/lib/format";

export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  price?: number;
  transactionType?: "sale" | "rent";
  topMatch?: boolean;
  /** Used when price/transactionType are absent. */
  label?: string;
  onClick?: () => void;
};

export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type Props = {
  initialCenter?: [number, number];
  initialZoom?: number;
  markers?: MapMarker[];
  picker?: { lng: number; lat: number } | null;
  onPick?: (coords: { lng: number; lat: number }) => void;
  onMoveEnd?: (bbox: Bbox) => void;
  /** Draw the translucent fokontany (neighborhood) layer. */
  showFokontany?: boolean;
  className?: string;
};

const OSM_MAX_ZOOM = 19;
const OSM_STYLE = {
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

function bboxFromBounds(bounds: LngLatBounds): Bbox {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return {
    minLng: sw.lng,
    minLat: sw.lat,
    maxLng: ne.lng,
    maxLat: ne.lat,
  };
}

export default function Map({
  initialCenter = [47.5079, -18.8792], // Antananarivo
  initialZoom = 11,
  markers = [],
  picker,
  onPick,
  onMoveEnd,
  showFokontany = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickerRef = useRef<maplibregl.Marker | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
    onPickRef.current = onPick;
  }, [onMoveEnd, onPick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: OSM_MAX_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (showFokontany) {
        map.addSource("fokontany", {
          type: "geojson",
          data: fokontanyGeoJSON(),
        });
        map.addLayer({
          id: "fokontany-fill",
          type: "fill",
          source: "fokontany",
          paint: { "fill-color": "#1a3a5c", "fill-opacity": 0.06 },
        });
        map.addLayer({
          id: "fokontany-line",
          type: "line",
          source: "fokontany",
          paint: {
            "line-color": "#2b5176",
            "line-width": 1,
            "line-dasharray": [2, 2],
            "line-opacity": 0.5,
          },
        });
        map.addLayer({
          id: "fokontany-label",
          type: "symbol",
          source: "fokontany",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-transform": "uppercase",
            "text-letter-spacing": 0.08,
          },
          paint: {
            "text-color": "#1a3a5c",
            "text-halo-color": "#fafaf8",
            "text-halo-width": 1.4,
            "text-opacity": 0.75,
          },
        });
      }
      onMoveEndRef.current?.(bboxFromBounds(map.getBounds()));
    });
    map.on("moveend", () => {
      onMoveEndRef.current?.(bboxFromBounds(map.getBounds()));
    });
    map.on("click", (e) => {
      onPickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = markers.map((m) => {
      const el = document.createElement("div");
      const text =
        m.price !== undefined && m.transactionType
          ? shortPriceLabel(m.price, m.transactionType)
          : (m.label ?? "•");
      const tone = m.topMatch
        ? "background:var(--gold);color:var(--navy);box-shadow:var(--shadow-top-match)"
        : "background:var(--navy);color:var(--paper)";
      el.className =
        "flex h-7 cursor-pointer items-center justify-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums shadow ring-2 ring-white transition";
      el.style.cssText = tone;
      el.textContent = text;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        m.onClick?.();
      });
      return new maplibregl.Marker({ element: el })
        .setLngLat([m.lng, m.lat])
        .addTo(map);
    });
  }, [markers]);

  // picker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picker) {
      pickerRef.current?.remove();
      pickerRef.current = null;
      return;
    }
    if (!pickerRef.current) {
      const el = document.createElement("div");
      el.className =
        "h-5 w-5 rounded-full border-2 border-white bg-red-600 shadow";
      pickerRef.current = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([picker.lng, picker.lat])
        .addTo(map);
      pickerRef.current.on("dragend", () => {
        const ll = pickerRef.current!.getLngLat();
        onPickRef.current?.({ lng: ll.lng, lat: ll.lat });
      });
    } else {
      pickerRef.current.setLngLat([picker.lng, picker.lat]);
    }
  }, [picker]);

  return <div ref={containerRef} className={className} />;
}
