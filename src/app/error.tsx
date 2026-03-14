"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center md:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Something broke</p>
      <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Unexpected error</h1>
      <p className="mt-4 max-w-xl text-muted">
        We could not complete this request right now. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        Try Again
      </button>
    </main>
  );
}
