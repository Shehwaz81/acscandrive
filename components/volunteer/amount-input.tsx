"use client";

import type { KeyboardEvent, Ref } from "react";
import type { Method } from "@/lib/volunteer/types";

const SIZES = {
  hero: {
    input: "h-[104px] border-[3px] text-[80px] md:h-[120px] md:text-[96px]",
    prefix: "left-5 text-[56px] md:text-[64px]",
    padPrefix: "pl-[68px] md:pl-[76px]",
    suffix: "right-5 text-[13px]",
    padSuffix: "pr-24",
    step: "w-14 md:w-16 text-[32px]",
  },
  compact: {
    input: "h-16 border-2 text-[40px]",
    prefix: "left-3.5 text-[30px]",
    padPrefix: "pl-10",
    suffix: "right-3.5 text-[12px]",
    padSuffix: "pr-20",
    step: "w-12 text-2xl",
  },
};

/**
 * One amount field for both methods. The same <input> stays mounted when the
 * method changes (only its prefix, suffix and padding change), so focus and
 * the typed value survive a switch. "$" switches to cash and "C" to cans
 * without typing the character.
 */
export function AmountInput({
  id,
  inputRef,
  method,
  value,
  onChange,
  onMethodChange,
  onSubmit,
  onEscape,
  invalid,
  describedBy,
  disabled = false,
  size = "hero",
  label,
}: {
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  method: Method;
  value: string;
  onChange: (raw: string) => void;
  onMethodChange: (m: Method) => void;
  onSubmit: () => void;
  onEscape?: () => void;
  invalid: boolean;
  describedBy?: string;
  disabled?: boolean;
  size?: keyof typeof SIZES;
  /** Only needed when no visible <label htmlFor> exists. */
  label?: string;
}) {
  const s = SIZES[size];
  const cans = method === "cans";

  const step = (delta: number) => {
    const n = Number(value.replace(/,/g, ""));
    const base = Number.isInteger(n) ? n : 0;
    onChange(String(Math.max(1, base + delta)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "$") {
      e.preventDefault();
      onMethodChange("cash");
    } else if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      onMethodChange("cans");
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (cans && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      step(e.key === "ArrowUp" ? 1 : -1);
    } else if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      e.stopPropagation();
      onEscape();
    }
  };

  const stepBtn = `flex flex-none items-center justify-center border-ink bg-field font-display font-black hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-field disabled:hover:text-ink ${s.step} ${
    size === "hero" ? "border-[3px]" : "border-2"
  }`;

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative min-w-0 flex-1">
        {!cans && (
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 font-display leading-none font-black text-muted ${s.prefix}`}
          >
            $
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode={cans ? "numeric" : "decimal"}
          autoComplete="off"
          placeholder={cans ? "0" : "0.00"}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={`w-full min-w-0 bg-field px-5 font-display leading-none font-black text-ink tabular-nums placeholder:text-rule disabled:opacity-60 ${s.input} ${
            cans ? s.padSuffix : s.padPrefix
          } ${invalid ? "border-tomato" : "border-ink"}`}
        />
        {cans && (
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 font-mono font-bold tracking-[.1em] text-muted ${s.suffix}`}
          >
            CANS
          </span>
        )}
      </div>
      {cans && (
        <div className="hidden flex-col gap-2 min-[420px]:flex">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Add one can"
            disabled={disabled}
            onClick={() => step(1)}
            className={`${stepBtn} flex-1`}
          >
            +
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Remove one can"
            disabled={disabled}
            onClick={() => step(-1)}
            className={`${stepBtn} flex-1`}
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
