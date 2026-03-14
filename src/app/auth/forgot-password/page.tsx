"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import TurnstileCaptcha from "@/components/turnstile-captcha";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

const initialStatus: Status = {
  type: "idle",
  message: "",
};

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Sending reset request..." });
    setDebugResetUrl(null);

    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email"),
        captchaToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: result?.error || "Unable to send reset request." });
      return;
    }

    if (result?.resetUrl) {
      setDebugResetUrl(result.resetUrl);
    }

    setStatus({
      type: "success",
      message: "If an account exists for this email, a reset link has been generated.",
    });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8 sm:px-6 md:py-12">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">Enter your email to request a reset link.</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-xl border border-black/10 bg-white px-4 py-3"
          />
          <button
            type="submit"
            disabled={status.type === "loading"}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {status.type === "loading" ? "Sending..." : "Request reset"}
          </button>

          <TurnstileCaptcha onTokenChange={setCaptchaToken} className="mt-2" />
        </form>

        {status.message ? (
          <p className={`mt-4 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}

        {debugResetUrl ? (
          <p className="mt-3 text-sm text-muted">
            Dev reset link: <Link href={debugResetUrl} className="font-semibold text-accent underline">Open reset page</Link>
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
