"use client";

import { useRef, type KeyboardEvent } from "react";
import type { Method } from "@/lib/volunteer/types";
import { CanGlyph } from "./method-tag";

const OPTIONS: { value: Method; title: string; sub: string; subShort: string }[] = [
  { value: "cans", title: "Cans", sub: "Whole cans", subShort: "Whole cans" },
  { value: "cash", title: "Cash", sub: "Dollars and cents", subShort: "Dollars + cents" },
];

/** Radiogroup of two large cards; arrow keys move and select (roving tabindex). */
export function MethodPicker({
  labelledBy,
  value,
  onChange,
  disabled = false,
}: {
  labelledBy: string;
  value: Method;
  onChange: (m: Method) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-2 gap-3">
      {OPTIONS.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex min-h-[72px] items-center gap-2.5 border-2 border-ink px-3 text-left disabled:opacity-60 md:gap-4 md:px-4 ${
              checked ? "bg-ink text-paper" : "bg-field text-ink hover:bg-kraft"
            }`}
          >
            <span
              aria-hidden
              className={`flex size-8 flex-none items-center justify-center border-2 md:size-10 ${
                checked ? "border-butter text-butter" : "border-ink"
              }`}
            >
              {o.value === "cans" ? (
                <CanGlyph className="size-5" />
              ) : (
                <span className="font-display text-2xl leading-none font-black">$</span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl leading-none font-black uppercase">{o.title}</span>
              <span className={`block text-[13px] ${checked ? "text-rule" : "text-body"}`}>
                <span className="md:hidden">{o.subShort}</span>
                <span className="hidden md:inline">{o.sub}</span>
              </span>
            </span>
            <span
              aria-hidden
              className={`hidden size-5 flex-none items-center justify-center rounded-full border-2 md:flex ${
                checked ? "border-butter" : "border-ink"
              }`}
            >
              {checked && <span className="size-2.5 rounded-full bg-butter" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
