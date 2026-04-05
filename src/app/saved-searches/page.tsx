"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/lib/auth-fetch";

type SavedSearch = {
  id: string;
  label: string;
  location: string | null;
  category: "LAND" | "HOUSE" | "APARTMENT" | null;
  listingTerm: "SALE" | "LEASE" | null;
  beds: number | null;
  plotSize: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  alertEnabled: boolean;
  alertFrequency: "INSTANT" | "DAILY" | "WEEKLY";
  lastAlertSentAt: string | null;
  createdAt: string;
};

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function SavedSearchesPage() {
  const authUser = useAuth();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(Boolean(authUser));

  async function loadSavedSearches() {
    setLoading(true);
    const response = await authFetch("/api/saved-searches", { cache: "no-store", credentials: "include" });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setStatus({ type: "error", message: data?.error || "Unable to load saved searches." });
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      /* Always verify the real session via /api/auth/me.
         Don't trust authUser from React context — it may be stale
         due to Next.js Router Cache preserving a previous layout. */
      let verifiedEmail = "";

      try {
        const res = await authFetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        verifiedEmail = data?.user?.email ?? "";
      } catch { /* ignore */ }

      if (cancelled) return;

      const hasUser = Boolean(verifiedEmail);
      setSignedIn(hasUser);

      if (hasUser) {
        await loadSavedSearches();
      } else {
        setLoading(false);
      }

      setAuthReady(true);
    }

    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  async function toggleAlert(item: SavedSearch, alertEnabled: boolean) {
    const response = await authFetch(`/api/saved-searches/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to update alert setting." });
      return;
    }

    setItems((prev) => prev.map((entry) => (entry.id === item.id ? data : entry)));
  }

  async function updateFrequency(item: SavedSearch, alertFrequency: SavedSearch["alertFrequency"]) {
    const response = await authFetch(`/api/saved-searches/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertFrequency }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to update frequency." });
      return;
    }

    setItems((prev) => prev.map((entry) => (entry.id === item.id ? data : entry)));
  }

  async function deleteSavedSearch(id: string) {
    const confirmed = window.confirm("Delete this saved search?");
    if (!confirmed) {
      return;
    }

    const response = await authFetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to delete saved search." });
      return;
    }

    setItems((prev) => prev.filter((entry) => entry.id !== id));
    setStatus({ type: "success", message: "Saved search removed." });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Saved Searches</h1>
            <p className="mt-2 text-sm text-muted">
              Manage saved filters and alert delivery frequency in one place.
            </p>
          </div>
          <Link
            href="/properties"
            className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
          >
            Browse Listings
          </Link>
        </div>

        {status.message ? (
          <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}
      </section>

      {!authReady ? null : !signedIn ? (
        <section className="mt-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-semibold">Sign In Required</h2>
          <p className="mt-2 text-sm text-muted">Sign in to view and manage your saved searches.</p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/auth/sign-in"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              Create Account
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-6 grid gap-3">
          {loading ? <p className="text-sm text-muted">Loading saved searches...</p> : null}

          {!loading && items.length === 0 ? (
            <p className="rounded-xl bg-surface p-5 text-sm text-muted shadow-sm ring-1 ring-black/5">
              No saved searches yet. Use the &quot;Save This Search&quot; button on the listings page.
            </p>
          ) : null}

          {!loading
            ? items.map((item) => (
                <article key={item.id} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{item.label}</h3>
                      <p className="mt-1 text-xs text-muted">
                        Created {new Date(item.createdAt).toLocaleString("en-NG")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Last alert: {item.lastAlertSentAt ? new Date(item.lastAlertSentAt).toLocaleString("en-NG") : "Not sent yet"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAlert(item, !item.alertEnabled)}
                        className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
                      >
                        {item.alertEnabled ? "Pause Alerts" : "Resume Alerts"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedSearch(item.id)}
                        className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2 lg:grid-cols-3">
                    <p>Location: {item.location ?? "Any"}</p>
                    <p>Category: {item.category ?? "Any"}</p>
                    <p>Term: {item.listingTerm ?? "Any"}</p>
                    <p>Beds: {item.beds ?? "Any"}</p>
                    <p>Plot Size: {item.plotSize ?? "Any"}</p>
                    <p>
                      Price: {item.minPrice ?? 0} - {item.maxPrice ?? "Any"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="text-xs font-semibold text-muted" htmlFor={`frequency-${item.id}`}>
                      Alert Frequency
                    </label>
                    <select
                      id={`frequency-${item.id}`}
                      value={item.alertFrequency}
                      onChange={(event) => updateFrequency(item, event.target.value as SavedSearch["alertFrequency"])}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
                    >
                      <option value="INSTANT">Instant</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                </article>
              ))
            : null}
        </section>
      )}
    </main>
  );
}
