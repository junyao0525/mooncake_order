"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border-2 border-line bg-cream-soft p-8 shadow-[0_20px_60px_-25px_rgba(90,51,22,0.5)]">
        <div className="text-center">
          <div className="text-4xl">🥮</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-red">
            Angel Bakery
            <span className="ml-2 text-xl text-brown-deep">天使牌</span>
          </h1>
          <p className="mt-1 text-sm text-brown/70">Admin Dashboard Login</p>
        </div>

        <form action={formAction} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brown">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm text-brown-deep outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="admin@angelbakery.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brown">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm text-brown-deep outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
            />
          </label>

          {state.error && (
            <p className="text-sm font-medium text-red">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-red px-6 py-3 text-base font-bold text-cream-soft shadow-lg shadow-red/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
      <a
        href="/"
        className="mt-4 text-center text-sm text-brown underline-offset-4 hover:underline"
      >
        ← Back to order form
      </a>
    </main>
  );
}
