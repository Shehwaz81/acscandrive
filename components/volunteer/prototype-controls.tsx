"use client";

import { useMockControls } from "@/lib/volunteer/provider";
import { MONO_LABEL } from "@/lib/volunteer/ui";

const BTN = "min-h-11 border-2 border-ink px-3 font-bold";

/** Only rendered with the mock data source: lets you reach the failure states on demand. */
export function PrototypeControls() {
  const mock = useMockControls();
  if (!mock) return null;
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-8 md:px-7 lg:px-8">
      <section
        aria-label="Prototype controls"
        className="flex flex-wrap items-center gap-3 border-2 border-dashed border-muted px-4 py-3 text-[13px] text-muted"
      >
        <p className={MONO_LABEL}>Prototype controls</p>
        <p className="mr-auto">Mock data in this tab only. Nothing is sent to a database.</p>
        <button
          type="button"
          aria-pressed={mock.failNextWrite}
          onClick={() => mock.setFailNextWrite(!mock.failNextWrite)}
          className={`${BTN} ${
            mock.failNextWrite ? "bg-tomato text-white" : "text-ink hover:bg-ink hover:text-paper"
          }`}
        >
          Make the next save fail{mock.failNextWrite && <span aria-hidden>: on</span>}
        </button>
        <button type="button" onClick={mock.reset} className={`${BTN} text-ink hover:bg-ink hover:text-paper`}>
          Reset demo data
        </button>
      </section>
    </div>
  );
}
