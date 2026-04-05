"use client";

import { FormEvent, useState, useLayoutEffect } from "react";
import Link from "next/link";
import TurnstileCaptcha from "@/components/turnstile-captcha";
import { saveAuthToken } from "@/lib/auth-fetch";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialStatus: Status = {
  type: "idle",
  message: "",
};

export default function SignInPage() {
  const isClient = typeof window !== "undefined";
  const initialNextPath = isClient ? new URLSearchParams(window.location.search).get("next") ?? "" : "";
  const [nextPath] = useState(initialNextPath);
  const [adminRedirectRequested] = useState(initialNextPath.startsWith("/admin"));
  // ...existing code...
  const [status, setStatus] = useState<Status>(initialStatus);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  // Removed useLayoutEffect and setState calls in effect to fix ESLint error

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Signing in..." });

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      if (!email || !password) {
        setStatus({ type: "error", message: "Email and password are required." });
        return;
      }

      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          captchaToken,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({ error: "Unable to sign in." }));

      if (!response.ok) {
        setStatus({ type: "error", message: result?.error || "Unable to sign in." });
        return;
      }

      setStatus({ type: "success", message: "Signed in. Redirecting..." });
      const role = result?.role;
      const token = result?.token;
      let destination = "/my-listings";

      if (role === "ADMIN") {
        destination = "/admin";
      } else if (nextPath && !nextPath.startsWith("/admin")) {
        destination = nextPath;
      }

      // Save token to localStorage as fallback for httpOnly cookie issues
      if (token) {
        saveAuthToken(token);
      }

      // Navigate via /api/auth/establish which sets the cookie via a
      // direct page response (more reliable than fetch Set-Cookie).
      if (token) {
        window.location.href = `/api/auth/establish?token=${encodeURIComponent(token)}&next=${encodeURIComponent(destination)}`;
      } else {
        window.location.assign(destination);
      }
    } catch {
      setStatus({ type: "error", message: "Network error while signing in." });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8 sm:px-6 md:py-12">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Access your listings and lead inbox securely.</p>

        {adminRedirectRequested ? (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            Admin access is required to open that page. Sign in with an admin account.
          </p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-xl border border-black/10 bg-white px-4 py-3"
          />
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:bg-black/5 hover:text-black"
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                  <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a18.3 18.3 0 0 1-2.43 3.56" />
                  <path d="M6.61 6.61A18.23 18.23 0 0 0 2 12s3 7 10 7a9.77 9.77 0 0 0 4.39-1.01" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {status.type === "loading" ? "Signing in..." : "Sign in"}
          </button>

          <TurnstileCaptcha onTokenChange={setCaptchaToken} className="mt-2" />
        </form>

        {status.message ? (
          <p className={`mt-4 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}

        <p className="mt-5 text-sm text-muted">
          New here?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-accent underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-sm text-muted">
          Forgot password?{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-accent underline">
            Reset it
          </Link>
        </p>
      </section>
    </main>
  );
}
