import { Suspense } from "react";
import { LogFlowView } from "@/components/volunteer/log-flow-view";

export const metadata = { title: "Log a donation · Volunteer desk" };

export default function LogDonationPage() {
  return (
    <Suspense>
      <LogFlowView />
    </Suspense>
  );
}
