"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MAX_OPTIONS, MIN_QUERY, optionLabel, PICK_AGAIN_MESSAGE, type PublicClaim, type StudentOption } from "@/lib/claims";
import {
  checkCollectionStreet,
  ESSEX_COUNTY_BOUNDS,
  INITIAL_ZOOM,
  SCHOOL_LOCATION,
} from "@/lib/collection-area";
import { WRAP } from "@/lib/site";
import { ClaimedList } from "./claimed-list";

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
const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
const PICK_NAME = "Pick your name from the list.";

// Pin colours mirror the ink, paper, tomato and butter tokens; Maps needs raw
// colours, not classes. The colour says the same thing as the panel's tag.
const INK = "#1b1a17";
const PAPER = "#f4eee2";
const PINS = {
  /** Someone's claim. */
  claimed: { background: INK, borderColor: INK, glyphColor: PAPER },
  /** The claimed street being looked at: taken. */
  taken: { background: "#c8432a", borderColor: INK, glyphColor: PAPER },
  /** This visitor's street: the open one they picked, or one they just claimed. */
  yours: { background: "#f2c230", borderColor: INK, glyphColor: INK },
};

type Picked = { placeId: string; street: string; municipality: string; lat: number; lng: number };

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

/**
 * Adds a clickable marker for each new claim, removes markers whose claim is
 * gone, and colours the selected claim's pin (tomato if taken, butter if the
 * visitor just claimed it). The picked-street marker steps aside for it.
 */
function syncMarkers(
  live: Map<string, google.maps.marker.AdvancedMarkerElement>,
  kit: MapKit,
  claims: PublicClaim[],
  selected: { placeId: string; mine: boolean } | null,
  chosen: google.maps.marker.AdvancedMarkerElement | null,
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
      content: new kit.Pin(PINS.claimed),
    });
    // gmp-click also fires for Enter on a focused marker.
    m.addEventListener("gmp-click", () => onSelect(c.placeId));
    live.set(c.placeId, m);
  }
  for (const [placeId, m] of live) {
    const isSelected = placeId === selected?.placeId;
    const look = !isSelected ? PINS.claimed : selected.mine ? PINS.yours : PINS.taken;
    Object.assign(m.content as google.maps.marker.PinElement, look);
    m.zIndex = isSelected ? 1 : null;
  }
  if (selected && chosen) chosen.position = null;
}

/** Sends a claim request; resolves to the status and parsed body, or throws on a network failure. */
async function send(method: "POST" | "DELETE", body: object) {
  const res = await fetch("/api/claims", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { error?: string; claim?: PublicClaim } | null;
  // A ref the server can't open (e.g. SESSION_SECRET rotated): the student picks their name again.
  if (res.status === 400 && data?.error === "pick-again") return { status: res.status, data, pickAgain: true };
  return { status: res.status, data, pickAgain: false };
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
            Search for the street you plan to collect on, then claim it under your name. Each street has one
            collector.
          </p>
        </div>

        {configured ? (
          <StreetPicker />
        ) : (
          <Unavailable message="The collection map isn't set up yet. Check back soon." />
        )}
      </div>
    </section>
  );
}

function StreetPicker() {
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
  // The student picked in the name picker. Kept across streets, so claiming several takes one pick.
  const [me, setMe] = useState<StudentOption | null>(null);

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
      const marker = new AdvancedMarkerElement({ map, title: "Chosen street", content: new PinElement(PINS.yours) });
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

  const placeId = status.kind === "picked" ? status.place.placeId : status.kind === "claim" ? status.placeId : null;
  const selectedClaim = placeId ? claims?.find((c) => c.placeId === placeId) : undefined;
  const selectedId = selectedClaim?.placeId ?? null;
  const mine = status.kind === "picked" && !!status.mine;

  // One marker per claim, added and removed as the claims list changes, with the selected one coloured.
  useEffect(() => {
    if (!kit || !claims) return;
    const selected = selectedId ? { placeId: selectedId, mine } : null;
    syncMarkers(markers.current, kit, claims, selected, chosenRef.current, (placeId) => {
      if (chosenRef.current) chosenRef.current.position = null;
      setStatus({ kind: "claim", placeId });
      panelRef.current?.focus();
    });
  }, [kit, claims, selectedId, mine]);

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

  const taken = !!selectedClaim && !mine;

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
            aria-label="Map of Windsor and Essex County. Claimed streets are dark pins; the street you pick is yellow, or red if it is taken."
            className="h-[320px] w-full bg-zone lg:h-[480px]"
          />
        </div>
      </div>

      <div
        ref={panelRef}
        tabIndex={-1}
        aria-labelledby="street-panel-title"
        role="region"
        className={`flex flex-col gap-3 border-2 bg-paper px-4 py-3.5 lg:px-[18px] lg:py-4 ${
          taken ? "border-tomato" : "border-ink"
        }`}
      >
        <div aria-live="polite" className="flex flex-col gap-1.5">
          <Result status={status} claim={selectedClaim} claimsLoading={claims === null} />
        </div>
        {status.kind === "picked" && claims !== null && !selectedClaim && (
          <ClaimForm
            key={status.place.placeId}
            place={status.place}
            me={me}
            setMe={setMe}
            onClaimed={addClaim}
          />
        )}
        {selectedClaim && (
          <DeleteClaim
            key={selectedClaim.placeId}
            claim={selectedClaim}
            me={me}
            setMe={setMe}
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
  // The street's status. The colour matches its pin, and the word carries the meaning without it.
  const tag = (text: string, look: string) => (
    <span
      className={`self-start px-2 pt-1 pb-[3px] font-display text-[15px] leading-none font-extrabold tracking-[.06em] uppercase ${look}`}
    >
      {text}
    </span>
  );
  const TAKEN = "bg-tomato text-white";
  const YOURS = "bg-butter text-ink";
  const OPEN = "bg-ink text-paper";
  const line = (text: ReactNode) => <span className="text-[13.5px] text-body lg:text-sm">{text}</span>;

  if (claim && (status.kind === "picked" || status.kind === "claim")) {
    const mine = status.kind === "picked" && status.mine;
    return (
      <>
        {mine ? tag("Yours", YOURS) : tag("Taken", TAKEN)}
        {title(claim.address)}
        {line(
          mine
            ? `It's yours, ${claim.claimer}.`
            : `${claim.claimer} is collecting on this street. Search for another one.`,
        )}
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
          {!claimsLoading && tag("Open", OPEN)}
          {title(status.place.street)}
          {line(
            `${status.place.municipality}, Ontario. ${claimsLoading ? "Checking whether it's free…" : "Nobody has claimed it yet."}`,
          )}
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
          {tag("Open", OPEN)}
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

const NAME_HINT = "Start typing your first or last name, then pick yourself.";

/**
 * Pick yourself from the roster (ARIA combobox with a listbox). The server
 * returns at most MAX_OPTIONS matches as "First L." + homeroom with a sealed
 * ref; nothing else about the roster reaches the browser. Once picked, the
 * field becomes a name tag with "Not you?" to pick again.
 */
function NamePicker({
  label,
  me,
  setMe,
  invalid,
  errorId,
  onPicked,
}: {
  label: string;
  me: StudentOption | null;
  setMe: (s: StudentOption | null) => void;
  invalid: boolean;
  errorId: string;
  onPicked?: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const refocus = useRef(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; options: StudentOption[] } | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = query.trim();
  const searchable = q.replace(/\s/g, "").length >= MIN_QUERY;

  // Debounced search; a newer query aborts the older request.
  useEffect(() => {
    if (!searchable) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/claims/students?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<StudentOption[]>) : Promise.reject(new Error(String(res.status)))))
        .then((options) => setResults({ q, options }))
        .catch(() => {
          if (!ctrl.signal.aborted) setFailedQuery(q);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, searchable]);

  const ready = searchable && results?.q === q;
  const options = ready ? results.options : [];
  const failed = searchable && !ready && failedQuery === q;
  const expanded = open && options.length > 0;
  const act = active < options.length ? active : -1;
  const twins = new Set(options.map(optionLabel)).size < options.length;

  const pick = (o: StudentOption) => {
    setMe(o);
    setQuery("");
    setOpen(false);
    setActive(-1);
    onPicked?.();
  };

  if (me) {
    return (
      <div className="flex flex-col gap-1">
        <span className={LABEL}>{label}</span>
        <div className="flex items-center justify-between gap-3 border-2 border-ink bg-field py-2.5 pr-2 pl-3 shadow-[inset_0_-4px_0_var(--color-butter)]">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="font-display text-[28px] leading-none font-extrabold break-words uppercase">{me.name}</span>
            <span className="text-[15px] font-semibold text-body">
              <span className="sr-only">homeroom </span>
              {me.homeroom}
            </span>
          </p>
          <button
            type="button"
            className="min-h-11 flex-none px-2 text-[14px] font-semibold text-ink underline underline-offset-4 hover:text-tomato-dark"
            onClick={() => {
              refocus.current = true;
              setMe(null);
            }}
          >
            Not you?
          </button>
        </div>
      </div>
    );
  }

  let status = "";
  if (failed) status = "Name search isn't available right now. Try again in a moment.";
  else if (searchable && !ready) status = "Searching…";
  else if (ready && options.length === 0) status = "No one by that name. Check the spelling, or ask at the desk.";
  else if (twins || options.length === MAX_OPTIONS) status = "Keep typing your last name to narrow the list.";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-input`} className={LABEL}>
        {label}
      </label>
      <div>
        <input
          id={`${id}-input`}
          ref={(el) => {
            if (el && refocus.current) {
              refocus.current = false;
              el.focus();
            }
          }}
          className={FIELD}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && act >= 0 ? `${id}-opt-${act}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={[hintId, invalid ? errorId : ""].filter(Boolean).join(" ")}
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && options.length) {
              e.preventDefault();
              setOpen(true);
              setActive(Math.min(act + 1, options.length - 1));
            } else if (e.key === "ArrowUp" && options.length) {
              e.preventDefault();
              setActive(Math.max(act - 1, 0));
            } else if (e.key === "Enter" && expanded && (act >= 0 || options.length === 1)) {
              e.preventDefault();
              pick(options[Math.max(act, 0)]);
            } else if (e.key === "Escape" && expanded) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        <ul
          id={listId}
          role="listbox"
          aria-label="Students"
          hidden={!expanded}
          // In the flow, not floating: it pushes the button down instead of covering it.
          className="max-h-72 overflow-y-auto border-2 border-t-0 border-ink bg-paper"
        >
          {options.map((o, i) => (
            <li
              key={o.ref}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === act}
              // Keep focus in the input so blur doesn't close the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2.5 ${
                i === act ? "bg-butter" : "hover:bg-kraft"
              }`}
            >
              <span className="min-w-0 font-semibold break-words">{o.name}</span>
              <span className="flex-none text-[14px] text-body">
                <span className="sr-only">homeroom </span>
                {o.homeroom}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p id={hintId} className="text-[13px] text-body">
        {NAME_HINT}
      </p>
      <p aria-live="polite" className={`text-[13.5px] ${failed ? "font-semibold text-error" : "text-body"} empty:hidden`}>
        {status}
      </p>
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
  me,
  setMe,
  onClaimed,
}: {
  place: Picked;
  me: StudentOption | null;
  setMe: (s: StudentOption | null) => void;
  onClaimed: (claim: PublicClaim, mine: boolean) => void;
}) {
  const errorId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, run] = useBusy();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!me) return setError(PICK_NAME);
    void run(async () => {
      setError(null);
      try {
        const { status, data, pickAgain } = await send("POST", {
          student: me.ref,
          placeId: place.placeId,
          address: `${place.street}, ${place.municipality}`,
          lat: place.lat,
          lng: place.lng,
        });
        // Success only once the server confirms the row.
        if (status === 200 && data?.claim) onClaimed(data.claim, true);
        else if (status === 409 && data?.claim) onClaimed(data.claim, false);
        else if (pickAgain) {
          setMe(null);
          setError(PICK_AGAIN_MESSAGE);
        } else setError(data?.error ?? "The claim couldn't be saved. Try again.");
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t-2 border-rule pt-3">
      <NamePicker
        label="Your name"
        me={me}
        setMe={(s) => {
          setMe(s);
          setError(null);
        }}
        invalid={!!error}
        errorId={errorId}
        // After a pick, the next step is the claim button.
        onPicked={() => setTimeout(() => buttonRef.current?.focus())}
      />
      <FormError id={errorId} message={error} />
      <button ref={buttonRef} type="submit" aria-disabled={busy || undefined} className={BTN_PRIMARY}>
        {busy ? "Claiming…" : "Claim this street"}
      </button>
    </form>
  );
}

function DeleteClaim({
  claim,
  me,
  setMe,
  onDeleted,
}: {
  claim: PublicClaim;
  me: StudentOption | null;
  setMe: (s: StudentOption | null) => void;
  onDeleted: () => void;
}) {
  const errorId = useId();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, run] = useBusy();

  if (!open) {
    return (
      // A quiet link: on someone else's street the message is "taken", not an action to take.
      <button
        type="button"
        className="min-h-11 self-start text-[14px] font-semibold text-ink underline underline-offset-4 hover:text-tomato-dark"
        onClick={() => setOpen(true)}
      >
        Delete my claim
      </button>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!me) return setError(PICK_NAME);
    void run(async () => {
      setError(null);
      try {
        const { status, data, pickAgain } = await send("DELETE", { student: me.ref, placeId: claim.placeId });
        if (status === 200) onDeleted();
        else if (pickAgain) {
          setMe(null);
          setError(PICK_AGAIN_MESSAGE);
        } else setError(data?.error ?? "The claim couldn't be deleted. Try again.");
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t-2 border-rule pt-3">
      <p className="text-[14px] text-body">Only {claim.claimer} can delete this claim.</p>
      <NamePicker
        label="Your name"
        me={me}
        setMe={(s) => {
          setMe(s);
          setError(null);
        }}
        invalid={!!error}
        errorId={errorId}
        onPicked={() => setTimeout(() => deleteRef.current?.focus())}
      />
      <FormError id={errorId} message={error} />
      <div className="flex flex-wrap gap-3">
        <button ref={deleteRef} type="submit" aria-disabled={busy || undefined} className={BTN_PRIMARY}>
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center border-[3px] border-dashed border-ink bg-paper p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:min-h-[320px]">
      <p className="text-[15.5px] text-body lg:text-[17px]">{message}</p>
    </div>
  );
}
