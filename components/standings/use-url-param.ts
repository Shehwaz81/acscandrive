"use client";

import { useSyncExternalStore } from "react";

/** pushState and replaceState fire no event of their own, so setUrlParam announces the change. */
const CHANGED = "standings:urlchange";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/**
 * One query parameter, read from the address bar. The page is static, so the
 * server renders without it (null) and the browser picks it up after hydration.
 */
export function useUrlParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** "push" adds a history entry (Back undoes it); "replace" rewrites the current one. */
export function setUrlParam(name: string, value: string | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(CHANGED));
}
