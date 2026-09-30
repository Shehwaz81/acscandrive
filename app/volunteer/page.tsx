import { Suspense } from "react";
import { DashboardView } from "@/components/volunteer/dashboard-view";

export const metadata = { title: "Dashboard · Volunteer desk · Can Drive" };

export default function VolunteerDashboardPage() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
