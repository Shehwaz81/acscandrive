"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  checkCollectionStreet,
  ESSEX_COUNTY_BOUNDS,
  INITIAL_ZOOM,
  SCHOOL_LOCATION,
} from "@/lib/collection-area";
import { WRAP } from "@/lib/site";

// Browser keys are public by design; they are protected by referrer and API
// restrictions in Google Cloud (see docs/architecture.md, Collection map).
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Advanced markers need a Map ID. DEMO_MAP_ID only works in development.
const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || (process.env.NODE_ENV === "development" ? "DEMO_MAP_ID" : undefined);

const SCRIPT_SRC = API_KEY
  ? `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async`
  : null;

const LOAD_ERROR = "The map couldn't load. Refresh the page to try again.";
const SEARCH_ERROR = "Search isn't available right now. Try again in a moment.";

type Picked = { street: string; municipality: string };

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "picked"; place: Picked }
  | { kind: "rejected"; message: string }
  | { kind: "error"; message: string };

declare global {
  interface Window {
    /** Called by the Maps script when the key is invalid or not allowed here. */
    gm_authFailure?: () => void;
  }
}

export function CollectionMap() {
  const configured = !!(SCRIPT_SRC && MAP_ID);

  return (
    <section id="map" aria-labelledby="map-title" className="scroll-mt-4 border-t-2 border-ink bg-kraft">
      <div
        className={`${WRAP} grid gap-[18px] pt-10 pb-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-x-14 lg:gap-y-6 lg:pt-20 lg:pb-24`}
      >
        <div className="flex flex-col gap-[18px] lg:gap-6">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
            STREET COLLECTION
          </span>
          <h2
            id="map-title"
            className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase lg:text-[clamp(5rem,6.7vw,6rem)]"
          >
            Pick <br className="hidden lg:block" />
            your street
          </h2>
          <p className="text-[15.5px] leading-normal text-pretty lg:text-[17px]">
            Search for the street you plan to collect on. Booking opens soon.
          </p>
        </div>

        {configured ? <StreetPicker /> : <Unavailable message="The collection map isn't set up yet. Check back soon." />}
      </div>
    </section>
  );
}

function StreetPicker() {
  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The future reservation form will read the chosen street from this state.
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    window.gm_authFailure = () => setLoadError(LOAD_ERROR);
    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !searchRef.current || !mapRef.current) return;
    const searchHost = searchRef.current;
    const mapHost = mapRef.current;
    let cancelled = false;
    let latest = 0;
    let cleanup = () => {};

    (async () => {
      const [{ Map }, { AdvancedMarkerElement }, { PlaceAutocompleteElement }] = await Promise.all([
        google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        google.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>,
      ]);
      if (cancelled) return;

      const map = new Map(mapHost, {
        center: SCHOOL_LOCATION,
        zoom: INITIAL_ZOOM,
        mapId: MAP_ID,
        // Cooperative: one-finger drags scroll the page instead of the map.
        gestureHandling: "cooperative",
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
      });
      const marker = new AdvancedMarkerElement({ map, title: "Chosen street" });

      const search = new PlaceAutocompleteElement({
        includedRegionCodes: ["ca"],
        locationRestriction: ESSEX_COUNTY_BOUNDS,
        includedPrimaryTypes: ["route"],
        placeholder: "e.g. Huron Church Road",
      });
      search.id = "street-search";
      search.setAttribute("aria-label", "Search for a street");
      searchHost.replaceChildren(search);

      const onSelect = async (event: Event) => {
        const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
        const request = ++latest;
        setStatus({ kind: "checking" });
        try {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["types", "addressComponents", "location", "viewport"] });
          if (request !== latest) return;

          const result = checkCollectionStreet(place.types ?? [], place.addressComponents ?? []);
          if (!result.ok || !place.location) {
            marker.position = null;
            setStatus({ kind: "rejected", message: result.ok ? SEARCH_ERROR : result.message });
            return;
          }
          if (place.viewport) map.fitBounds(place.viewport);
          else map.setCenter(place.location);
          marker.position = place.location;
          setStatus({ kind: "picked", place: { street: result.street, municipality: result.municipality } });
        } catch {
          if (request !== latest) return;
          marker.position = null;
          setStatus({ kind: "error", message: SEARCH_ERROR });
        }
      };
      const onError = () => setStatus({ kind: "error", message: SEARCH_ERROR });

      search.addEventListener("gmp-select", onSelect);
      search.addEventListener("gmp-error", onError);
      cleanup = () => {
        search.removeEventListener("gmp-select", onSelect);
        search.removeEventListener("gmp-error", onError);
        search.remove();
        marker.map = null;
      };
    })().catch(() => {
      if (!cancelled) setLoadError(LOAD_ERROR);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [scriptReady]);

  if (loadError) return <Unavailable message={loadError} />;

  return (
    <>
      <Script src={SCRIPT_SRC!} onReady={() => setScriptReady(true)} onError={() => setLoadError(LOAD_ERROR)} />

      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <label htmlFor="street-search" className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
          SEARCH FOR A STREET
        </label>
        <div
          ref={searchRef}
          className="street-search min-h-12 border-2 border-ink bg-field focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-butter"
        />
        <div className="border-[3px] border-ink bg-rule p-1.5 lg:p-3">
          <div
            ref={mapRef}
            role="region"
            aria-label="Map of Windsor and Essex County"
            className="h-[320px] w-full bg-zone lg:h-[480px]"
          />
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex flex-col gap-1 border-2 border-ink bg-paper px-4 py-3.5 lg:px-[18px] lg:py-4"
      >
        <Result status={status} />
      </div>
    </>
  );
}

function Result({ status }: { status: Status }) {
  switch (status.kind) {
    case "idle":
      return (
        <>
          <span className="font-display text-[22px] leading-none font-extrabold uppercase lg:text-[26px]">No street yet</span>
          <span className="text-[13.5px] text-body lg:text-sm">
            Search above and pick a whole street anywhere in Windsor or Essex County.
          </span>
        </>
      );
    case "checking":
      return <span className="text-[13.5px] text-body lg:text-sm">Checking that street…</span>;
    case "picked":
      return (
        <>
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted">YOUR STREET</span>
          <span className="font-display text-[22px] leading-none font-extrabold uppercase lg:text-[26px]">
            {status.place.street}
          </span>
          <span className="text-[13.5px] text-body lg:text-sm">{status.place.municipality}, Ontario</span>
        </>
      );
    case "rejected":
    case "error":
      return (
        <span className="text-[13.5px] font-semibold text-error lg:text-sm">
          {status.message}
        </span>
      );
  }
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center border-[3px] border-dashed border-ink bg-paper p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-[320px]">
      <p className="text-[15.5px] text-body lg:text-[17px]">{message}</p>
    </div>
  );
}
