import type { ReactNode } from "react";

/** Torn-stub reward ticket with a vertical stub label. */
export function Ticket({
  stub,
  number,
  className = "",
  stubBorderClassName = "border-ink/45",
  children,
}: {
  stub: string;
  /** Shown after the stub label on large screens; omit for none. */
  number?: number;
  /** Colours, rotation, and margins. */
  className?: string;
  stubBorderClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex ticket-mask lg:[--notch:13px] ${className}`}>
      <div
        className={`flex w-11 flex-none items-center justify-center border-r-2 border-dashed lg:w-[74px] ${stubBorderClassName}`}
      >
        <span className="stub-label font-mono text-[10px] font-bold tracking-[.16em] lg:text-xs lg:tracking-[.18em]">
          {stub}
          {number !== undefined && (
            <span className="hidden lg:inline"> · {String(number).padStart(2, "0")}</span>
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
