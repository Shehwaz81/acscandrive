import { Can } from "@/components/can";
import { MarkerUnderline } from "@/components/marks";
import { TeacherRoom } from "@/components/home/teacher-room";
import type { Donor } from "@/lib/homepage";
import { WRAP } from "@/lib/site";

// Podium order left→right is 2nd, 1st, 3rd. Sizes are [phone, md and up].
// Totals are can-equivalents ($1 = 1 can) but labelled "cans" on purpose: it reads cleaner.
const PODIUM = [
  {
    place: 2,
    suffix: "ND",
    body: "bg-paper",
    size: "h-[160px] w-[min(104px,26vw)] md:h-[230px] md:w-[168px]",
    num: "text-[46px] md:text-[68px]",
    sfx: "text-[15px] md:text-[22px]",
    numPos: "top-3.5 md:top-[22px]",
    bandPos: "bottom-3 md:bottom-[18px]",
    tilt: "-rotate-4",
  },
  {
    place: 1,
    suffix: "ST",
    body: "bg-butter",
    size: "h-[204px] w-[min(112px,28vw)] md:h-[300px] md:w-[184px]",
    num: "text-[64px] md:text-[96px]",
    sfx: "text-[19px] md:text-[28px]",
    numPos: "top-[18px] md:top-[26px]",
    bandPos: "bottom-3.5 md:bottom-[22px]",
    tilt: "rotate-3",
  },
  {
    place: 3,
    suffix: "RD",
    body: "bg-tomato",
    size: "h-[138px] w-[min(100px,25vw)] md:h-[196px] md:w-[160px]",
    num: "text-[38px] md:text-[56px] text-white",
    sfx: "text-[14px] md:text-[20px] text-white",
    numPos: "top-2.5 md:top-3.5",
    bandPos: "bottom-2.5 md:bottom-3.5",
    tilt: "-rotate-2",
  },
];

export function TopDonors({ donors }: { donors: Donor[] }) {
  const runnersUp = donors.slice(3);
  // Two columns only from xl: the desktop podium is ~620px wide.
  return (
    <section
      aria-labelledby="donors-title"
      className="border-b-2 border-ink bg-kraft"
    >
      <div
        className={`${WRAP} grid gap-[18px] pt-10 pb-11 lg:gap-[22px] lg:pt-[88px] lg:pb-24 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:items-end xl:gap-x-[72px]`}
      >
        <div className="flex flex-col gap-[18px] lg:gap-[22px]">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em] text-muted lg:text-xs">
            STUDENT TABLE
          </span>
          <h2
            id="donors-title"
            className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase lg:text-[clamp(5rem,6.7vw,6rem)]"
          >
            Top donors <br className="hidden lg:block" />
            <MarkerUnderline strokeClassName="bottom-0 h-[13px] lg:h-[18px]">today</MarkerUnderline>
          </h2>
          <p className="max-w-[420px] text-[15.5px] leading-normal text-pretty lg:text-[17px]">
            New day, new podium — anyone can get up there.
          </p>
        </div>

        <Podium donors={donors} />

        <div className="flex flex-col gap-[18px] lg:gap-[22px]">
          {donors.length === 0 && (
            <p className="border-t-2 border-ink pt-3 text-[15px] text-body">
              No donations logged yet today. Be the first on the podium.
            </p>
          )}
          <ol className={`flex flex-col ${runnersUp.length ? "border-t-2 border-ink" : ""}`}>
            {runnersUp.map((d, i) => (
              <RunnerUp key={d.name} donor={d} place={i + 4} className={i >= 3 ? "hidden lg:flex" : "flex"} />
            ))}
          </ol>
          <a
            href="#standings"
            className="flex h-[52px] items-center justify-center gap-3 border-2 border-ink px-5 text-[15px] font-bold no-underline hover:bg-ink hover:text-paper md:self-start lg:h-auto lg:py-3"
          >
            See homeroom standings <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function Podium({ donors }: { donors: Donor[] }) {
  return (
    <div className="relative flex flex-col pt-[34px] md:items-center md:py-4 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:py-0">
      <span className="absolute top-0 right-0 rotate-5 font-marker text-lg leading-none text-tomato md:-top-1.5 md:right-6 md:rotate-6 md:text-[26px] md:leading-[1.1]">
        top 3 win lunch!
      </span>
      <ol className="flex items-end justify-center gap-2 min-[390px]:gap-3 md:gap-8 md:px-6">
        {PODIUM.map((p) => {
          const d = donors[p.place - 1];
          return (
            <li key={p.place} className="flex flex-col items-center gap-3.5">
              <span
                className={`hidden bg-ink px-3.5 py-1.5 font-mono text-[11px] font-bold tracking-[.12em] text-butter ticket-mask [--notch:5px] md:block ${p.tilt}`}
              >
                LUNCH VOUCHER
              </span>
              <Can variant="podium" ribs className={p.size} bodyClassName={p.body}>
                <div className={`absolute inset-x-0 flex items-baseline justify-center gap-px md:gap-0.5 ${p.numPos}`}>
                  <span className={`font-display leading-[.9] font-black ${p.num}`}>{p.place}</span>
                  <span className={`font-display font-extrabold ${p.sfx}`}>
                    <span className="sr-only">{p.suffix.toLowerCase()} place: </span>
                    <span aria-hidden>{p.suffix}</span>
                  </span>
                </div>
                <div
                  className={`absolute inset-x-0 flex flex-col gap-px border-y-2 border-ink bg-paper px-1 py-1.5 text-center md:gap-0.5 md:border-y-[3px] md:px-2.5 md:py-2 ${p.bandPos}`}
                >
                  {d ? (
                    <>
                      <span className="font-display text-[17px] leading-none font-extrabold md:text-2xl">{d.name}</span>
                      <span className="text-[11px] md:text-[13px]">
                        <TeacherRoom teacher={d.teacher} room={d.room} /> · <b>{d.cans}<span className="hidden md:inline"> cans</span></b>
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-[17px] leading-none font-extrabold text-muted md:text-2xl">
                      Open
                    </span>
                  )}
                </div>
              </Can>
            </li>
          );
        })}
      </ol>
      <div className="h-1.5 self-stretch bg-ink md:-mt-0.5 md:h-2" />
      <span className="flex justify-between self-stretch pt-2 font-mono text-[10.5px] font-semibold tracking-[.1em] text-muted md:pt-2.5 md:text-[11.5px] md:tracking-[.12em]">
        <span>TODAY’S PODIUM · CANS</span>
        <span>RESETS DAILY</span>
      </span>
    </div>
  );
}

function RunnerUp({ donor, place, className }: { donor: Donor; place: number; className: string }) {
  return (
    <li className={`items-baseline gap-2.5 border-b border-ink/15 py-2.5 lg:gap-3 ${className}`}>
      <span className="w-7 font-display text-[22px] leading-none font-black lg:w-8 lg:text-2xl">
        {String(place).padStart(2, "0")}
      </span>
      <span className="text-[15px] font-semibold lg:text-base">{donor.name}</span>
      <span aria-hidden className="flex-1 -translate-y-1 border-b-2 border-dotted border-dot" />
      <span className="text-[12.5px] text-muted lg:text-[13px]">
        <TeacherRoom teacher={donor.teacher} room={donor.room} />
      </span>
      <span className="w-[34px] text-right font-display text-[22px] leading-none font-extrabold lg:w-11 lg:text-2xl">
        {donor.cans}
      </span>
    </li>
  );
}
