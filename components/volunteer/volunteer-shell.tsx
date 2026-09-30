"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";
import { SiteHeader } from "@/components/home/site-header";
import { WRAP } from "@/lib/site";
import { RepositoryProvider } from "@/lib/volunteer/provider";
import { PrototypeControls } from "./prototype-controls";
import { useHotkeys } from "./use-hotkeys";
import { WorkspaceTabs } from "./workspace-tabs";

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
          <div className="flex items-center gap-3 border-l border-rule py-3 pl-4 text-[13px] text-muted lg:pl-6">
            <span className="hidden font-bold text-ink lg:inline">Volunteer desk</span>
            <span aria-hidden className="hidden lg:inline">
              ·
            </span>
            <form action={logout}>
              <button type="submit" className="cursor-pointer underline decoration-2 underline-offset-[3px] hover:text-tomato">
                Sign out
              </button>
            </form>
          </div>
        }
        menuAside={
          <form action={logout} className="pt-4 pb-1 text-sm text-rule">
            Volunteer desk ·{" "}
            <button type="submit" className="cursor-pointer underline decoration-2 underline-offset-[3px] hover:text-tomato">
              Sign out
            </button>
          </form>
        }
      />
      <WorkspaceTabs />
      <main id="main" className={`${WRAP} py-5 md:py-7 lg:py-8`}>
        {children}
      </main>
      <PrototypeControls />
    </RepositoryProvider>
  );
}
