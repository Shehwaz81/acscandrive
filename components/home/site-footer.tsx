import { LogoPlaceholder } from "@/components/marks";
import { NAV_LINKS, VOLUNTEER_LOGIN_HREF, WRAP } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div
        className={`${WRAP} flex flex-col gap-6 pt-9 pb-7 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)] lg:gap-12 lg:pt-14 lg:pb-10`}
      >
        <div className="flex items-center gap-3.5 lg:items-start lg:gap-4">
          <LogoPlaceholder className="size-11 border-rule text-[7px] text-rule lg:size-14 lg:text-[8px]" />
          <div className="flex flex-col gap-0.5 lg:gap-1.5">
            <span className="font-display text-[30px] leading-[.9] font-black uppercase lg:text-[40px]">
              Can Drive
            </span>
            <span className="text-[12.5px] text-rule lg:text-sm">
              Assumption College Catholic Secondary School
              <br className="hidden lg:block" />
              <span className="lg:hidden"> · </span>Windsor, Ontario
            </span>
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-4 text-[15px] lg:flex lg:flex-col lg:gap-1">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="py-2.5 lg:py-1.5">
              {l.label}
            </a>
          ))}
          <a href={VOLUNTEER_LOGIN_HREF} className="py-2.5 text-rule lg:py-1.5">
            Volunteer login
          </a>
        </nav>
        <div className="flex flex-col gap-6 text-sm text-rule lg:gap-2">
          <span className="hidden font-semibold text-paper lg:block">Questions?</span>
          <span className="border-[1.5px] border-dashed border-rule px-3 py-2.5 font-mono text-[12.5px] font-semibold lg:self-start lg:text-[13px]">
            [ Organizer contact — TBC ]
          </span>
          <span className="text-xs lg:mt-3 lg:text-[12.5px]">
            Prototype — all totals are demo figures and reward rules are provisional.
          </span>
        </div>
      </div>
    </footer>
  );
}
