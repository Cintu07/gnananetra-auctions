"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-5 space-y-4">
      <div>
        <label htmlFor="pw" className="label">Password</label>
        <input id="pw" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13.5px] text-danger">{state.error}</p>}
      <button disabled={pending} className="btn-dark w-full">{pending ? "Checking" : "Sign in"}</button>
    </form>
  );
}
