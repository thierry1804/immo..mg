"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import Ico from "@/components/immo/Ico";
import { getMapStyle } from "@/lib/map-layers";

type Props = {
  listingId: string;
  lat: number;
  lng: number;
  fokontany: string | null;
  manual: boolean;
};

type PositionResponse = {
  ok?: boolean;
  manual?: boolean;
  lng?: number;
  lat?: number;
  fokontany?: string | null;
  error?: string;
};

export default function ModerationPositionEditor({
  listingId,
  lat,
  lng,
  fokontany,
  manual,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [visible, setVisible] = useState(false);

  const [pos, setPos] = useState({ lng, lat });
  const [fok, setFok] = useState(fokontany);
  const [isManual, setIsManual] = useState(manual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persiste un point choisi (ou réinitialise) côté serveur.
  async function persist(body: { lng: number; lat: number } | { reset: true }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/listings/${listingId}/position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as PositionResponse;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return null;
      }
      setFok(data.fokontany ?? null);
      setIsManual(Boolean(data.manual));
      if (typeof data.lng === "number" && typeof data.lat === "number") {
        setPos({ lng: data.lng, lat: data.lat });
        markerRef.current?.setLngLat([data.lng, data.lat]);
        mapRef.current?.easeTo({ center: [data.lng, data.lat] });
      }
      return data;
    } catch {
      setError("Réseau indisponible.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  // Déplacement manuel (glisser ou clic) → enregistrement immédiat.
  function setPoint(next: { lng: number; lat: number }) {
    setPos(next);
    markerRef.current?.setLngLat([next.lng, next.lat]);
    void persist(next);
  }

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
    if (!visible || !containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle() as unknown as maplibregl.StyleSpecification,
      center: [pos.lng, pos.lat],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const pin = document.createElement("div");
    pin.className = "flex flex-col items-center";
    const dot = document.createElement("span");
    dot.className =
      "h-4 w-4 rounded-full border-2 border-white bg-gold shadow ring-2 ring-gold/40";
    pin.appendChild(dot);

    const marker = new maplibregl.Marker({
      element: pin,
      anchor: "center",
      draggable: true,
    })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      setPoint({ lng: ll.lng, lat: ll.lat });
    });
    map.on("click", (e) => {
      setPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    map.once("load", () => map.resize());

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init unique à l'apparition ; les MAJ de position passent par les refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const osmHref = `https://www.openstreetmap.org/?mlat=${pos.lat}&mlon=${pos.lng}#map=16/${pos.lat}/${pos.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-2">
      <div ref={containerRef} className="h-44 w-full bg-paper-2" />
      <div className="space-y-1.5 px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 font-medium text-navy">
            <Ico name="pin" size={12} className="text-gold-700" />
            {fok ?? "Hors quartier connu"}
          </span>
          <span className="font-mono text-ink-2">
            {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isManual
                ? "bg-present-bg text-present"
                : "bg-paper text-ink-2 ring-1 ring-line"
            }`}
          >
            {isManual ? "Position manuelle (verrouillée)" : "Position automatique"}
          </span>
          <div className="flex items-center gap-2">
            {saving ? (
              <span className="text-[10px] text-muted">Enregistrement…</span>
            ) : null}
            {isManual ? (
              <button
                type="button"
                onClick={() => void persist({ reset: true })}
                disabled={saving}
                className="focus-gold rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-navy hover:border-navy-300 disabled:opacity-50"
              >
                Réinitialiser auto
              </button>
            ) : null}
            <a
              href={osmHref}
              target="_blank"
              rel="noreferrer noopener"
              className="focus-gold text-[10px] font-semibold text-navy underline-offset-2 hover:underline"
            >
              OSM
            </a>
          </div>
        </div>
        {error ? (
          <p className="rounded bg-absent-bg px-2 py-1 text-[10px] text-navy" role="alert">
            {error}
          </p>
        ) : null}
        <p className="text-[10px] leading-snug text-muted">
          Glissez le marqueur ou cliquez sur la carte pour corriger la position.
          Elle sera conservée à la validation.
        </p>
      </div>
    </div>
  );
}
