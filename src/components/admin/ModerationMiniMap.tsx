"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { getMapStyle } from "@/lib/map-layers";

export default function ModerationMiniMap({
  listingId,
  lat,
  lng,
  label,
}: {
  listingId: string;
  lat: number;
  lng: number;
  label: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "160px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle() as maplibregl.StyleSpecification,
      center: [lng, lat],
      zoom: 10,
      interactive: false,
      attributionControl: false,
    });

    const pin = document.createElement("div");
    pin.className =
      "flex max-w-[8rem] flex-col items-center gap-0.5 pointer-events-none";
    const dot = document.createElement("span");
    dot.className = "h-3 w-3 rounded-full border-2 border-white bg-gold shadow";
    pin.appendChild(dot);
    if (label) {
      const tag = document.createElement("span");
      tag.className =
        "rounded bg-navy/90 px-1.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-paper shadow";
      tag.textContent = label;
      pin.appendChild(tag);
    }

    const marker = new maplibregl.Marker({ element: pin, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(map);

    const onLoad = () => map.resize();
    map.once("load", onLoad);

    return () => {
      marker.remove();
      map.remove();
    };
  }, [visible, listingId, lat, lng, label]);

  return (
    <div
      ref={containerRef}
      className="h-28 w-full bg-paper-2"
      data-listing-map={listingId}
    />
  );
}
