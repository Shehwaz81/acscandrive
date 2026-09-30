"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WRAP } from "@/lib/site";
import { KBD, MONO_LABEL } from "@/lib/volunteer/ui";

const TABS = [
  { href: "/volunteer", label: "Dashboard", key: "D" },
  { href: "/volunteer/log", label: "Log donation", key: "L" },
];

export function WorkspaceTabs() {
  const pathname = usePathname();
  return (
    <div className="bg-ink text-paper">
      <div className={`${WRAP} flex flex-col gap-2 pt-3 md:flex-row md:items-center md:gap-6 md:pt-0`}>
        <p className={`${MONO_LABEL} text-butter`}>Volunteer desk</p>
        <nav aria-label="Volunteer workspace" className="grid grid-cols-2 md:flex">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center gap-2.5 px-5 text-[15px] font-bold no-underline md:min-h-14 ${
                  active ? "bg-paper text-ink hover:text-ink" : "text-paper hover:bg-paper/10 hover:text-paper"
                }`}
              >
                {t.label}
                <kbd className={KBD} aria-hidden>
                  {t.key}
                </kbd>
              </Link>
            );
          })}
        </nav>
        <p className="ml-auto hidden text-[13px] text-rule lg:block">
          Protected area · student details stay here
        </p>
      </div>
    </div>
  );
}
