"use client";

import { useEffect, useRef } from "react";

/** True when typing into a field, where single-letter shortcuts must not fire. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Window-level shortcuts. Handlers get the event and return true if they
 * handled it (the default action is then prevented). Ignored while typing in
 * a field or with Ctrl/Cmd/Alt held.
 */
export function useHotkeys(handlers: Record<string, (e: KeyboardEvent) => boolean | void>) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handler = ref.current[key];
      if (handler && handler(e) !== false) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Focus without jumping the page (the volunteer keeps their place). */
export function focusQuietly(el: HTMLElement | null | undefined) {
  el?.focus({ preventScroll: true });
}
