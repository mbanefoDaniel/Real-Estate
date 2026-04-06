"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { saveAuthToken } from "@/lib/auth-fetch";

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [resendStatus, setResendStatus] = useState<Status>({ type: "idle", message: "" });
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = text[i] ?? "";
    }
    setDigits(next);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setStatus({ type: "error", message: "Enter all 6 digits." });
      return;
    }

    setStatus({ type: "loading", message: "Verifying..." });

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, code }),
      });

      const data = await res.json().catch(() => ({ error: "Verification failed." }));

      if (!res.ok) {
        setStatus({ type: "error", message: data?.error || "Verification failed." });
        return;
      }

      setStatus({ type: "success", message: "Email verified! Redirecting..." });

      const token = data?.token;
      if (token) {
        saveAuthToken(token);
        window.location.href = `/api/auth/establish?token=${encodeURIComponent(token)}&next=${encodeURIComponent("/sell")}`;
      } else {
        window.location.href = "/sell";
      }
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResendStatus({ type: "loading", message: "Sending..." });

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam, purpose: "email-verify" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setResendStatus({ type: "error", message: data?.error || "Unable to resend code." });
        return;
      }

      setResendStatus({ type: "success", message: "New code sent!" });
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setResendStatus({ type: "error", message: "Network error." });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-8 sm:px-6 md:py-12">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        {/* mail icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <svg className="h-7 w-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Verify your email
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-black">{emailParam || "your email"}</span>.
          <br />
          Enter it below to activate your account.
        </p>

        <form onSubmit={handleVerify} className="mt-6">
          {/* 6-digit input boxes */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className="h-12 w-10 rounded-xl border border-black/10 bg-white text-center text-lg font-bold shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:h-14 sm:w-12 sm:text-xl"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={status.type === "loading"}
            className="mt-5 w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {status.type === "loading" ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        {status.message && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            status.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}>
            {status.type === "error" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {status.message}
          </div>
        )}

        {/* Resend */}
        <div className="mt-5 text-center">
          <p className="text-sm text-muted">
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resendStatus.type === "loading"}
              className="font-semibold text-accent underline transition hover:text-accent-strong disabled:opacity-50 disabled:no-underline"
            >
              {resendStatus.type === "loading"
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </button>
          </p>
          {resendStatus.message && resendStatus.type !== "loading" && (
            <p className={`mt-1 text-xs font-medium ${resendStatus.type === "error" ? "text-rose-600" : "text-accent"}`}>
              {resendStatus.message}
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Wrong email?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-accent underline">
            Sign up again
          </Link>
        </p>
      </section>
    </main>
  );
}
