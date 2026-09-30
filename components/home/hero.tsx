import { Can } from "@/components/can";
import { MarkerUnderline, Stamp } from "@/components/marks";
import { fmt } from "@/lib/demo-data";
import { DRIVE, WRAP } from "@/lib/site";

type Progress = { goal: number; total: number };

/**
 * Every figure the meters show, derived from the same two numbers so the
 * fill, the count and the notes can't disagree.
 */
function progress({ goal, total }: Progress) {
  const ratio = goal > 0 ? total / goal : 0;
  const reached = total >= goal;
  // Floor, so 19,990 of 20,000 never reads "100%" while cans are still to go.
  const pct = Math.floor(ratio * 100);
  return {
    /** Fill height in percent, capped at the rim. */
    fill: Math.min(ratio, 1) * 100,
    reached,
    progressNote: reached ? "Goal reached!" : total > 0 && pct === 0 ? "Under 1% there" : `${pct}% there`,
    toGoNote: reached
      ? total > goal
        ? `+${fmt(total - goal)} over`
        : "Right on target."
      : `${fmt(goal - total)} to go!`,
    label: `${fmt(total)} of ${fmt(goal)} can-equivalents collected (${reached ? "goal reached" : `${pct}%`})`,
  };
}

export function Hero({ goal, total }: Progress) {
  const p = progress({ goal, total });
  return (
    <section id="top" aria-label="Can Drive progress" className="scroll-mt-4">
      <div
        className={`${WRAP} grid items-center gap-8 pt-7 pb-9 xl:grid-cols-[minmax(0,1fr)_480px] xl:pt-14 xl:pb-[72px]`}
      >
        <div className="flex flex-col gap-[22px] xl:gap-7">
          <span className="hidden text-[13px] font-semibold tracking-[.1em] text-muted uppercase md:block">
            Assumption College Catholic Secondary School
          </span>
          <h1 className="font-display text-[min(calc((100vw-40px)/5),6.5rem)] leading-[.84] font-black tracking-[-.01em] uppercase xl:text-[clamp(6.5rem,9.4vw,8.5rem)]">
            Small cans.
            <br />
            <MarkerUnderline className="text-tomato" strokeClassName="bottom-0 h-4 xl:bottom-0.5 xl:h-[26px]">
              Big impact.
            </MarkerUnderline>
          </h1>
          <p className="max-w-[520px] text-[16.5px] leading-normal text-pretty xl:text-[19px]">
            One school, one goal: <b>{fmt(goal)} cans</b>, {DRIVE.dates}. Every can
            you bring counts, and cash counts too: every $1 counts as one can, so every homeroom plays on
            the same scoreboard.
          </p>

          <CompactMeter goal={goal} total={total} p={p} />

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

        <BigCanMeter goal={goal} total={total} p={p} />
      </div>
    </section>
  );
}

type MeterProps = Progress & { p: ReturnType<typeof progress> };

/** Mobile/tablet: small can beside the stats. */
function CompactMeter({ goal, total, p }: MeterProps) {
  return (
    <div
      role="img"
      aria-label={p.label}
      className="relative flex items-stretch gap-[18px] border-y-2 border-ink py-4 md:max-w-[520px] xl:hidden"
    >
      <Can variant="meter" fill={p.fill} ribs className="h-[122px] w-[84px]" />
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div className="flex items-baseline gap-2 border-b-2 border-dashed border-ink pt-1 pb-1.5">
          <span className="font-mono text-[10.5px] font-bold tracking-[.12em]">GOAL</span>
          <span className="font-display text-[26px] leading-none font-black">{fmt(goal)} cans</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[54px] leading-[.9] font-black">{fmt(total)}</span>
          <span className="text-[13.5px] font-semibold">
            can-equivalents collected
            <span className="block font-normal text-muted">cans + cash, $1 = 1 can</span>
          </span>
        </div>
        <span className="origin-left -rotate-3 font-marker text-[17px] leading-[1.1] text-error">
          {p.progressNote} {!p.reached && "— "}
          {p.toGoNote}
        </span>
      </div>
      <Stamp className="absolute top-[22px] right-0 rotate-6 border-tomato px-1.5 py-0.5 text-[9.5px] tracking-[.1em] text-tomato">
        DEMO
      </Stamp>
    </div>
  );
}

// Desktop scale geometry: the can body's inner box spans the same 300px as the
// tick column (y = 110 at the goal, y = 410 at zero), so fill % maps 1:1.
const SCALE_TOP = 110;
const SCALE_HEIGHT = 300;

/** Desktop: the giant can with a 0–goal scale and a pointer at the fill line. */
function BigCanMeter({ goal, total, p }: MeterProps) {
  const ticks = [goal, goal * 0.75, goal * 0.5, goal * 0.25, 0];
  const fillY = SCALE_TOP + (1 - p.fill / 100) * SCALE_HEIGHT;
  // The readout starts level with the pointer; in the lower part of the can it
  // sits above the pointer instead, so it never runs past the can's base.
  const low = fillY > 260;
  const readoutStyle = low
    ? { top: fillY - 22, transform: "translateY(-100%)" }
    : { top: Math.max(fillY - 34, SCALE_TOP + 14) };
  return (
    <div role="img" aria-label={p.label} className="relative hidden h-[440px] xl:block">
      <div aria-hidden className="absolute top-[110px] right-0 left-[52px] border-t-[3px] border-dashed border-ink" />
      <div className="absolute top-0 right-0 flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-xs font-bold tracking-[.14em] text-muted">THE GOAL</span>
        <span className="flex items-baseline gap-2.5">
          <span className="font-display text-[80px] leading-[.86] font-black">{fmt(goal)}</span>
          <span className="font-display text-[28px] leading-none font-extrabold uppercase">cans</span>
        </span>
      </div>
      <Stamp className="absolute top-3 left-0 -rotate-4 border-tomato px-2.5 py-1 text-xs text-tomato">
        DEMO FIGURES
      </Stamp>

      <div className="absolute top-[110px] left-0 h-[300px] w-11 font-mono text-[11px] font-semibold text-muted">
        {ticks.map((t, i) => (
          <span
            key={i}
            className={`absolute right-0 flex -translate-y-1/2 items-center gap-[5px] ${i === 0 ? "font-bold text-ink" : ""}`}
            style={{ top: `${i * 25}%` }}
          >
            {t === 0 ? "0" : `${t / 1000}k`}
            <span className={`h-0.5 w-2 ${i === 0 ? "bg-ink" : "bg-muted"}`} />
          </span>
        ))}
      </div>

      <Can variant="hero" fill={p.fill} ribs className="absolute! top-[90px] left-[62px] h-[340px] w-[236px]" />

      {/* Pointer sits exactly on the fill line; the readout beside it may be nudged. */}
      <span
        className="absolute left-[304px] -translate-y-1/2 font-marker text-2xl leading-none text-tomato"
        style={{ top: fillY }}
      >
        ←
      </span>
      <div className="absolute left-[330px] flex flex-col gap-1 whitespace-nowrap" style={readoutStyle}>
        <span className="font-display text-[52px] leading-[.9] font-black">{fmt(total)}</span>
        <span className="text-[13px] leading-snug font-semibold">
          can-equivalents
          <br />
          <span className="font-normal text-muted">cans + cash</span>
        </span>
        <span className="mt-1.5 origin-left -rotate-4 font-marker text-lg leading-[1.15] text-error">
          {p.progressNote}
          <br />
          {p.toGoNote}
        </span>
      </div>
    </div>
  );
}
