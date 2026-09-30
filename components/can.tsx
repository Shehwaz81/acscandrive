import type { ReactNode } from "react";

/**
 * The drive's motif: a can drawn in CSS, used as a progress meter (hero,
 * selected homeroom) and as podium blocks. Size it with `className`.
 */
const VARIANTS = {
  hero: {
    body: "inset-y-4 border-4 rounded-2xl",
    lid: "h-[26px] -inset-x-[7px] border-4 rounded-xl can-lid",
    fill: "border-t-[3px]",
  },
  podium: {
    body: "inset-y-[9px] border-[3px] rounded-[10px] md:inset-y-3 md:border-4 md:rounded-[14px]",
    lid: "h-[18px] -inset-x-1 border-[3px] rounded-lg bg-kraft md:h-6 md:-inset-x-1.5 md:border-4 md:rounded-[11px] md:can-lid",
    fill: "border-t-2",
  },
  meter: {
    body: "inset-y-2 border-[3px] rounded-[9px]",
    lid: "h-3.5 -inset-x-1 border-[3px] rounded-[7px] bg-kraft",
    fill: "border-t-2",
  },
};

type CanProps = {
  variant: keyof typeof VARIANTS;
  /** Fill level in percent; omit for an unfilled can. */
  fill?: number;
  ribs?: boolean;
  /** Body colour class. */
  bodyClassName?: string;
  className?: string;
  children?: ReactNode;
};

export function Can({
  variant,
  fill,
  ribs = false,
  bodyClassName = "bg-paper",
  className = "",
  children,
}: CanProps) {
  const v = VARIANTS[variant];
  return (
    <div className={`relative flex-none ${className}`}>
      <div className={`absolute inset-x-0 overflow-hidden border-ink ${v.body} ${bodyClassName}`}>
        {fill !== undefined && (
          <div
            className={`absolute inset-x-0 bottom-0 border-ink bg-tomato ${v.fill}`}
            style={{ height: `${fill}%` }}
          />
        )}
        {ribs && <div className="absolute inset-0 can-ribs" />}
        {children}
      </div>
      <div aria-hidden className={`absolute top-0 border-ink ${v.lid}`} />
      <div aria-hidden className={`absolute bottom-0 border-ink ${v.lid}`} />
    </div>
  );
}
