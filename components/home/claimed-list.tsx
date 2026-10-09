"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { PublicClaim } from "@/lib/claims";

const CLAIMS_ERROR = "Claimed streets couldn't load. Refresh the page to try again.";

/** Streets shown before "See all". Even, so the two-column layout ends on a full row. */
export const PREVIEW = 6;
/** A list only this much longer than the preview is shown whole: a button that reveals a row or two isn't worth its own row. */
const SLACK = 2;

/**
 * Every claimed street, A to Z. A long list starts as its first PREVIEW
 * streets with a "See all" row closing the box, so the section stays short
 * until someone asks for the rest.
 */
export function ClaimedList({ claims, failed }: { claims: PublicClaim[] | null; failed: boolean }) {
  const listId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstRevealedRef = useRef<HTMLLIElement>(null);
  const [expanded, setExpanded] = useState(false);

  const total = claims?.length ?? 0;
  const collapsible = total > PREVIEW + SLACK;
  const shown = collapsible && !expanded ? (claims ?? []).slice(0, PREVIEW) : (claims ?? []);

  const toggle = () => {
    const button = toggleRef.current;
    if (!button) return;
    const top = button.getBoundingClientRect().top;
    // Render now, so the button's new position can be measured in this handler.
    flushSync(() => setExpanded(!expanded));
    if (expanded) {
      // The list above the button just got shorter. Scroll by the same amount, so the
      // button stays under the pointer instead of the page landing on whatever came after.
      window.scrollBy({ top: button.getBoundingClientRect().top - top, behavior: "instant" });
    } else {
      // The button is now at the end of the list; reading carries on from the first street it revealed.
      firstRevealedRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 lg:col-start-2 lg:row-start-3">
      <h3 className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">CLAIMED STREETS</h3>
      {failed ? (
        <p className="text-[14px] font-semibold text-error">{CLAIMS_ERROR}</p>
      ) : claims === null ? (
        <p className="text-[14px] text-body">Loading…</p>
      ) : total === 0 ? (
        <p className="text-[14px] text-body">No streets claimed yet. Be the first.</p>
      ) : (
        <div className="border-2 border-ink bg-paper">
          {/* Two across from sm up, which halves the height; rows fill left to right, so "See all" only adds rows below. */}
          <ul id={listId} className="grid grid-cols-1 sm:grid-cols-2">
            {shown.map((c, i) => {
              const firstRevealed = collapsible && i === PREVIEW;
              return (
                <li
                  key={c.placeId}
                  ref={firstRevealed ? firstRevealedRef : undefined}
                  tabIndex={firstRevealed ? -1 : undefined}
                  className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t-2 border-rule px-4 py-2.5 first:border-t-0 sm:odd:border-r-2 sm:nth-2:border-t-0"
                >
                  <span className="min-w-0 font-semibold break-words">{c.address}</span>
                  <span className="text-[14px] text-body">{c.claimer}</span>
                </li>
              );
            })}
          </ul>
          {collapsible && (
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={toggle}
              // The focus ring is drawn inside the row: the site-wide outer ring would cover the street above.
              className="flex min-h-12 w-full items-center justify-between gap-4 border-t-2 border-ink px-4 text-left text-[15px] font-bold hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:-outline-offset-6 focus-visible:shadow-none"
            >
              {expanded ? "See fewer streets" : `See all ${total} streets`}
              <span aria-hidden className="font-display text-[26px] leading-none font-extrabold">
                {expanded ? "−" : "+"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
