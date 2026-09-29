import type { Method } from "@/lib/volunteer/types";

/** Small can outline; decorative. */
export function CanGlyph({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2" y="2.5" width="10" height="11" rx="1.5" />
      <path d="M1 3h12M1 13h12M5 6v5M9 6v5" />
    </svg>
  );
}

/** Cans and cash must never look alike: outline + can vs solid ink + $. */
export function MethodTag({ method }: { method: Method }) {
  const base = "inline-flex h-7 items-center gap-1.5 px-2 font-mono text-[11px] font-bold tracking-[.1em]";
  return method === "cans" ? (
    <span className={`${base} border-2 border-tomato text-error`}>
      <CanGlyph />
      CANS
    </span>
  ) : (
    <span className={`${base} bg-ink text-butter`}>
      <span aria-hidden>$</span>
      CASH
    </span>
  );
}
