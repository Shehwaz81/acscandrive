import { Can } from "@/components/can";
import { MarkerUnderline, Stamp } from "@/components/marks";
import { GOAL, TOTAL_COLLECTED, fmt } from "@/lib/demo-data";
import { WRAP } from "@/lib/site";

const fillPct = (TOTAL_COLLECTED / GOAL) * 100;
const progressNote = `${Math.round(fillPct)}% there`;
const toGoNote = `${fmt(GOAL - TOTAL_COLLECTED)} to go!`;

export function Hero() {
  return (
    <section id="top" aria-label="Can Drive progress" className="scroll-mt-4">
      <div
        className={`${WRAP} grid items-center gap-8 pt-7 pb-9 xl:grid-cols-[minmax(0,1fr)_480px] xl:pt-14 xl:pb-[72px]`}
      >
        <div className="flex flex-col gap-[22px] xl:gap-7">
          <span className="hidden text-[13px] font-semibold tracking-[.1em] text-muted uppercase md:block">
            Assumption College Catholic Secondary School
          </span>
          <h1 className="font-display text-[clamp(3.75rem,19.5vw,6.5rem)] leading-[.84] font-black tracking-[-.01em] uppercase xl:text-[clamp(6.5rem,9.4vw,8.5rem)]">
            Small cans.
            <br />
            <MarkerUnderline className="text-tomato" strokeClassName="bottom-0 h-4 xl:bottom-0.5 xl:h-[26px]">
              Big impact.
            </MarkerUnderline>
          </h1>
          <p className="max-w-[520px] text-[16.5px] leading-normal text-pretty xl:text-[19px]">
            One school, one goal: {fmt(GOAL)} cans. Every can you bring counts, and cash counts too —
            every $1 counts as one can, so every homeroom plays on the same scoreboard.
          </p>

          <CompactMeter />

          <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:gap-8">
            <a
              href="#incentives"
              className="mr-[5px] flex h-14 items-center justify-between gap-3 bg-ink px-5 text-[17px] font-bold text-paper no-underline shadow-[5px_5px_0_var(--color-butter)] hover:bg-tomato hover:text-white md:self-start xl:mr-0 xl:h-auto xl:px-7 xl:py-[18px] xl:shadow-[6px_6px_0_var(--color-butter)]"
            >
              Explore rewards <span aria-hidden className="text-xl">↓</span>
            </a>
            <a href="#map" className="self-start pt-3.5 text-[15.5px] font-semibold xl:py-3 xl:text-base">
              Reserve a collection area →
            </a>
          </div>
        </div>

        <BigCanMeter />
      </div>
    </section>
  );
}

/** Mobile/tablet: small can beside the stats. */
function CompactMeter() {
  return (
    <div className="relative flex items-stretch gap-[18px] border-y-2 border-ink py-4 md:max-w-[520px] xl:hidden">
      <Can variant="meter" fill={fillPct} ribs className="h-[122px] w-[84px]" />
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex items-baseline gap-2 border-b-2 border-dashed border-ink pt-1 pb-1.5">
          <span className="font-mono text-[10.5px] font-bold tracking-[.12em]">GOAL</span>
          <span className="font-display text-[26px] leading-none font-black">{fmt(GOAL)} cans</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[54px] leading-[.9] font-black">{fmt(TOTAL_COLLECTED)}</span>
          <span className="text-[13.5px] font-semibold">cans collected</span>
        </div>
        <span className="origin-left -rotate-3 font-marker text-[17px] leading-[1.1] text-tomato">
          {progressNote} — {toGoNote}
        </span>
      </div>
      <Stamp className="absolute top-[22px] right-0 rotate-6 border-tomato px-1.5 py-0.5 text-[9.5px] tracking-[.1em] text-tomato">
        DEMO
      </Stamp>
    </div>
  );
}

/** Desktop: the giant can with a 0–20k scale. */
function BigCanMeter() {
  const ticks = [GOAL, GOAL * 0.75, GOAL * 0.5, GOAL * 0.25, 0];
  return (
    <div className="relative hidden h-[440px] xl:block">
      <div aria-hidden className="absolute top-[110px] right-0 left-[52px] border-t-[3px] border-dashed border-ink" />
      <div className="absolute top-0 right-0 flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-xs font-bold tracking-[.14em] text-muted">THE GOAL</span>
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-[80px] leading-[.86] font-black">{fmt(GOAL)}</span>
          <span className="font-display text-[28px] leading-none font-extrabold uppercase">cans</span>
        </span>
      </div>

      <div aria-hidden className="absolute top-[110px] left-0 h-[300px] w-11 font-mono text-[11px] font-semibold text-muted">
        {ticks.map((t, i) => (
          <span
            key={t}
            className={`absolute right-0 flex -translate-y-1/2 items-center gap-[5px] ${i === 0 ? "font-bold text-ink" : ""}`}
            style={{ top: `${i * 25}%` }}
          >
            {t === 0 ? "0" : `${t / 1000}k`}
            <span className={`h-0.5 w-2 ${i === 0 ? "bg-ink" : "bg-muted"}`} />
          </span>
        ))}
      </div>

      <span className="absolute top-[200px] left-[326px] origin-left -rotate-4 font-marker text-2xl leading-[1.2] text-tomato">
        ← {progressNote}.
        <br />
        {toGoNote}
      </span>
      <Stamp className="absolute right-1 bottom-5 rotate-5 border-tomato px-2.5 py-1 text-xs text-tomato">
        DEMO FIGURES
      </Stamp>

      <Can variant="hero" fill={fillPct} ribs className="absolute! top-[90px] left-[62px] h-[340px] w-[236px]">
        <div className="absolute inset-x-0 top-[55%] flex flex-col gap-0.5 border-y-4 border-ink bg-paper pt-3.5 pb-3 text-center">
          <span className="font-display text-[58px] leading-[.9] font-black">{fmt(TOTAL_COLLECTED)}</span>
          <span className="text-[13px] font-semibold tracking-[.04em]">cans collected</span>
        </div>
      </Can>
    </div>
  );
}
