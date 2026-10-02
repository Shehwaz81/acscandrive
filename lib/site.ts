/** Shared page chrome. Kept out of client modules so server components can import it. */

/** Centred 1440px content column with the design's 20px / 64px gutters. */
export const WRAP = "mx-auto w-full max-w-[1440px] px-5 lg:px-16";

export const NAV_LINKS = [
  { href: "#incentives", label: "Incentives" },
  { href: "#standings", label: "Standings" },
  { href: "#grade-wars", label: "Grade Wars" },
  { href: "#map", label: "Collection map" },
];

export const VOLUNTEER_LOGIN_HREF = "/volunteer";

/** Fixed drive details (2026), confirmed by the organizer. Not database data. */
export const DRIVE = {
  /** School goal in can-equivalents. */
  goal: 20_000,
  dates: "October 5–23",
  /** First and last collection days (America/Toronto calendar dates). */
  startDate: "2026-10-05",
  endDate: "2026-10-23",
  /** A day's Grade Wars ranking is final from this Toronto time (desk closes). */
  dailyCutoff: "08:10",
  shortDates: "Oct 5–23",
  deskLocation: "California entrance",
  deskHours: "7:30–8:10 a.m.",
  contactName: "Shehwaz Saini",
  contactEmail: "shehwaz.saini@mytools2go.ca",
};
