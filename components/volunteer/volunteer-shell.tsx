"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/home/site-header";
import { RepositoryProvider } from "@/lib/volunteer/provider";
import { PrototypeControls } from "./prototype-controls";
import { useHotkeys } from "./use-hotkeys";
import { WorkspaceTabs } from "./workspace-tabs";

// TODO(auth): replace with a real sign-out action once login exists.
const SIGN_OUT_HREF = "/";

function Shortcuts() {
  const router = useRouter();
  useHotkeys({
    d: () => router.push("/volunteer"),
    l: () => router.push("/volunteer/log"),
  });
  return null;
}

export function VolunteerShell({ children }: { children: ReactNode }) {
  return (
    <RepositoryProvider>
      <Shortcuts />
      <SiteHeader
        linkBase="/"
        homeHref="/"
        navFrom="md"
        aside={
          <p className="flex items-center gap-3 border-l border-rule py-3 pl-6 text-[13px] text-muted">
            <span className="font-bold text-ink">Volunteer desk</span>
            <span aria-hidden>·</span>
            <a href={SIGN_OUT_HREF}>Sign out</a>
          </p>
        }
        menuAside={
          <a href={SIGN_OUT_HREF} className="pt-4 pb-1 text-sm text-rule">
            Volunteer desk · Sign out
          </a>
        }
      />
      <WorkspaceTabs />
      <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-7 md:py-7 lg:px-8 lg:py-8">
        {children}
      </main>
      <PrototypeControls />
    </RepositoryProvider>
  );
}
