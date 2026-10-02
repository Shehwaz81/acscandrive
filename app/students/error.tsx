"use client";

import { useEffect } from "react";
import { StandingsPage } from "@/components/standings/standings-page";

/** The standings couldn't be loaded and there is no earlier page to serve: the failed state, with search still usable. */
export default function StudentsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <StandingsPage data={null} onRetry={retry} />;
}
