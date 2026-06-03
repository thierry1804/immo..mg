"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type LngLatBounds, type Map as MlMap } from "maplibre-gl";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import Supercluster from "supercluster";
import { fokontanyGeoJSON } from "@/lib/fokontany";
import {
  fokontanyWithMedian,
  getMapStyle,
  isochroneGeoJSON,
} from "@/lib/map-layers";
import { shortPriceLabel } from "@/lib/format";

export type MapMarker = {
  id: string;
  lng: number;
  lat: number;
  price?: number;
  transactionType?: "sale" | "rent";
  topMatch?: boolean;
  highlighted?: boolean;
  label?: string;
  onClick?: () => void;
};

export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type MapHandle = {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
};

type Props = {
  initialCenter?: [number, number];
  initialZoom?: number;
  markers?: MapMarker[];
  picker?: { lng: number; lat: number } | null;
  onPick?: (coords: { lng: number; lat: number }) => void;
  onMoveEnd?: (bbox: Bbox) => void;
  showFokontany?: boolean;
  showMedianLayer?: boolean;
  showIsochrone?: boolean;
  marketMedians?: { fokontany: string; medianPricePerSqm: number }[];
  flyToTarget?: { lng: number; lat: number } | null;
  className?: string;
};

const OSM_MAX_ZOOM = 19;
const CLUSTER_THRESHOLD = 35;
/** Ignore degenerate bounds when the map container is not laid out yet. */
const MIN_BBOX_SPAN = 0.03;

function boundsSpanOk(bounds: LngLatBounds): boolean {
  const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth());
  const lngSpan = Math.abs(bounds.getEast() - bounds.getWest());
  return latSpan >= MIN_BBOX_SPAN && lngSpan >= MIN_BBOX_SPAN;
}

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

function applyMarkerEl(el: HTMLElement, m: MapMarker) {
  const text =
    m.price !== undefined && m.transactionType
      ? shortPriceLabel(m.price, m.transactionType)
      : (m.label ?? "•");
  let tone = m.topMatch
    ? "background:var(--gold);color:var(--navy);box-shadow:var(--shadow-top-match)"
    : "background:var(--navy);color:var(--paper)";
  if (m.highlighted) tone += ";transform:scale(1.15);box-shadow:0 0 0 3px var(--gold)";
  el.className =
    "flex h-7 cursor-pointer items-center justify-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums shadow ring-2 ring-white transition";
  el.style.cssText = tone;
  el.textContent = text;
}

const Map = forwardRef<MapHandle, Props>(function Map(
  {
    initialCenter = [47.5079, -18.8792],
    initialZoom = 11,
    markers = [],
    picker,
    onPick,
    onMoveEnd,
    showFokontany = false,
    showMedianLayer = false,
    showIsochrone = false,
    marketMedians = [],
    flyToTarget = null,
    className,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pickerRef = useRef<maplibregl.Marker | null>(null);
  const mapLoadedRef = useRef(false);
  const onMoveEndRef = useRef(onMoveEnd);
  const onPickRef = useRef(onPick);

  useImperativeHandle(ref, () => ({
    flyTo(lng: number, lat: number, zoom = 14) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 800 });
    },
  }));

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
    onPickRef.current = onPick;
  }, [onMoveEnd, onPick]);

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    for (const mk of markersRef.current) mk.remove();
    markersRef.current = [];
    if (markers.length === 0) return;

    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const place = (lng: number, lat: number, el: HTMLElement) => {
      markersRef.current.push(
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map),
      );
    };

    if (markers.length >= CLUSTER_THRESHOLD) {
      const index = new Supercluster({ radius: 50, maxZoom: 16 });
      index.load(
        markers.map((mk) => ({
          type: "Feature" as const,
          properties: { cluster: false, marker: mk },
          geometry: {
            type: "Point" as const,
            coordinates: [mk.lng, mk.lat],
          },
        })),
      );
      const zoom = Math.floor(map.getZoom());
      for (const c of index.getClusters(bbox, zoom)) {
        const [lng, lat] = c.geometry.coordinates;
        const el = document.createElement("div");
        if (c.properties.cluster) {
          el.className =
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-navy text-xs font-bold text-paper shadow ring-2 ring-white";
          el.textContent = String(c.properties.point_count);
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            map.flyTo({ center: [lng, lat], zoom: zoom + 2 });
          });
        } else {
          const mk = c.properties.marker as MapMarker;
          applyMarkerEl(el, mk);
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            mk.onClick?.();
          });
        }
        place(lng, lat, el);
      }
      return;
    }

    for (const mk of markers) {
      const el = document.createElement("div");
      applyMarkerEl(el, mk);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        mk.onClick?.();
      });
      place(mk.lng, mk.lat, el);
    }
  }, [markers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle() as unknown as maplibregl.StyleSpecification,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: OSM_MAX_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapLoadedRef.current = true;
      if (showFokontany || showMedianLayer) {
        const data = showMedianLayer
          ? fokontanyWithMedian(marketMedians)
          : fokontanyGeoJSON();
        map.addSource("fokontany", { type: "geojson", data });
        map.addLayer({
          id: "fokontany-fill",
          type: "fill",
          source: "fokontany",
          paint: {
            "fill-color": "#c9a227",
            "fill-opacity": showMedianLayer ? ["get", "fillOpacity"] : 0.06,
          },
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
      }
      if (showIsochrone) {
        map.addSource("isochrone", {
          type: "geojson",
          data: isochroneGeoJSON(),
        });
        map.addLayer({
          id: "isochrone-fill",
          type: "fill",
          source: "isochrone",
          paint: { "fill-color": "#1a3a5c", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "isochrone-line",
          type: "line",
          source: "isochrone",
          paint: {
            "line-color": "#1a3a5c",
            "line-width": 2,
            "line-opacity": 0.35,
          },
        });
      }
      const emitBbox = () => {
        const bounds = map.getBounds();
        if (!boundsSpanOk(bounds)) return;
        onMoveEndRef.current?.(bboxFromBounds(bounds));
      };
      emitBbox();
      map.once("idle", emitBbox);
      requestAnimationFrame(() => requestAnimationFrame(emitBbox));
      syncMarkers();
    });

    map.on("moveend", () => {
      const bounds = map.getBounds();
      if (boundsSpanOk(bounds)) {
        onMoveEndRef.current?.(bboxFromBounds(bounds));
      }
      syncMarkers();
    });
    map.on("click", (e) => {
      onPickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: 14,
        duration: 800,
      });
    }
  }, [flyToTarget]);

  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource("fokontany") as maplibregl.GeoJSONSource | undefined;
    if (src && showMedianLayer) {
      src.setData(fokontanyWithMedian(marketMedians));
    }
  }, [marketMedians, showMedianLayer]);

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
});

export default Map;
