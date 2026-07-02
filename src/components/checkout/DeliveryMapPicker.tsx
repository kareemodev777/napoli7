"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SHOP_LOCATION } from "@/lib/delivery-map";

export interface PickedLocation {
  lat: number;
  lng: number;
}

// Shop location — the initial map center before the customer drops a pin, and
// the centre of the delivery radius.
const AJMAN_CENTER: PickedLocation = {
  lat: SHOP_LOCATION.lat,
  lng: SHOP_LOCATION.lng,
};

// Leaflet's default marker images break under bundlers, so point the icon at the
// pinned CDN assets explicitly.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

async function reverseGeocode(loc: PickedLocation): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const parts = [
      a.road,
      a.neighbourhood ?? a.suburb ?? a.residential,
      a.city ?? a.town ?? a.village,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name;
  } catch {
    return undefined;
  }
}

function ClickCapture({ onPick }: { onPick: (loc: PickedLocation) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Smoothly recenters the map when `to` changes (used by "Use my location"). */
function FlyTo({ to }: { to: PickedLocation | null }) {
  const map = useMap();
  const last = useRef<PickedLocation | null>(null);
  useEffect(() => {
    if (!to) return;
    if (last.current?.lat === to.lat && last.current?.lng === to.lng) return;
    last.current = to;
    map.flyTo([to.lat, to.lng], 16);
  }, [to, map]);
  return null;
}

export default function DeliveryMapPicker({
  value,
  onChange,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation, address?: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const [flyTo, setFlyTo] = useState<PickedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  async function handlePick(loc: PickedLocation) {
    // Send the coordinates straight away so the pin moves without waiting on the
    // network, then enrich with a reverse-geocoded street once it resolves.
    onChange(loc);
    const address = await reverseGeocode(loc);
    if (address) onChange(loc, address);
  }

  function useMyLocation() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location isn't supported on this device. Drop the pin instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFlyTo(loc);
        void handlePick(loc);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow it in your browser, or drop the pin on the map."
            : "Couldn't get your location. Drop the pin on the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const center = value ?? AJMAN_CENTER;

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 16 : 13}
          scrollWheelZoom={false}
          className="h-[280px] md:h-[360px] w-full border border-border"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture onPick={handlePick} />
          <FlyTo to={flyTo} />
          {value ? (
            <Marker
              position={[value.lat, value.lng]}
              icon={markerIcon}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend() {
                  const m = markerRef.current;
                  if (!m) return;
                  const ll = m.getLatLng();
                  void handlePick({ lat: ll.lat, lng: ll.lng });
                },
              }}
            />
          ) : null}
        </MapContainer>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-md border border-border bg-background/95 px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-foreground shadow-sm backdrop-blur hover:bg-muted disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      {geoError ? (
        <p className="text-xs text-flag-red">{geoError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tap “Use my location” (allow the permission), or tap/drag the pin to
          your exact spot.
        </p>
      )}
    </div>
  );
}
