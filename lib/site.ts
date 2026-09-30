/** Shared page chrome. Kept out of client modules so server components can import it. */

/** Centred 1440px content column with the design's 20px / 64px gutters. */
export const WRAP = "mx-auto w-full max-w-[1440px] px-5 lg:px-16";

export const NAV_LINKS = [
  { href: "#incentives", label: "Incentives" },
  { href: "#standings", label: "Standings" },
  { href: "#map", label: "Collection map" },
];

export const VOLUNTEER_LOGIN_HREF = "/volunteer";

/** Fixed drive details (2026), confirmed by the organizer. Not database data. */
export const DRIVE = {
  dates: "October 5–23",
  shortDates: "Oct 5–23",
  deskLocation: "California entrance",
  deskHours: "7:30–8:10 a.m.",
  contactName: "Shehwaz Saini",
  contactEmail: "shehwaz.saini@mytools2go.ca",
};
