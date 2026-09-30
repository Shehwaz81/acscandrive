import { SchoolLogo } from "@/components/marks";
import { DRIVE, NAV_LINKS, VOLUNTEER_LOGIN_HREF, WRAP } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div
        className={`${WRAP} flex flex-col gap-6 pt-9 pb-7 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)_minmax(0,4fr)] lg:gap-12 lg:pt-14 lg:pb-10`}
      >
        <div className="flex items-center gap-3.5 lg:items-start lg:gap-4">
          <SchoolLogo className="size-11 lg:size-14" />
          <div className="flex flex-col gap-0.5 lg:gap-1.5">
            <span className="font-display text-[30px] leading-[.9] font-black uppercase lg:text-[40px]">
              Can Drive
            </span>
            <span className="text-[12.5px] text-rule lg:text-sm">
              Assumption College Catholic Secondary School
              <br />
              Windsor, Ontario
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
        <div className="flex flex-col gap-2 text-sm text-rule">
          <span className="font-semibold text-paper">Questions?</span>
          <span>
            {DRIVE.contactName}
            <br />
            <a href={`mailto:${DRIVE.contactEmail}`} className="text-paper underline">
              {DRIVE.contactEmail}
            </a>
          </span>
          <span className="mt-4 text-xs lg:mt-3 lg:text-[12.5px]">
            Totals update about once a minute. Reward rules are provisional until confirmed.
          </span>
        </div>
      </div>
    </footer>
  );
}
