import { Ticket } from "@/components/ticket";
import { WRAP } from "@/lib/site";

// Reward rules as confirmed by the owner (2026-09-29).
export function Incentives() {
  return (
    <section
      id="incentives"
      aria-labelledby="incentives-title"
      className="scroll-mt-4 border-t-2 border-ink bg-kraft"
    >
      <div className={`${WRAP} flex flex-col gap-[22px] pt-10 pb-12 lg:gap-14 lg:pt-20 lg:pb-24`}>
        <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
          <h2
            id="incentives-title"
            className="font-display text-[clamp(3.5rem,18vw,4.5rem)] leading-[.84] font-black uppercase lg:text-[clamp(6rem,9.2vw,8.25rem)]"
          >
            Up for <br className="hidden lg:block" />
            grabs
          </h2>
          <div className="flex flex-col gap-[22px] lg:gap-[18px] lg:pb-2.5">
            <p className="text-base leading-[1.45] text-pretty lg:text-xl">
              Four rewards, two ways to earn them: on your own, or together with your homeroom.
            </p>
            <p className="max-w-[440px] border-l-4 border-tomato pl-3 text-[14.5px] leading-normal text-body lg:text-base">
              Everything logged at the desk counts, and every $1 counts as one can. The standings update about
              once a minute.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[22px] xl:grid xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-14">
          <div className="flex flex-col gap-[22px] lg:gap-7">
            <GroupHeading title="Just you" note="Individual rewards" />
            <Ticket stub="INDIVIDUAL" number={1} className="-rotate-[1.2deg] bg-butter lg:-rotate-[1.5deg]">
              <div className="flex flex-col gap-2.5 px-5 pt-5 pb-[22px] lg:gap-3.5 lg:px-9 lg:pt-[30px] lg:pb-8">
                <h3 className="font-display text-4xl leading-[.9] font-black uppercase lg:text-[50px]">
                  Dress-down day
                </h3>
                <div className="flex items-baseline gap-2.5 lg:gap-3">
                  <span className="font-display text-6xl leading-[.8] font-black lg:text-[80px]">10</span>
                  <span className="text-[17px] leading-[1.2] font-bold lg:text-xl">
                    cans <br className="hidden lg:block" />
                    or $10
                  </span>
                </div>
                <p className="text-sm leading-[1.45] lg:text-[15px]">
                  Bring 10 cans, $10, or a mix. Your call.
                </p>
              </div>
            </Ticket>
            <Ticket
              stub="INDIVIDUAL"
              number={2}
              stubBorderClassName="border-ink/35"
              className="rotate-[.8deg] bg-paper lg:ml-7 lg:rotate-1"
            >
              <div className="flex flex-col gap-2 px-5 pt-5 pb-[22px] lg:gap-3 lg:px-9 lg:pt-7 lg:pb-[30px]">
                <h3 className="font-display text-[32px] leading-[.9] font-black uppercase lg:text-[44px]">
                  Lunch vouchers
                </h3>
                <span className="font-display text-xl leading-[1.1] font-extrabold text-tomato uppercase lg:text-[26px]">
                  Top 3 donors · every day
                </span>
                <p className="text-sm leading-[1.45] text-pretty lg:text-[15px]">
                  The three biggest individual contributors of the day earn a voucher.
                </p>
              </div>
            </Ticket>
          </div>

          <div className="flex flex-col gap-[22px] pt-2 lg:gap-7 lg:pt-4 xl:pt-0">
            <GroupHeading title="Your homeroom" note="Class rewards — everyone’s cans add up" />
            <Ticket
              stub="HOMEROOM"
              number={3}
              stubBorderClassName="border-white/50"
              className="rotate-1 bg-tomato text-white lg:rotate-[.8deg]"
            >
              <div className="flex items-center gap-4 px-5 pt-5 pb-[22px] lg:gap-9 lg:px-10 lg:py-[30px]">
                <span className="font-display text-[80px] leading-[.78] font-black lg:text-[150px]">#1</span>
                <div className="flex min-w-0 flex-col gap-1.5 lg:gap-2.5">
                  <h3 className="font-display text-[30px] leading-[.9] font-black uppercase lg:text-[54px]">
                    Homeroom pizza party
                  </h3>
                  <p className="text-sm leading-[1.4] lg:text-[17px] lg:leading-[1.45]">
                    Goes to the top homeroom in the standings.
                  </p>
                </div>
              </div>
            </Ticket>
            <Ticket
              stub="HOMEROOM"
              number={4}
              stubBorderClassName="border-paper/40"
              className="-rotate-[.8deg] bg-ink text-paper lg:mr-6"
            >
              <div className="grid gap-4 px-5 pt-5 pb-[22px] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-7 lg:px-10 lg:pt-[30px] lg:pb-8">
                <div className="flex flex-col gap-2.5 lg:gap-3.5">
                  <h3 className="font-display text-[44px] leading-[.85] font-black text-butter uppercase lg:text-[64px]">
                    Dodgeball
                  </h3>
                  <p className="max-w-[420px] text-[15px] leading-[1.45] text-pretty lg:text-lg">
                    Your homeroom hits <b>10 cans per student</b>. The <b>first 20 qualifying classes</b>{" "}
                    play.
                  </p>
                  <a
                    href="#standings"
                    className="self-start py-2 text-[14.5px] font-semibold text-butter lg:text-[15px]"
                  >
                    Check your homeroom’s target →
                  </a>
                </div>
                <div className="flex flex-col gap-1 self-start border-2 border-paper px-[18px] py-3.5 text-[13px] lg:self-auto">
                  <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-rule">EXAMPLE</span>
                  <span>28 students × 10</span>
                  <span className="font-display text-[40px] leading-none font-black">= 280 cans</span>
                </div>
              </div>
            </Ticket>
          </div>
        </div>
      </div>
    </section>
  );
}

function GroupHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-b-2 border-ink pb-2 lg:gap-x-3 lg:pb-2.5">
      <span className="font-display text-[26px] font-black whitespace-nowrap uppercase lg:text-[30px]">{title}</span>
      <span className="text-[13px] text-muted lg:text-sm">{note}</span>
    </div>
  );
}
