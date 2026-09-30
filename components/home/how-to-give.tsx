import { DRIVE, WRAP } from "@/lib/site";

const STEPS = [
  { title: "Bring it", body: "Nonperishable food or a cash contribution." },
  { title: "Find the desk", body: "Look for the volunteer collection desk." },
  { title: "Say your name + homeroom", body: "So your contribution gets recorded for you and your class." },
];

export function HowToGive() {
  return (
    <section id="how-to-give" aria-labelledby="give-title" className="scroll-mt-4">
      <div className={`${WRAP} grid gap-6 py-11 lg:gap-10 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] xl:gap-14 lg:py-[88px]`}>
        <div className="flex flex-col gap-4 lg:gap-[18px]">
          <h2
            id="give-title"
            className="font-display text-[clamp(3.25rem,16vw,4rem)] leading-[.84] font-black uppercase lg:text-[clamp(5rem,6.7vw,6rem)]"
          >
            How to <br className="hidden lg:block" />
            give
          </h2>
          <p className="max-w-[320px] text-[15.5px] leading-normal lg:text-[17px]">
            No sign-up. Just show up at the desk.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:gap-10">
          {/* Mobile: dashed vertical timeline. Desktop: three columns. */}
          <ol className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-9">
            {STEPS.map((s, i) => {
              const last = i === STEPS.length - 1;
              return (
                <li key={s.title} className={`relative flex gap-4 lg:flex-col ${last ? "" : "pb-[22px] lg:pb-0"}`}>
                  {/* Connector from this circle's centre to the next one; none after the last step. */}
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute top-[26px] bottom-0 left-[24.5px] border-l-[3px] border-dashed border-ink lg:hidden"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`relative flex size-[52px] flex-none items-center justify-center rounded-full border-[3px] border-ink font-display text-[26px] font-black shadow-[inset_0_0_0_4px_var(--color-paper),inset_0_0_0_6px_var(--color-ink)] lg:size-[72px] lg:border-4 lg:text-4xl lg:shadow-[inset_0_0_0_6px_var(--color-paper),inset_0_0_0_9px_var(--color-ink)] ${last ? "bg-tomato text-white" : "bg-paper"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-1 pt-1 lg:gap-4 lg:pt-0">
                    <h3 className="font-display text-[22px] leading-none font-extrabold uppercase lg:text-[28px]">
                      {s.title}
                    </h3>
                    <p className="text-[15px] leading-[1.45] lg:text-base lg:leading-normal">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Same columns as the steps above, so the boxes line up with them. */}
          <div className="grid gap-2.5 lg:grid-cols-3 lg:gap-9">
            <InfoBox label="Where" value={DRIVE.deskLocation} note="Look for the volunteer desk" />
            <InfoBox label="When" value={DRIVE.shortDates} note={`Desk open ${DRIVE.deskHours}`} />
            <p className="border-t-2 border-ink pt-3 text-[13.5px] leading-normal text-body lg:pt-3.5 lg:text-sm">
              <b className="text-ink">Cans vs. cash:</b> every can counts as one, and every $1 counts as one
              can. Online payments aren’t available yet, so bring it in person.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 border-2 border-ink bg-paper px-3.5 py-3 lg:px-[18px] lg:py-4">
      <span className="font-mono text-[11px] font-bold tracking-[.12em] text-muted uppercase">{label}</span>
      <span className="font-display text-[22px] leading-[1.05] font-extrabold uppercase lg:text-2xl">{value}</span>
      <span className="text-[13.5px] text-body lg:text-sm">{note}</span>
    </div>
  );
}
