import Image from "next/image";
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

/** Assumption College crest. Decorative: the school name always sits beside it. */
export function SchoolLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/acslogo.png"
      alt=""
      width={371}
      height={439}
      className={`flex-none object-contain ${className}`}
    />
  );
}
