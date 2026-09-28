"use client";

import { useState } from "react";
import { SCHOOL_ZONE, TAKEN_ZONES, ZONE_COLS, ZONE_ROWS } from "@/lib/demo-data";
import { WRAP } from "@/lib/site";

// Schematic placeholder; the real area model (street segments on Google Maps)
// and the booking rule are still undecided (see CLAUDE.md).
const ZONES = ZONE_ROWS.flatMap((row) =>
  Array.from({ length: ZONE_COLS }, (_, c) => `${row}${c + 1}`),
);

export function ZoneMap() {
  const [selected, setSelected] = useState("B2");
  const selectedTaken = TAKEN_ZONES.has(selected);

  return (
    <section id="map" aria-labelledby="map-title" className="scroll-mt-4 border-t-2 border-ink bg-kraft">
      <div
        className={`${WRAP} grid gap-[18px] pt-10 pb-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-x-14 lg:gap-y-6 lg:pt-20 lg:pb-24`}
      >
        <div className="flex flex-col gap-[18px] lg:gap-6">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
            STREET COLLECTION
          </span>
          <h2
            id="map-title"
            className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase lg:text-[clamp(5rem,6.7vw,6rem)]"
          >
            Claim <br className="hidden lg:block" />a zone
          </h2>
          <p className="text-[15.5px] leading-normal text-pretty lg:text-[17px]">
            Pick an open area and the date you plan to collect. No account needed — just your name and
            homeroom.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="grid grid-cols-5 gap-1.5 border-[3px] border-ink bg-rule p-1.5 lg:-rotate-[.6deg] lg:gap-3 lg:p-3">
            {ZONES.map((id) => {
              const school = id === SCHOOL_ZONE;
              const taken = TAKEN_ZONES.has(id);
              const isSel = id === selected;
              const chip = school
                ? "bg-tomato text-white"
                : taken
                  ? "bg-paper text-ink"
                  : isSel
                    ? "bg-ink text-butter"
                    : "text-ink";
              const [label, short] = school
                ? ["SCHOOL", "SCHL"]
                : taken
                  ? ["TAKEN", "TAKEN"]
                  : isSel
                    ? ["SELECTED", "PICK"]
                    : ["OPEN", "OPEN"];
              return (
                <button
                  key={id}
                  type="button"
                  disabled={school}
                  onClick={() => setSelected(id)}
                  aria-pressed={school ? undefined : isSel}
                  aria-label={`Zone ${id}, ${school ? "school" : taken ? "taken" : "open"}`}
                  className={`flex h-16 min-w-0 flex-col items-start justify-between border-2 border-ink p-1 lg:h-[104px] lg:p-2.5 ${school ? "bg-tomato" : taken ? "hatch" : "bg-butter"} ${isSel ? "outline-4 outline-offset-2 outline-tomato lg:outline-offset-[3px]" : ""}`}
                >
                  <span className={`px-1 py-px font-display text-[17px] leading-none font-extrabold lg:px-1.5 lg:py-0.5 lg:text-[22px] ${chip}`}>
                    {id}
                  </span>
                  <span className={`px-[3px] py-0.5 font-mono text-[8px] font-bold tracking-[.02em] lg:px-1.5 lg:py-[3px] lg:text-[11px] lg:tracking-[.1em] ${chip}`}>
                    <span className="lg:hidden">{short}</span>
                    <span className="hidden lg:inline">{label}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[11px] font-semibold text-muted lg:text-xs">
            Schematic placeholder — not to scale. Real zones and availability TBC.
          </span>
        </div>

        <div className="flex flex-col gap-[18px] lg:gap-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13.5px] lg:flex-col lg:gap-2.5 lg:text-[14.5px]">
            <Legend swatch="bg-butter" name="Open" desc="available to reserve" />
            <Legend swatch="hatch" name="Taken" desc="already reserved" />
            <Legend swatch="bg-tomato" name="School" />
          </ul>
          <div aria-live="polite" className="flex flex-col gap-1 border-2 border-ink bg-paper px-4 py-3.5 lg:px-[18px] lg:py-4">
            <span className="font-display text-[22px] leading-none font-extrabold uppercase lg:text-[26px]">
              Zone {selected} · {selectedTaken ? "Taken" : "Open"}
            </span>
            <span className="text-[13.5px] text-body lg:text-sm">
              {selectedTaken
                ? "Someone already reserved this one. Try a yellow zone."
                : "Available. Reserve it with your name, homeroom, and planned date."}
            </span>
          </div>
          <a
            href="#"
            className="mr-[5px] flex h-14 items-center justify-between gap-3 bg-ink px-5 text-base font-bold text-paper no-underline shadow-[5px_5px_0_var(--color-butter)] hover:bg-tomato hover:text-white lg:mr-0 lg:h-auto lg:self-start lg:px-[26px] lg:py-[18px] lg:shadow-[6px_6px_0_var(--color-butter)]"
          >
            Choose a collection area <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Legend({ swatch, name, desc }: { swatch: string; name: string; desc?: string }) {
  return (
    <li className="flex items-center gap-2 lg:gap-3">
      <span aria-hidden className={`h-[18px] w-[26px] border-2 border-ink lg:h-6 lg:w-[34px] ${swatch}`} />
      <span>
        <b>{name}</b>
        {desc && <span className="hidden lg:inline"> — {desc}</span>}
      </span>
    </li>
  );
}
