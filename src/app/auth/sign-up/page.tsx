"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function SignUpPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Creating account..." });

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      if (!email || !password) {
        setStatus({ type: "error", message: "Email and password are required." });
        return;
      }

      if (password.length < 8) {
        setStatus({ type: "error", message: "Password must be at least 8 characters." });
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          email,
          password,
          captchaToken,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({ error: "Unable to create account." }));

      if (!response.ok) {
        setStatus({ type: "error", message: result?.error || "Unable to create account." });
        return;
      }

      setStatus({ type: "success", message: "Account created. Redirecting..." });
      const token = result?.token;
      if (token) {
        saveAuthToken(token);
        window.location.href = `/api/auth/establish?token=${encodeURIComponent(token)}&next=${encodeURIComponent("/sell")}`;
      } else {
        router.push("/sell");
        router.refresh();
      }
    } catch {
      setStatus({ type: "error", message: "Network error while creating account." });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8 sm:px-6 md:py-12">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Sign up to post and manage your property listings.</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit} noValidate>
          <input
            name="name"
            placeholder="Full name (optional)"
            className="rounded-xl border border-black/10 bg-white px-4 py-3"
          />
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
              placeholder="Password (8+ characters)"
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
            {status.type === "loading" ? "Creating..." : "Sign up"}
          </button>

          <TurnstileCaptcha onTokenChange={setCaptchaToken} className="mt-2" />
        </form>

        {status.message ? (
          <p className={`mt-4 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}

        <p className="mt-5 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-accent underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
