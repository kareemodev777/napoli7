"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import { LocateFixed, Plus, Minus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SHOP_LOCATION, checkDeliverability } from "@/lib/delivery-map";
import { AJMAN_MAINLAND_RING } from "@/lib/ajman-boundary";

const AJMAN_RING = AJMAN_MAINLAND_RING as [number, number][];

// A world-sized ring with the delivery zone punched out of it. Leaflet fills
// polygons even-odd, so the hole renders as a spotlight: everything OUTSIDE
// Ajman dims and the bright area *is* the answer to "where do you deliver?".
// Nobody has to read a legend to understand the rule.
const WORLD_RING: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];

export interface PickedLocation {
  lat: number;
  lng: number;
}

/** Reverse-geocoded address parts for a dropped pin, so checkout can prefill the
 *  street field and match the delivery area. */
export interface GeocodedAddress {
  /** Road/street name, if the geocoder resolved one. */
  street?: string;
  /** Neighbourhood/suburb — used to auto-select the delivery area. */
  area?: string;
  /** A human-readable "road, area, city" line (fallback for the street field). */
  full: string;
}

// Shop location — where the map opens before the customer has moved it.
const AJMAN_CENTER: PickedLocation = {
  lat: SHOP_LOCATION.lat,
  lng: SHOP_LOCATION.lng,
};

/** Two positions are the same spot for our purposes (~1 cm). Used to stop a
 *  committed location from bouncing back through the map as a fresh move. */
function sameSpot(a: PickedLocation | null, b: PickedLocation | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7;
}

async function reverseGeocode(
  loc: PickedLocation,
  signal: AbortSignal,
): Promise<GeocodedAddress | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" }, signal },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    // Build the street line from the road plus any building/house number the
    // geocoder resolved, so the auto-filled field reads like a real address
    // ("Sheikh Rashid bin Abdul Aziz St, Bldg 213") rather than a bare road.
    const road = a.road;
    const houseNumber = a.house_number ?? a.building;
    const street = road
      ? houseNumber
        ? `${road}, Bldg ${houseNumber}`
        : road
      : undefined;
    const area =
      a.neighbourhood ??
      a.suburb ??
      a.residential ??
      a.quarter ??
      a.city_district;
    const parts = [street, area, a.city ?? a.town ?? a.village].filter(Boolean);
    const full = parts.length ? parts.join(", ") : (data.display_name ?? "");
    if (!full) return undefined;
    return { street, area, full };
  } catch {
    // Aborted (superseded by a newer pan) or offline — the pin still stands.
    return undefined;
  }
}

/**
 * The pin the customer actually aims with: pinned to the centre of the viewport
 * while the map slides underneath, the way Uber Eats and Talabat do it. Aiming a
 * fixed target one-handed beats tapping an exact rooftop with a thumb, and the
 * pin can never drift off-screen.
 *
 * It owns its own map subscription so a drag re-renders this ~30-line component
 * every frame instead of the whole picker and its polygons.
 */
function CentrePin({ map }: { map: L.Map | null }) {
  const [moving, setMoving] = useState(false);
  const [centre, setCentre] = useState<PickedLocation | null>(null);

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      const c = map.getCenter();
      setCentre({ lat: c.lat, lng: c.lng });
    };
    const start = () => setMoving(true);
    const end = () => {
      setMoving(false);
      sync();
    };
    sync();
    map.on("movestart", start);
    map.on("move", sync);
    map.on("moveend", end);
    return () => {
      map.off("movestart", start);
      map.off("move", sync);
      map.off("moveend", end);
    };
  }, [map]);

  // Live colour: the pin turns red the instant it crosses out of Ajman, before
  // the customer lets go — so the border is felt, not just read about after.
  const outside =
    centre !== null && !checkDeliverability(centre.lat, centre.lng).deliverable;

  return (
    // A zero-size box anchored exactly at the map centre; the pin hangs above it
    // and the shadow sits on it, so the pin's TIP marks the chosen point.
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[600] h-0 w-0">
      <span
        className={`absolute left-1/2 top-0 block h-[7px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/35 transition-all duration-200 ${
          moving ? "scale-[0.7] opacity-40" : "opacity-70"
        }`}
      />
      <svg
        width="34"
        height="46"
        viewBox="0 0 34 46"
        fill="none"
        aria-hidden
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-sm transition-transform duration-200 ${
          moving ? "-translate-y-2.5" : "translate-y-0"
        } ${outside ? "text-flag-red" : "text-brand"}`}
      >
        <path
          d="M17 44.5S31.5 28.6 31.5 17.5A14.5 14.5 0 1 0 2.5 17.5C2.5 28.6 17 44.5 17 44.5Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="17" cy="17.2" r="5.4" fill="white" />
      </svg>
    </div>
  );
}

export default function DeliveryMapPicker({
  value,
  onChange,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation, address?: GeocodedAddress) => void;
}) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [address, setAddress] = useState<GeocodedAddress | undefined>();
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // The map is live from first paint, but a location is only *claimed* once the
  // customer acts. Without this, merely opening checkout would silently set the
  // delivery address to the shop's own doorstep.
  const touched = useRef(false);
  const [hasTouched, setHasTouched] = useState(false);

  // Kept in refs so the map subscription below can read the latest values without
  // listing them as deps — re-subscribing on every settle would cancel the
  // in-flight geocode debounce that the settle itself just started.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const markTouched = useCallback(() => {
    touched.current = true;
    setHasTouched(true);
  }, []);

  // Open at street-placing zoom over the shop, not fitted to the whole emirate.
  // Ajman is a long diagonal strip, so fitting it lands you at zoom 10 — far too
  // wide to put a pin on a building, and every customer would have to zoom in
  // before they could do anything. The dimmed surround still shows where the
  // border runs.
  const fitted = useRef(false);
  useEffect(() => {
    if (!map || fitted.current) return;
    fitted.current = true;
    if (value) {
      map.setView([value.lat, value.lng], 16);
      touched.current = true;
    } else {
      map.setView([AJMAN_CENTER.lat, AJMAN_CENTER.lng], 13);
    }
  }, [map, value]);

  // A location arriving as a prop (a returning customer's saved address) counts
  // as claimed just as much as a drag does.
  const claimed = hasTouched || value !== null;

  // Commit wherever the map settles, then enrich with a reverse-geocoded street.
  // The geocode is debounced and superseded: panning across town fires one
  // request when you stop, not one per frame — Nominatim asks for no less.
  useEffect(() => {
    if (!map) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: AbortController | undefined;

    const settle = () => {
      if (!touched.current) return;
      const c = map.getCenter();
      const loc = { lat: c.lat, lng: c.lng };
      if (sameSpot(loc, valueRef.current)) return;

      // Send coordinates straight away so the form unblocks without waiting on
      // the network; the address follows when it resolves.
      onChangeRef.current(loc);
      setAddress(undefined);
      setResolving(true);
      clearTimeout(timer);
      inFlight?.abort();
      timer = setTimeout(() => {
        inFlight = new AbortController();
        void reverseGeocode(loc, inFlight.signal).then((resolved) => {
          if (inFlight?.signal.aborted) return;
          setResolving(false);
          if (!resolved) return;
          setAddress(resolved);
          onChangeRef.current(loc, resolved);
        });
      }, 600);
    };

    const claim = () => markTouched();
    map.on("moveend", settle);
    map.on("dragstart", claim);
    return () => {
      map.off("moveend", settle);
      map.off("dragstart", claim);
      clearTimeout(timer);
      inFlight?.abort();
    };
  }, [map, markTouched]);

  // Tapping a spot glides the map there rather than teleporting a marker — the
  // pin stays put and the world moves, which is the whole premise of the UI.
  useEffect(() => {
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      markTouched();
      map.panTo(e.latlng);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, markTouched]);

  function useMyLocation() {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location isn't supported on this device. Drag the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        markTouched();
        map?.flyTo([pos.coords.latitude, pos.coords.longitude], 17);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was blocked. Allow it in your browser, or drag the map to your spot."
            : "Couldn't get your location. Drag the map to your spot instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const outsideZone =
    value !== null && !checkDeliverability(value.lat, value.lng).deliverable;

  return (
    <div className="space-y-2">
      {/* `isolate` keeps the z-[1000] controls below in their own stacking
          context. Without it they resolve against the root and paint straight
          through anything layered over the page — the marketing popup lands
          behind its own backdrop with the map floating on top of it. */}
      <div className="relative isolate overflow-hidden border border-border">
        <MapContainer
          ref={setMap}
          center={[AJMAN_CENTER.lat, AJMAN_CENTER.lng]}
          zoom={12}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-[320px] w-full md:h-[420px]"
        >
          {/* CARTO Voyager: the muted, low-contrast basemap food-delivery apps
              use. Plain OSM tiles are loud enough that the delivery zone and the
              pin have to fight the map for attention. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          {/* Everything outside Ajman, dimmed. */}
          <Polygon
            positions={[WORLD_RING, AJMAN_RING]}
            pathOptions={{
              stroke: false,
              fillColor: "#0f172a",
              fillOpacity: 0.42,
              interactive: false,
            }}
          />
          {/* The border itself, drawn on top so the edge stays crisp. */}
          <Polygon
            positions={AJMAN_RING}
            pathOptions={{
              color: "#15803d",
              weight: 2.5,
              fill: false,
              interactive: false,
            }}
          />
        </MapContainer>

        <CentrePin map={map} />

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 border border-border bg-background/95 px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-foreground shadow-sm backdrop-blur hover:bg-muted disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
          {locating ? "Locating…" : "Use my location"}
        </button>

        <div className="absolute right-3 top-16 z-[1000] flex flex-col border border-border bg-background/95 shadow-sm backdrop-blur">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => {
              markTouched();
              map?.zoomIn();
            }}
            className="inline-flex h-8 w-8 items-center justify-center hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => {
              markTouched();
              map?.zoomOut();
            }}
            className="inline-flex h-8 w-8 items-center justify-center border-t border-border hover:bg-muted"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* What the pin is currently sitting on, over the map where the customer
            is already looking — so the address is checked against the rooftop
            without dragging their eyes down to a form field. */}
        <div className="pointer-events-none absolute inset-x-3 bottom-6 z-[1000]">
          <div className="border border-border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
            {!claimed ? (
              <p className="text-xs text-muted-foreground">
                Drag the map to put the pin on your building.
              </p>
            ) : outsideZone ? (
              <p className="text-xs font-medium text-flag-red">
                Outside Ajman — we can&apos;t deliver here.
              </p>
            ) : (
              <>
                <p className="truncate text-xs font-medium text-foreground">
                  {address?.full ??
                    (resolving ? "Finding this address…" : "Pin set")}
                </p>
                <p className="mt-0.5 text-[11px] text-basil">Inside Ajman ✓</p>
              </>
            )}
          </div>
        </div>
      </div>

      {geoError ? (
        <p className="text-xs text-flag-red">{geoError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Drag the map so the pin sits on your building, or tap “Use my location”.
          The bright area is Ajman — we deliver anywhere inside it.
        </p>
      )}
    </div>
  );
}
