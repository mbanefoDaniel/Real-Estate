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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Saved Searches</h1>
          <p className="mt-1 text-sm text-muted">Manage your filters and alert preferences.</p>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-black/[0.03]"
        >
          <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Browse Listings
        </Link>
      </header>

      {/* Status Banner */}
      {status.message ? (
        <div className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
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
      ) : null}

      {/* Auth Wall */}
      {!authReady ? null : !signedIn ? (
        <section className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-black/[0.06]">
          <div className="rounded-full bg-accent/10 p-4">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold">Sign in to view saved searches</h2>
          <p className="mt-1 text-sm text-muted">You need an account to save and manage search filters.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/sign-in" className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">Sign In</Link>
            <Link href="/auth/sign-up" className="rounded-lg border border-black/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03]">Create Account</Link>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted">
              <svg className="h-6 w-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Loading saved searches...
            </div>
          ) : null}

          {/* Empty State */}
          {!loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-black/[0.06]">
              <div className="rounded-full bg-black/5 p-4">
                <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold">No saved searches yet</h2>
              <p className="mt-1 text-sm text-muted">Use the &quot;Save This Search&quot; button on the listings page to get started.</p>
              <Link href="/properties" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
                Browse Listings
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          ) : null}

          {/* Saved Search Cards */}
          {!loading && items.length > 0 ? (
            <div className="grid gap-4">
              {items.map((item) => (
                <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="truncate text-lg font-bold">{item.label}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.alertEnabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-black/[0.05] text-muted"
                        }`}>
                          {item.alertEnabled ? "Alerts On" : "Paused"}
                        </span>
                      </div>

                      {/* Filter Tags */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.location ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">
                            <svg className="h-3 w-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                            {item.location}
                          </span>
                        ) : null}
                        {item.category ? (
                          <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">{item.category}</span>
                        ) : null}
                        {item.listingTerm ? (
                          <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">{item.listingTerm === "LEASE" ? "For Lease" : "For Sale"}</span>
                        ) : null}
                        {item.beds ? (
                          <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">{item.beds}+ beds</span>
                        ) : null}
                        {item.plotSize ? (
                          <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">{item.plotSize}+ sqft</span>
                        ) : null}
                        {(item.minPrice || item.maxPrice) ? (
                          <span className="rounded-lg bg-black/[0.04] px-2.5 py-1 text-xs font-medium">
                            ₦{(item.minPrice ?? 0).toLocaleString()} – {item.maxPrice ? `₦${item.maxPrice.toLocaleString()}` : "Any"}
                          </span>
                        ) : null}
                      </div>

                      {/* Meta */}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span>Created {new Date(item.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}</span>
                        <span>Last alert: {item.lastAlertSentAt ? new Date(item.lastAlertSentAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }) : "Never"}</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        id={`frequency-${item.id}`}
                        value={item.alertFrequency}
                        onChange={(event) => updateFrequency(item, event.target.value as SavedSearch["alertFrequency"])}
                        className="rounded-lg border border-black/10 bg-surface px-3 py-2 text-xs font-medium transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                      >
                        <option value="INSTANT">Instant</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleAlert(item, !item.alertEnabled)}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                          item.alertEnabled
                            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {item.alertEnabled ? "Pause" : "Resume"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSavedSearch(item.id)}
                        className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete saved search"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </main>
  );
}
