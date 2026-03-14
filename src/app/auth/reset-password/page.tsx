"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialStatus: Status = {
  type: "idle",
  message: "",
};

export default function ResetPasswordPage() {
  const [token] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  });
  const [status, setStatus] = useState<Status>(initialStatus);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Resetting password..." });

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: result?.error || "Unable to reset password." });
      return;
    }

    setStatus({ type: "success", message: "Password reset successfully. You can sign in now." });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8 sm:px-6 md:py-12">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Reset password</h1>
        <p className="mt-2 text-sm text-muted">Set a new password for your account.</p>

        {!token ? (
          <p className="mt-4 text-sm text-red-600">Missing reset token. Open this page from a valid reset link.</p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="New password (8+ characters)"
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

          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="Confirm new password"
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition hover:bg-black/5 hover:text-black"
            >
              {showConfirmPassword ? (
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
            disabled={status.type === "loading" || !token}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {status.type === "loading" ? "Resetting..." : "Reset password"}
          </button>
        </form>

        {status.message ? (
          <p className={`mt-4 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}

        <p className="mt-5 text-sm text-muted">
          Back to{" "}
          <Link href="/auth/sign-in" className="font-semibold text-accent underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
