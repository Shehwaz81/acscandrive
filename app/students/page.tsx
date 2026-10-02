import type { Metadata } from "next";
import { StandingsPage } from "@/components/standings/standings-page";
import { getStandingsData } from "@/lib/standings/standings.server";

export const metadata: Metadata = {
  title: "Student Standings · Can Drive · Assumption College",
  description: "Today’s top donors and the all-time top 25 students of the Assumption College Can Drive.",
};

// Rebuilt in the background at most once a minute. A rebuild that throws keeps
// the last good page; with nothing to fall back on, error.tsx shows the failed
// state. Either way a failure is never rendered as zeros.
export const revalidate = 60;

export default async function StudentsPage() {
  return <StandingsPage data={await getStandingsData()} />;
}
