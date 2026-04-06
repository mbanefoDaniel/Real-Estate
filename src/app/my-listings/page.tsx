"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedListingImage } from "@/lib/image-url";
import { useAuth } from "@/components/auth-provider";
import { authFetch } from "@/lib/auth-fetch";

type ListingItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  ownerEmail: string;
  kind?: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm?: "SALE" | "LEASE";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  imageUrl?: string | null;
  images?: { id: string; imageUrl: string; sortOrder: number }[];
  featured: boolean;
};

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

type PromotionPlan = "STANDARD" | "PLUS" | "PREMIUM";

type OwnerAnalytics = {
  totals: {
    listings: number;
    featuredListings: number;
    approvedListings: number;
    leads: number;
    newLeads: number;
    contactedLeads: number;
    closedLeads: number;
  };
  byProperty: Array<{
    propertyId: string;
    title: string;
    leadCount: number;
    newLeads: number;
    contactedLeads: number;
    closedLeads: number;
  }>;
};

const defaultStatus: Status = {
  type: "idle",
  message: "",
};

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function MyListingsPage() {
  const authUser = useAuth();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [loading, setLoading] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [complianceBlocked, setComplianceBlocked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PromotionPlan>("STANDARD");
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);

  const selected = useMemo(
    () => listings.find((item) => item.id === selectedId) ?? null,
    [listings, selectedId]
  );

  async function loadListings(emailOverride?: string) {
    const value = (emailOverride ?? ownerEmail).trim().toLowerCase();
    if (!value) {
      setStatus({ type: "error", message: "Sign in to load your listings." });
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`/api/properties?includeAll=true&ownerEmail=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to load listings.");
      }

      setListings(data);
      setSelectedId(data[0]?.id ?? null);
      setStatus(defaultStatus);
      setComplianceBlocked(false);
      await loadAnalytics();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load listings.";
      if (errorMessage.toLowerCase().includes("compliance")) {
        setComplianceBlocked(true);
      }
      setStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    const response = await authFetch("/api/owner/analytics", { cache: "no-store", credentials: "include" });
    const data = await response.json();
    if (response.ok) {
      setAnalytics(data as OwnerAnalytics);
    }
  }

  useEffect(() => {
    async function bootstrapAuth() {
      /* Always verify via /api/auth/me so stale Router Cache
         context cannot trick us into thinking we're signed in. */
      let email = "";

      try {
        const response = await authFetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const data = await response.json();
        email = data?.user?.email ?? "";
      } catch {
        // fall through
      }

      if (email) {
        setOwnerEmail(email);
        setStatus(defaultStatus);
        await loadListings(email);
      } else {
        setStatus({ type: "error", message: "Sign in to access Manage Listings." });
      }

      setAuthChecked(true);

      // After auth is established, verify any pending payment from Paystack redirect
      if (email) {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("ref")?.trim();
        const paymentHint = params.get("featuredPayment");

        if (ref && paymentHint) {
          await verifyFeaturedPayment(ref, email);
        }
      }
    }

    async function verifyFeaturedPayment(reference: string, email: string) {
      setStatus({ type: "loading", message: "Verifying payment status..." });

      try {
        const response = await authFetch("/api/payments/featured/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (!response.ok) {
          setStatus({
            type: "error",
            message: result?.error || "Unable to verify payment status.",
          });
          return;
        }

        const resolvedStatus = String(result?.status || "PENDING").toUpperCase();
        if (resolvedStatus === "PAID") {
          setStatus({ type: "success", message: "Payment confirmed. Listing promotion is active." });
        } else if (resolvedStatus === "FAILED") {
          setStatus({ type: "error", message: "Payment failed. Please retry your promotion." });
        } else if (resolvedStatus === "CANCELLED") {
          setStatus({ type: "error", message: "Payment was cancelled. You can retry any time." });
        } else {
          setStatus({ type: "loading", message: "Payment is still pending confirmation." });
        }

        await loadListings(email);
      } catch {
        setStatus({ type: "error", message: "Unable to verify payment status." });
      }
    }

    bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await authFetch("/api/auth/signout", { method: "POST" });
    setOwnerEmail("");
    setListings([]);
    setAnalytics(null);
    setSelectedId(null);
    setStatus({ type: "error", message: "Sign in to access Manage Listings." });
    window.location.assign("/auth/sign-in");
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this listing? It will be removed from all public pages immediately.\n\nOnly an admin can restore a deleted listing."
    );
    if (!confirmed) {
      return;
    }

    setStatus({ type: "loading", message: "Deleting listing..." });

    const response = await authFetch(`/api/properties/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({
        type: "error",
        message: data?.error || "Delete failed.",
      });
      return;
    }

    const nextListings = listings.filter((item) => item.id !== id);
    setListings(nextListings);
    setSelectedId(nextListings[0]?.id ?? null);
    setStatus({ type: "success", message: "Listing deleted. Contact an admin if you need it restored." });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    setStatus({ type: "loading", message: "Saving changes..." });

    const formData = new FormData(event.currentTarget);

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      city: formData.get("city"),
      address: formData.get("address"),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      kind: formData.get("kind"),
      listingTerm: formData.get("listingTerm"),
      status: formData.get("status"),
      price: Number(formData.get("price")),
      bedrooms: Number(formData.get("bedrooms")),
      bathrooms: Number(formData.get("bathrooms")),
      areaSqft: Number(formData.get("areaSqft")),
      imageUrl: formData.get("imageUrl"),
      galleryUrls: String(formData.get("galleryUrls") || "")
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      featured: formData.get("featured") === "on",
    };

    const response = await authFetch(`/api/properties/${selected.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({
        type: "error",
        message: data?.error || "Update failed.",
      });
      return;
    }

    setListings((prev) => prev.map((item) => (item.id === data.id ? data : item)));
    setStatus({ type: "success", message: "Listing updated successfully." });
  }

  async function handlePromoteListing(id: string, plan: PromotionPlan) {
    setStatus({ type: "loading", message: `Starting ${plan.toLowerCase()} promotion payment...` });

    const response = await authFetch("/api/payments/featured/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ propertyId: id, plan }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus({
        type: "error",
        message: result?.error || "Unable to initiate payment.",
      });
      return;
    }

    if (result?.checkoutUrl) {
      window.location.href = String(result.checkoutUrl);
      return;
    }

    setStatus({ type: "error", message: "Missing payment checkout URL." });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      {/* ── Header ── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Listings</h1>
          <p className="mt-1 text-sm text-muted">Manage, edit, and promote your property listings.</p>
        </div>
        <div className="flex items-center gap-2">
          {ownerEmail ? (
            <>
              <button
                onClick={() => loadListings()}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-black/[0.03]"
              >
                <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-black/[0.03]"
              >
                Sign Out
              </button>
            </>
          ) : authChecked ? (
            <Link
              href="/auth/sign-in"
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"
            >
              Sign In
            </Link>
          ) : null}
          <Link
            href="/sell"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add New
          </Link>
        </div>
      </header>

      {/* ── Status Banner ── */}
      {status.message ? (
        <div className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
          status.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : status.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }`}>
          {status.type === "error" && (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {status.type === "success" && (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {status.type === "loading" && (
            <svg className="h-4 w-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          )}
          {status.message}
        </div>
      ) : null}

      {/* ── Analytics Cards ── */}
      {ownerEmail && analytics ? (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Listings</p>
            <p className="mt-2 text-3xl font-bold">{analytics.totals.listings}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Featured</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{analytics.totals.featuredListings}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Total Leads</p>
            <p className="mt-2 text-3xl font-bold text-accent">{analytics.totals.leads}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Lead Pipeline</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold">
              <span className="text-blue-600">{analytics.totals.newLeads} new</span>
              <span className="text-amber-600">{analytics.totals.contactedLeads} contacted</span>
              <span className="text-emerald-600">{analytics.totals.closedLeads} closed</span>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Auth Wall ── */}
      {!ownerEmail && authChecked ? (
        <section className="mt-8 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-black/5">
          <div className="rounded-full bg-accent/10 p-4">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold">Sign in to manage your listings</h2>
          <p className="mt-1 text-sm text-muted">You need an account to view and edit your properties.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/auth/sign-in" className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">Sign In</Link>
            <Link href="/auth/sign-up" className="rounded-lg border border-black/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-black/[0.03]">Create Account</Link>
          </div>
        </section>
      ) : null}

      {/* ── Compliance Wall ── */}
      {ownerEmail && complianceBlocked ? (
        <section className="mt-8 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-black/5">
          <div className="rounded-full bg-amber-100 p-4">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold">Compliance Required</h2>
          <p className="mt-1 text-sm text-muted">Profile picture and verified KYC are compulsory after 2 days from registration.</p>
          <Link href="/dashboard" className="mt-6 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
            Complete on Dashboard
          </Link>
        </section>
      ) : null}

      {/* ── Listings Grid ── */}
      {ownerEmail && !complianceBlocked ? (
        <section className="mt-6 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="flex flex-col gap-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 lg:max-h-[calc(100vh-12rem)]">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                {listings.length} {listings.length === 1 ? "Listing" : "Listings"}
              </h2>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Loading...
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="rounded-full bg-black/5 p-3">
                  <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
                </div>
                <p className="text-sm text-muted">No listings yet.</p>
                <Link href="/sell" className="text-sm font-semibold text-accent hover:underline">Post your first property</Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {listings.map((item) => {
                  const isActive = selectedId === item.id;
                  const statusColor =
                    item.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                    item.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`group flex items-start gap-3 rounded-xl p-3 text-left transition ${
                        isActive
                          ? "bg-accent/[0.08] ring-1 ring-accent/30"
                          : "hover:bg-black/[0.03]"
                      }`}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/5">
                        {item.imageUrl ? (
                          <Image
                            src={getOptimizedListingImage(item.imageUrl, 120)}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted">N/A</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">{item.city} • {item.kind ?? "House"}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
                            {item.status ?? "Pending"}
                          </span>
                          {item.featured && (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-amber-200">
                              ★ Featured
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-bold text-accent">{ngn(item.price)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Detail / Edit Panel */}
          <section className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="rounded-full bg-black/5 p-4">
                  <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /></svg>
                </div>
                <p className="mt-3 text-sm text-muted">Select a listing from the sidebar to view and edit it.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdate}>
                {/* Cover Image */}
                <div className="relative h-56 w-full overflow-hidden rounded-t-2xl sm:h-64 lg:h-72">
                  <Image
                    src={getOptimizedListingImage(selected.imageUrl, 1200)}
                    alt={selected.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        selected.status === "APPROVED" ? "bg-emerald-500 text-white" :
                        selected.status === "REJECTED" ? "bg-red-500 text-white" :
                        "bg-amber-400 text-amber-900"
                      }`}>
                        {selected.status ?? "Pending"}
                      </span>
                      {selected.featured && (
                        <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">★ Featured</span>
                      )}
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-black/80">{selected.kind ?? "House"} • {selected.listingTerm === "LEASE" ? "Lease" : "Sale"}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-white drop-shadow-lg sm:text-xl">{ngn(selected.price)}</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-5 p-5 sm:p-6">
                  {/* Title & Description */}
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Title</label>
                      <input name="title" defaultValue={selected.title} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Description</label>
                      <textarea name="description" defaultValue={selected.description} rows={3} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">City</label>
                      <input name="city" defaultValue={selected.city} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Address</label>
                      <input name="address" defaultValue={selected.address} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Type</label>
                      <select name="kind" defaultValue={selected.kind ?? "HOUSE"} className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none">
                        <option value="HOUSE">House</option>
                        <option value="APARTMENT">Apartment</option>
                        <option value="LAND">Land</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Listing Term</label>
                      <select name="listingTerm" defaultValue={selected.listingTerm ?? "SALE"} className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none">
                        <option value="SALE">For Sale</option>
                        <option value="LEASE">For Lease</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Status</label>
                      <select name="status" defaultValue={selected.status ?? "PENDING"} disabled className="w-full rounded-lg border border-black/10 bg-black/[0.03] px-4 py-2.5 text-sm text-muted">
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Price (₦)</label>
                      <input name="price" type="number" min={1} defaultValue={selected.price} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Beds</label>
                      <input name="bedrooms" type="number" min={0} defaultValue={selected.bedrooms} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Baths</label>
                      <input name="bathrooms" type="number" min={0} step="0.5" defaultValue={selected.bathrooms} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Area (sqft)</label>
                      <input name="areaSqft" type="number" min={1} defaultValue={selected.areaSqft} required className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                  </div>

                  {/* Images */}
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Cover Image URL</label>
                      <input name="imageUrl" defaultValue={selected.imageUrl ?? ""} placeholder="https://..." className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Gallery URLs (one per line)</label>
                      <textarea
                        name="galleryUrls"
                        rows={3}
                        defaultValue={(selected.images ?? []).map((image) => image.imageUrl).join("\n")}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-sm transition focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-sm">
                    <input name="featured" type="checkbox" defaultChecked={selected.featured} className="h-4 w-4 rounded border-black/20 text-accent focus:ring-accent" />
                    <span className="font-medium">Mark as featured</span>
                  </label>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 border-t border-black/5 pt-5 sm:flex-row sm:items-center">
                    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Save Changes
                    </button>

                    <div className="flex items-center gap-2 sm:ml-auto">
                      <select
                        value={selectedPlan}
                        onChange={(event) => setSelectedPlan(event.target.value as PromotionPlan)}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 focus:ring-1 focus:ring-amber-300 focus:outline-none"
                      >
                        <option value="STANDARD">Standard Boost</option>
                        <option value="PLUS">Plus Boost</option>
                        <option value="PREMIUM">Premium Spotlight</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handlePromoteListing(selected.id, selectedPlan)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Promote
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(selected.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete Listing
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        </section>
      ) : null}
    </main>
  );
}
