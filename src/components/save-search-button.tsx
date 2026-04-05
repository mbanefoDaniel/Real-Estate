"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type SaveSearchFilters = {
  location?: string;
  category?: string;
  type?: string;
  beds?: string;
  plotSize?: string;
  minPrice?: string;
  maxPrice?: string;
};

export default function SaveSearchButton({ filters }: { filters: SaveSearchFilters }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => clearTimeout(timeoutId);
  }, [toast]);

  async function handleSave() {
    try {
      setStatus("saving");
      setMessage("");

      const response = await authFetch("/api/saved-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filters),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorText = result?.error || "Unable to save search.";
        setStatus("error");
        setMessage(errorText);
        setToast({ kind: "error", text: errorText });
        return;
      }

      const successText = "Search saved. You will get alert emails for new matches.";
      setStatus("saved");
      setMessage(successText);
      setToast({ kind: "success", text: successText });
    } catch {
      const errorText = "Unable to save search right now. Please try again.";
      setStatus("error");
      setMessage(errorText);
      setToast({ kind: "error", text: errorText });
    }
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-60"
        >
          {status === "saving" ? "Saving..." : "Save This Search"}
        </button>
        {message ? (
          <p className={`text-xs ${status === "error" ? "text-red-600" : "text-accent"}`}>{message}</p>
        ) : null}
      </div>

      {toast ? (
        <div aria-live="polite" className="fixed bottom-5 right-5 z-50 max-w-sm">
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              toast.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}
    </>
  );
}
