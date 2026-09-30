"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PublicClaim } from "@/lib/claims";
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

const READY_CALLBACK = "__canDriveMapsReady";
const SCRIPT_SRC = API_KEY
  ? `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async&callback=${READY_CALLBACK}`
  : null;

const LOAD_ERROR = "The map couldn't load. Refresh the page to try again.";
const SEARCH_ERROR = "Search isn't available right now. Try again in a moment.";
const CLAIMS_ERROR = "Claimed streets couldn't load. Refresh the page to try again.";
const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
const MISSING_FIELDS = "Enter your full name and pick your homeroom.";

// Claim pins use the ink and paper tokens; Maps needs raw colours, not classes.
const PIN = { background: "#1b1a17", borderColor: "#1b1a17", glyphColor: "#f4eee2" };

type Picked = { placeId: string; street: string; municipality: string; lat: number; lng: number };

/** Who is claiming or deleting. Kept across streets so a student types it once. */
type Who = { name: string; homeroom: string };

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  /** A street from the search; open or taken depends on the claims list. `mine`: this visitor just claimed it. */
  | { kind: "picked"; place: Picked; mine?: boolean }
  /** A claim chosen from its marker. */
  | { kind: "claim"; placeId: string }
  | { kind: "deleted"; address: string }
  | { kind: "rejected"; message: string }
  | { kind: "error"; message: string };

type MapKit = {
  map: google.maps.Map;
  Marker: typeof google.maps.marker.AdvancedMarkerElement;
  Pin: typeof google.maps.marker.PinElement;
};

declare global {
  interface Window {
    /** Called by the Maps script when the key is invalid or not allowed here. */
    gm_authFailure?: () => void;
    [READY_CALLBACK]?: () => void;
  }
}

let mapsLoading: Promise<void> | null = null;

/**
 * Adds the Maps script once per page load. With loading=async,
 * google.maps.importLibrary only exists once Google calls the callback, not at
 * the script's load event, which is why this isn't next/script's onReady.
 */
function loadMaps(src: string): Promise<void> {
  if (typeof google !== "undefined" && typeof google.maps?.importLibrary === "function") return Promise.resolve();
  mapsLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    window[READY_CALLBACK] = () => {
      delete window[READY_CALLBACK];
      resolve();
    };
    script.src = src;
    script.async = true;
    script.onerror = () => {
      mapsLoading = null;
      script.remove();
      reject(new Error("Maps script failed to load"));
    };
    document.head.append(script);
  });
  return mapsLoading;
}

/** Adds a clickable marker for each new claim and removes markers whose claim is gone. */
function syncMarkers(
  live: Map<string, google.maps.marker.AdvancedMarkerElement>,
  kit: MapKit,
  claims: PublicClaim[],
  onSelect: (placeId: string) => void,
) {
  const wanted = new Set(claims.map((c) => c.placeId));
  for (const [placeId, m] of live) {
    if (wanted.has(placeId)) continue;
    m.map = null;
    live.delete(placeId);
  }
  for (const c of claims) {
    if (live.has(c.placeId)) continue;
    const m = new kit.Marker({
      map: kit.map,
      position: { lat: c.lat, lng: c.lng },
      title: c.address,
      gmpClickable: true,
      content: new kit.Pin(PIN),
    });
    // gmp-click also fires for Enter on a focused marker.
    m.addEventListener("gmp-click", () => onSelect(c.placeId));
    live.set(c.placeId, m);
  }
}

/** Sends a claim request; resolves to the status and parsed body, or throws on a network failure. */
async function send(method: "POST" | "DELETE", body: object) {
  const res = await fetch("/api/claims", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { error?: string; claim?: PublicClaim } | null;
  return { status: res.status, data };
}

/** `homerooms`: the roster's homeroom codes, already public on the standings. */
export function CollectionMap({ homerooms }: { homerooms: string[] }) {
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
            Search for the street you plan to collect on and claim it with your name and homeroom. Each street
            has one collector.
          </p>
        </div>

        {configured ? (
          <StreetPicker homerooms={homerooms} />
        ) : (
          <Unavailable message="The collection map isn't set up yet. Check back soon." />
        )}
      </div>
    </section>
  );
}

function StreetPicker({ homerooms }: { homerooms: string[] }) {
  const searchRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markers = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>());
  const [kit, setKit] = useState<MapKit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // null until the first load finishes.
  const [claims, setClaims] = useState<PublicClaim[] | null>(null);
  const [claimsError, setClaimsError] = useState(false);
  const [who, setWho] = useState<Who>({ name: "", homeroom: "" });

  // Claims are fetched from the browser: the homepage is ISR, so they'd be up to a minute stale.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/claims", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<PublicClaim[]>) : Promise.reject(new Error(String(res.status)))))
      .then((list) => !cancelled && setClaims(list))
      .catch(() => {
        if (cancelled) return;
        setClaims([]);
        setClaimsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searchRef.current || !mapRef.current) return;
    const searchHost = searchRef.current;
    const mapHost = mapRef.current;
    const claimMarkers = markers.current;
    let cancelled = false;
    let latest = 0;
    let cleanup = () => {};
    window.gm_authFailure = () => setLoadError(LOAD_ERROR);

    (async () => {
      await loadMaps(SCRIPT_SRC!);
      if (cancelled) return;
      const [{ Map }, { AdvancedMarkerElement, PinElement }, { PlaceAutocompleteElement }] = await Promise.all([
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
      chosenRef.current = marker;

      const search = new PlaceAutocompleteElement({
        includedRegionCodes: ["ca"],
        locationRestriction: ESSEX_COUNTY_BOUNDS,
        includedPrimaryTypes: ["route"],
        placeholder: "e.g. Huron Church Road",
      });
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
          setStatus({
            kind: "picked",
            place: {
              placeId: place.id,
              street: result.street,
              municipality: result.municipality,
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
          });
        } catch {
          if (request !== latest) return;
          marker.position = null;
          setStatus({ kind: "error", message: SEARCH_ERROR });
        }
      };
      const onError = () => setStatus({ kind: "error", message: SEARCH_ERROR });

      search.addEventListener("gmp-select", onSelect);
      search.addEventListener("gmp-error", onError);
      setKit({ map, Marker: AdvancedMarkerElement, Pin: PinElement });
      cleanup = () => {
        search.removeEventListener("gmp-select", onSelect);
        search.removeEventListener("gmp-error", onError);
        search.remove();
        marker.map = null;
        chosenRef.current = null;
      };
    })().catch(() => {
      if (!cancelled) setLoadError(LOAD_ERROR);
    });

    return () => {
      cancelled = true;
      cleanup();
      for (const m of claimMarkers.values()) m.map = null;
      claimMarkers.clear();
      delete window.gm_authFailure;
    };
  }, []);

  // One marker per claim, added and removed as the claims list changes.
  useEffect(() => {
    if (!kit || !claims) return;
    syncMarkers(markers.current, kit, claims, (placeId) => {
      if (chosenRef.current) chosenRef.current.position = null;
      setStatus({ kind: "claim", placeId });
      panelRef.current?.focus();
    });
  }, [kit, claims]);

  // A response can arrive after the student has moved on to another street;
  // it updates the list but only changes the panel if that street is still selected.
  const isSelected = (s: Status, placeId: string) =>
    (s.kind === "picked" && s.place.placeId === placeId) || (s.kind === "claim" && s.placeId === placeId);

  const addClaim = (claim: PublicClaim, mine: boolean) => {
    setClaims((list) =>
      [...(list ?? []).filter((c) => c.placeId !== claim.placeId), claim].sort((a, b) =>
        a.address.localeCompare(b.address, "en"),
      ),
    );
    setStatus((s) => (s.kind === "picked" && isSelected(s, claim.placeId) ? { ...s, mine } : s));
  };

  const removeClaim = (claim: PublicClaim) => {
    setClaims((list) => (list ?? []).filter((c) => c.placeId !== claim.placeId));
    setStatus((s) => {
      if (!isSelected(s, claim.placeId)) return s;
      if (chosenRef.current) chosenRef.current.position = null;
      return { kind: "deleted", address: claim.address };
    });
  };

  if (loadError) return <Unavailable message={loadError} />;

  const placeId = status.kind === "picked" ? status.place.placeId : status.kind === "claim" ? status.placeId : null;
  const selectedClaim = placeId ? claims?.find((c) => c.placeId === placeId) : undefined;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {/* Google's input lives in a closed shadow root, so a <label> can't reach it; it is named by aria-label. */}
        <span aria-hidden className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
          SEARCH FOR A STREET
        </span>
        <div
          ref={searchRef}
          className="street-search min-h-12 border-2 border-ink bg-field focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-butter"
        />
        <div className="border-[3px] border-ink bg-rule p-1.5 lg:p-3">
          <div
            ref={mapRef}
            role="region"
            aria-label="Map of Windsor and Essex County. Claimed streets are dark pins."
            className="h-[320px] w-full bg-zone lg:h-[480px]"
          />
        </div>
      </div>

      <div
        ref={panelRef}
        tabIndex={-1}
        aria-labelledby="street-panel-title"
        role="region"
        className="flex flex-col gap-3 border-2 border-ink bg-paper px-4 py-3.5 lg:px-[18px] lg:py-4"
      >
        <div aria-live="polite" className="flex flex-col gap-1">
          <Result status={status} claim={selectedClaim} claimsLoading={claims === null} />
        </div>
        {status.kind === "picked" && claims !== null && !selectedClaim && (
          <ClaimForm
            key={status.place.placeId}
            place={status.place}
            homerooms={homerooms}
            who={who}
            setWho={setWho}
            onClaimed={addClaim}
          />
        )}
        {selectedClaim && (
          <DeleteClaim
            key={selectedClaim.placeId}
            claim={selectedClaim}
            homerooms={homerooms}
            who={who}
            setWho={setWho}
            onDeleted={() => removeClaim(selectedClaim)}
          />
        )}
      </div>

      <ClaimedList claims={claims} failed={claimsError} />
    </>
  );
}

function Result({
  status,
  claim,
  claimsLoading,
}: {
  status: Status;
  claim: PublicClaim | undefined;
  claimsLoading: boolean;
}) {
  const title = (text: string) => (
    <span id="street-panel-title" className="font-display text-[22px] leading-none font-extrabold uppercase lg:text-[26px]">
      {text}
    </span>
  );
  const kicker = (text: string) => (
    <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted">{text}</span>
  );
  const line = (text: ReactNode) => <span className="text-[13.5px] text-body lg:text-sm">{text}</span>;

  if (claim && (status.kind === "picked" || status.kind === "claim")) {
    const mine = status.kind === "picked" && status.mine;
    return (
      <>
        {kicker(mine ? "CLAIMED!" : "TAKEN")}
        {title(claim.address)}
        {line(mine ? `It's yours, ${claim.claimer}.` : `Taken — claimed by ${claim.claimer}`)}
      </>
    );
  }

  switch (status.kind) {
    case "idle":
      return (
        <>
          {title("No street yet")}
          {line("Search above and pick a whole street anywhere in Windsor or Essex County.")}
        </>
      );
    case "checking":
      return (
        <>
          <span id="street-panel-title" className="sr-only">
            Street
          </span>
          {line("Checking that street…")}
        </>
      );
    case "picked":
      return (
        <>
          {kicker("YOUR STREET")}
          {title(status.place.street)}
          {line(`${status.place.municipality}, Ontario${claimsLoading ? " · checking whether it's free…" : " · open to claim"}`)}
        </>
      );
    case "claim":
      // The marker's claim was deleted meanwhile.
      return (
        <>
          {title("Street open")}
          {line("That claim was deleted. Search for the street to claim it.")}
        </>
      );
    case "deleted":
      return (
        <>
          {kicker("DELETED")}
          {title(status.address)}
          {line("Claim deleted. The street is open again.")}
        </>
      );
    case "rejected":
    case "error":
      return (
        <span id="street-panel-title" className="text-[13.5px] font-semibold text-error lg:text-sm">
          {status.message}
        </span>
      );
  }
}

const FIELD =
  "h-12 w-full min-w-0 border-2 border-ink bg-field px-3 text-[16px] text-ink aria-invalid:border-error";
const LABEL = "font-mono text-[11px] font-semibold tracking-[.14em] text-muted uppercase";
const BTN_PRIMARY =
  "inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 text-[16px] font-bold text-paper shadow-[4px_4px_0_var(--color-butter)] hover:bg-tomato hover:text-white aria-disabled:cursor-default aria-disabled:opacity-70 aria-disabled:hover:bg-ink";
const BTN_SECONDARY =
  "inline-flex min-h-12 items-center justify-center border-2 border-ink px-4 text-[15px] font-bold text-ink hover:bg-ink hover:text-paper";

/** Full name and homeroom, each with a visible label. */
function WhoFields({
  homerooms,
  who,
  setWho,
  invalid,
  errorId,
}: {
  homerooms: string[];
  who: Who;
  setWho: (w: Who) => void;
  invalid: boolean;
  errorId: string;
}) {
  const id = useId();
  const described = invalid ? errorId : undefined;
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-name`} className={LABEL}>
          Full name
        </label>
        <input
          id={`${id}-name`}
          className={FIELD}
          autoComplete="name"
          maxLength={100}
          value={who.name}
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          onChange={(e) => setWho({ ...who, name: e.target.value })}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`${id}-hr`} className={LABEL}>
          Homeroom
        </label>
        <select
          id={`${id}-hr`}
          className={FIELD}
          value={who.homeroom}
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          onChange={(e) => setWho({ ...who, homeroom: e.target.value })}
        >
          <option value="">Choose…</option>
          {homerooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FormError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p id={id} role="alert" className="border-l-4 border-error bg-error-surface px-3 py-2 text-[14px] font-semibold text-error">
      {message}
    </p>
  ) : null;
}

/**
 * A ref, not just state, guards against a double click: both clicks can run
 * before React re-renders the busy button. The server is idempotent anyway.
 */
function useBusy() {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return [busy, run] as const;
}

function ClaimForm({
  place,
  homerooms,
  who,
  setWho,
  onClaimed,
}: {
  place: Picked;
  homerooms: string[];
  who: Who;
  setWho: (w: Who) => void;
  onClaimed: (claim: PublicClaim, mine: boolean) => void;
}) {
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, run] = useBusy();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!who.name.trim() || !who.homeroom) return setError(MISSING_FIELDS);
    void run(async () => {
      setError(null);
      try {
        const { status, data } = await send("POST", {
          ...who,
          placeId: place.placeId,
          address: `${place.street}, ${place.municipality}`,
          lat: place.lat,
          lng: place.lng,
        });
        // Success only once the server confirms the row.
        if (status === 200 && data?.claim) onClaimed(data.claim, true);
        else if (status === 409 && data?.claim) onClaimed(data.claim, false);
        else setError(data?.error ?? "The claim couldn't be saved. Try again.");
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t-2 border-rule pt-3">
      <WhoFields homerooms={homerooms} who={who} setWho={setWho} invalid={!!error} errorId={errorId} />
      <FormError id={errorId} message={error} />
      <button type="submit" aria-disabled={busy || undefined} className={BTN_PRIMARY}>
        {busy ? "Claiming…" : "Claim this street"}
      </button>
    </form>
  );
}

function DeleteClaim({
  claim,
  homerooms,
  who,
  setWho,
  onDeleted,
}: {
  claim: PublicClaim;
  homerooms: string[];
  who: Who;
  setWho: (w: Who) => void;
  onDeleted: () => void;
}) {
  const errorId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, run] = useBusy();

  if (!open) {
    return (
      <button type="button" className={`${BTN_SECONDARY} self-start`} onClick={() => setOpen(true)}>
        Delete my claim
      </button>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!who.name.trim() || !who.homeroom) return setError(MISSING_FIELDS);
    void run(async () => {
      setError(null);
      try {
        const { status, data } = await send("DELETE", { ...who, placeId: claim.placeId });
        if (status === 200) onDeleted();
        else setError(data?.error ?? "The claim couldn't be deleted. Try again.");
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t-2 border-rule pt-3">
      <p className="text-[14px] text-body">Enter the name and homeroom this street was claimed with.</p>
      <WhoFields homerooms={homerooms} who={who} setWho={setWho} invalid={!!error} errorId={errorId} />
      <FormError id={errorId} message={error} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" aria-disabled={busy || undefined} className={BTN_PRIMARY}>
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ClaimedList({ claims, failed }: { claims: PublicClaim[] | null; failed: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 lg:col-start-2 lg:row-start-3">
      <h3 className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">CLAIMED STREETS</h3>
      {failed ? (
        <p className="text-[14px] font-semibold text-error">{CLAIMS_ERROR}</p>
      ) : claims === null ? (
        <p className="text-[14px] text-body">Loading…</p>
      ) : claims.length === 0 ? (
        <p className="text-[14px] text-body">No streets claimed yet. Be the first.</p>
      ) : (
        <ul className="divide-y-2 divide-rule border-2 border-ink bg-paper">
          {claims.map((c) => (
            <li key={c.placeId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
              <span className="min-w-0 font-semibold break-words">{c.address}</span>
              <span className="text-[14px] text-body">{c.claimer}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center border-[3px] border-dashed border-ink bg-paper p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-[320px]">
      <p className="text-[15.5px] text-body lg:text-[17px]">{message}</p>
    </div>
  );
}
