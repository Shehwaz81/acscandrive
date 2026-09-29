import type { Metadata } from "next";
import { VolunteerShell } from "@/components/volunteer/volunteer-shell";
import { requireVolunteer } from "@/lib/volunteer/guard";

export const metadata: Metadata = {
  title: "Volunteer desk · Can Drive",
  robots: { index: false, follow: false },
};

export default async function VolunteerLayout({ children }: LayoutProps<"/volunteer">) {
  await requireVolunteer();
  return <VolunteerShell>{children}</VolunteerShell>;
}
