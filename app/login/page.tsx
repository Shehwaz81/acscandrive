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
    <main id="main" className="mx-auto flex min-h-svh w-full max-w-[440px] flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3 font-bold no-underline">
        <SchoolLogo className="size-10" />
        Can Drive
      </Link>
      <h1 className="mb-6 font-display text-5xl font-extrabold uppercase leading-none">Volunteer login</h1>
      <LoginForm />
    </main>
  );
}
