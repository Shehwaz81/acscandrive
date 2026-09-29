import type { ReactNode } from "react";

/** Inline validation or save error with the square "!" marker. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-2 text-[15px] font-semibold text-error">
      <span
        aria-hidden
        className="mt-px flex size-5 flex-none items-center justify-center bg-error font-mono text-[13px] font-bold text-white"
      >
        !
      </span>
      {children}
    </p>
  );
}
