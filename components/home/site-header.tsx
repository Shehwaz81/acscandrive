"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LogoPlaceholder } from "@/components/marks";
import { NAV_LINKS, VOLUNTEER_LOGIN_HREF } from "@/lib/site";

/** Nav breakpoint: the homepage collapses below lg; the volunteer desk keeps nav on tablets. */
const NAV_FROM = {
  lg: { nav: "lg:flex", aside: "lg:block", menu: "lg:hidden" },
  md: { nav: "md:flex", aside: "md:block", menu: "md:hidden" },
};

export function SiteHeader({
  linkBase = "",
  homeHref = "#top",
  aside,
  menuAside,
  navFrom = "lg",
}: {
  /** Prefix for the section links, e.g. "/" when rendered off the homepage. */
  linkBase?: string;
  homeHref?: string;
  /** Replaces the "Volunteer login" link at the right. */
  aside?: ReactNode;
  /** Replaces the "Volunteer login" link at the bottom of the phone menu. */
  menuAside?: ReactNode;
  navFrom?: keyof typeof NAV_FROM;
} = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bp = NAV_FROM[navFrom];

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="relative z-20 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 pr-4 pl-5 lg:h-[76px] lg:gap-10 lg:px-16">
        <a href={homeHref} className="flex items-center gap-3 no-underline lg:gap-3.5">
          <LogoPlaceholder className="size-[38px] border-muted text-[6.5px] text-muted lg:size-[46px] lg:text-[7.5px]" />
          <span className="flex flex-col leading-none">
            <span className="text-[9.5px] font-semibold tracking-[.14em] text-muted lg:text-[11px]">
              ASSUMPTION
            </span>
            <span className="font-display text-2xl font-black tracking-[.01em] text-ink lg:text-[28px]">
              CAN DRIVE
            </span>
          </span>
        </a>

        <nav aria-label="Main" className={`ml-auto hidden gap-1.5 ${bp.nav}`}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={linkBase + l.href} className="px-4 py-3 text-[15px] font-semibold no-underline">
              {l.label}
            </a>
          ))}
        </nav>
        <div className={`hidden ${bp.aside}`}>
          {aside ?? (
            <a
              href={VOLUNTEER_LOGIN_HREF}
              className="block border-l border-rule py-3 pl-7 text-[13px] text-muted"
            >
              Volunteer login
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className={`ml-auto h-11 bg-ink px-4 text-[15px] font-bold text-paper ${bp.menu}`}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className={`absolute inset-x-0 top-full flex flex-col bg-ink px-5 pt-2 pb-5 text-paper ${bp.menu}`}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={linkBase + l.href}
              onClick={() => setMenuOpen(false)}
              className="border-b border-paper/20 py-3.5 font-display text-[34px] leading-none font-black uppercase no-underline"
            >
              {l.label}
            </a>
          ))}
          {menuAside ?? (
            <a href={VOLUNTEER_LOGIN_HREF} className="pt-4 pb-1 text-sm text-rule">
              Volunteer login
            </a>
          )}
        </nav>
      )}
    </header>
  );
}
