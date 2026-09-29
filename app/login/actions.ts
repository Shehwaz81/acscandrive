"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type LoginState = { error: string; username: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password.", username };

  const { data: ok, error } = await createAdminClient().rpc("verify_admin", {
    p_username: username,
    p_password: password,
  });
  if (error) return { error: "Couldn't check your login. Try again.", username };
  // Same message for an unknown username and a wrong password, so the form
  // doesn't reveal which usernames exist.
  if (!ok) return { error: "Wrong username or password.", username };

  await startSession(username);
  redirect("/volunteer");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}
