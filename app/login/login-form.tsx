"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/volunteer/field-error";
import { BTN_PRIMARY, SPINNER } from "@/lib/volunteer/ui";
import { login } from "./actions";

const LABEL = "mb-2 block text-[15px] font-bold";
const INPUT = "h-[52px] w-full border-2 border-ink bg-field px-4 text-[18px] text-ink";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="username" className={LABEL}>
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.username}
          className={INPUT}
        />
      </div>
      <div>
        <label htmlFor="password" className={LABEL}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state?.error ? "login-error" : undefined}
          className={INPUT}
        />
        {state?.error && <FieldError id="login-error">{state.error}</FieldError>}
      </div>
      <button type="submit" disabled={pending} className={`${BTN_PRIMARY} min-h-[52px] disabled:opacity-80`}>
        {pending && <span aria-hidden className={SPINNER} />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
