import { useCallback, useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents, useMap } from "react-leaflet";
import { useAppStore } from "../../store/appStore";
import { reverseGeocode } from "../../utils/geocoding";
import { formatDegrees } from "../../utils/format";
import { ErrorBanner } from "../ErrorBanner";
import { SelectionMarker } from "./SelectionMarker";
import { SelectionCard } from "./SelectionCard";

export interface PendingSelection {
  lat: number;
  lon: number;
  label: string | null;
  loadingLabel: boolean;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const done = useRef<string | null>(null);
  if (target) {
    const key = `${target[0]},${target[1]}`;
    if (done.current !== key) {
      done.current = key;
      map.flyTo(target, Math.max(map.getZoom(), 6), { duration: 1.1 });
    }
  }
  return null;
}

export function WorldMap() {
  const enterSky = useAppStore((s) => s.enterSky);
  const setError = useAppStore((s) => s.setError);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const geocodeAbort = useRef<AbortController | null>(null);

  const pickPoint = useCallback(
    (lat: number, lon: number) => {
      geocodeAbort.current?.abort();
      const controller = new AbortController();
      geocodeAbort.current = controller;
      setPending({ lat, lon, label: null, loadingLabel: true });
      reverseGeocode(lat, lon, controller.signal).then((label) => {
        setPending((prev) =>
          prev && prev.lat === lat && prev.lon === lon ? { ...prev, label, loadingLabel: false } : prev
        );
      });
    },
    []
  );

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Геолокация не поддерживается этим браузером.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setFlyTarget([latitude, longitude]);
        pickPoint(latitude, longitude);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Доступ к геолокации запрещён. Выберите точку на карте вручную.");
        } else if (err.code === err.TIMEOUT) {
          setError("Не удалось определить местоположение: истекло время ожидания.");
        } else {
          setError("Не удалось определить местоположение. Выберите точку на карте вручную.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [pickPoint, setError]);

  const confirmSelection = useCallback(() => {
    if (!pending) return;
    enterSky({
      lat: pending.lat,
      lon: pending.lon,
      elevation: 0,
      label: pending.label ?? `${formatDegrees(pending.lat, "lat")}, ${formatDegrees(pending.lon, "lon")}`,
    });
  }, [pending, enterSky]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[25, 20]}
        zoom={3}
        minZoom={2}
        maxBounds={[
          [-90, -200],
          [90, 200],
        ]}
        worldCopyJump
        zoomControl={false}
        attributionControl={true}
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <ClickHandler onPick={pickPoint} />
        <FlyToController target={flyTarget} />
        {pending && <SelectionMarker lat={pending.lat} lon={pending.lon} />}
      </MapContainer>

      <TopHint show={!pending} />

      <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-col gap-2 sm:right-4 sm:top-4">
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="glass pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-slate-100 shadow-lg transition hover:bg-white/10 disabled:opacity-60"
        >
          <span className={locating ? "animate-spin" : ""}>{locating ? "◌" : "📍"}</span>
          Моё местоположение
        </button>
      </div>

      <ErrorBanner />

      {pending && (
        <SelectionCard
          selection={pending}
          onConfirm={confirmSelection}
          onDismiss={() => setPending(null)}
        />
      )}
    </div>
  );
}

function TopHint({ show }: { show: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-4 transition-opacity duration-300 sm:top-4 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5 text-center text-xs text-slate-200 shadow-lg sm:text-sm">
        <span>✨</span>
        Нажмите на любую точку Земли, чтобы увидеть небо над ней прямо сейчас
      </div>
    </div>
  );
}
