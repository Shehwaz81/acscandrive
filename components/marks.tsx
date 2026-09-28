import type { ReactNode } from "react";

/** Hand-drawn butter-yellow highlighter stroke behind a word. */
export function MarkerUnderline({
  children,
  className = "",
  strokeClassName = "bottom-0 h-4",
}: {
  children: ReactNode;
  className?: string;
  /** Position and height of the stroke. */
  strokeClassName?: string;
}) {
  return (
    <span className={`relative isolate inline-block ${className}`}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 300 20"
        preserveAspectRatio="none"
        className={`absolute -left-[1%] -z-10 w-[102%] ${strokeClassName}`}
      >
        <path
          d="M4 13 C 60 5, 120 17, 180 9 S 270 6, 296 12"
          stroke="#F2C230"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Rubber stamp for anything unconfirmed or demo-only. */
export function Stamp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block border-2 font-mono font-bold tracking-[.12em] ${className}`}>
      {children}
    </span>
  );
}

/** Dashed placeholder until the school supplies its logo. */
export function LogoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center border-[1.5px] border-dashed text-center font-mono leading-tight font-semibold ${className}`}
    >
      SCHOOL
      <br />
      LOGO
    </span>
  );
}
