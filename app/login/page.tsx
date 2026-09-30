import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SchoolLogo } from "@/components/marks";
import { getVolunteer } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Volunteer login · Can Drive",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getVolunteer()) redirect("/volunteer");

  return (
    <main id="main" className="mx-auto flex min-h-svh w-full max-w-[440px] flex-col justify-center px-5 py-10">
      {/* Same lockup as the site header. */}
      <Link href="/" className="mb-10 flex items-center gap-3 self-start no-underline">
        <SchoolLogo className="size-[38px]" />
        <span className="flex flex-col leading-none">
          <span className="text-[9.5px] font-semibold tracking-[.14em] text-muted">ASSUMPTION</span>
          <span className="font-display text-2xl font-black tracking-[.01em] text-ink">CAN DRIVE</span>
        </span>
      </Link>
      <h1 className="mb-2 font-display text-5xl leading-[.9] font-black uppercase">Volunteer login</h1>
      <p className="mb-7 text-[15px] text-body">For desk volunteers. Ask the organizer if you need a login.</p>
      <LoginForm />
    </main>
  );
}
