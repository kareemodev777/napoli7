"use client";

import { useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PickedLocation {
  lat: number;
  lng: number;
}

// Shop location — used as the initial map center before the customer drops a pin.
const AJMAN_CENTER: PickedLocation = { lat: 25.4002327, lng: 55.5033167 };

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

export default function DeliveryMapPicker({
  value,
  onChange,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation, address?: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  async function handlePick(loc: PickedLocation) {
    // Send the coordinates straight away so the pin moves without waiting on the
    // network, then enrich with a reverse-geocoded street once it resolves.
    onChange(loc);
    const address = await reverseGeocode(loc);
    if (address) onChange(loc, address);
  }

  const center = value ?? AJMAN_CENTER;

  return (
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
  );
}
