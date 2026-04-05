"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedListingImage } from "@/lib/image-url";
import { useAuth } from "@/components/auth-provider";

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
      const response = await fetch(`/api/properties?includeAll=true&ownerEmail=${encodeURIComponent(value)}`, {
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
    const response = await fetch("/api/owner/analytics", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setAnalytics(data as OwnerAnalytics);
    }
  }

  useEffect(() => {
    async function bootstrapAuth() {
      let email = authUser?.email ?? "";

      if (!email) {
        try {
          const response = await fetch("/api/auth/me", { cache: "no-store" });
          const data = await response.json();
          email = data?.user?.email ?? "";
        } catch {
          // fall through
        }
      }

      if (email) {
        setOwnerEmail(email);
        setStatus(defaultStatus);
        await loadListings(email);
      } else {
        setStatus({ type: "error", message: "Sign in to access Manage Listings." });
      }

      setAuthChecked(true);
    }

    bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim();
    const paymentHint = params.get("featuredPayment");

    if (!ref || !paymentHint) {
      return;
    }

    let active = true;

    async function verifyPayment(reference: string) {
      setStatus({ type: "loading", message: "Verifying payment status..." });

      try {
        const response = await fetch("/api/payments/featured/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();
        if (!active) {
          return;
        }

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

        await loadListings();
      } catch {
        if (!active) {
          return;
        }

        setStatus({ type: "error", message: "Unable to verify payment status." });
      }
    }

    void verifyPayment(ref);

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setOwnerEmail("");
    setListings([]);
    setAnalytics(null);
    setSelectedId(null);
    setStatus({ type: "error", message: "Sign in to access Manage Listings." });
    window.location.assign("/auth/sign-in");
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Archive this listing? You can ask an admin to restore it later.");
    if (!confirmed) {
      return;
    }

    setStatus({ type: "loading", message: "Archiving listing..." });

    const response = await fetch(`/api/properties/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({
        type: "error",
        message: data?.error || "Archive failed.",
      });
      return;
    }

    const nextListings = listings.filter((item) => item.id !== id);
    setListings(nextListings);
    setSelectedId(nextListings[0]?.id ?? null);
    setStatus({ type: "success", message: "Listing archived." });
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

    const response = await fetch(`/api/properties/${selected.id}`, {
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

    const response = await fetch("/api/payments/featured/initiate", {
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
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">My Listings</h1>
            <p className="mt-2 text-sm text-muted">
              Edit or delete properties you have added.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!ownerEmail && authChecked ? (
              <Link
                href="/auth/sign-in"
                className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Sign In
              </Link>
            ) : null}
            {ownerEmail ? (
              <button
                onClick={() => loadListings()}
                className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
                type="button"
              >
                Refresh
              </button>
            ) : null}
            {ownerEmail ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                Sign Out
              </button>
            ) : null}
            <Link
              href="/sell"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Add New
            </Link>
          </div>
        </div>

        {status.message ? (
          <p className={`mt-4 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}
      </section>

      {ownerEmail && analytics ? (
        <section className="mt-6 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Listing Performance Analytics</h2>
            <button
              type="button"
              onClick={() => loadAnalytics()}
              className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
            >
              Refresh Analytics
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Listings</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.totals.listings}</p>
            </div>
            <div className="rounded-xl border border-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Featured</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.totals.featuredListings}</p>
            </div>
            <div className="rounded-xl border border-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Total Leads</p>
              <p className="mt-1 text-2xl font-semibold">{analytics.totals.leads}</p>
            </div>
            <div className="rounded-xl border border-black/10 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Lead Pipeline</p>
              <p className="mt-1 text-sm font-semibold">
                New {analytics.totals.newLeads} • Contacted {analytics.totals.contactedLeads} • Closed {analytics.totals.closedLeads}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {!ownerEmail && authChecked ? (
          <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Sign In Required</h2>
            <p className="mt-2 text-sm text-muted">
              You must be signed in to view and manage your listings.
            </p>
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
        ) : null}

        {ownerEmail && complianceBlocked ? (
          <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2">
            <h2 className="text-lg font-semibold">Compliance Required</h2>
            <p className="mt-2 text-sm text-muted">
              Profile picture and verified KYC are compulsory after 2 days from registration.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Complete Compliance on Dashboard
              </Link>
            </div>
          </section>
        ) : null}

        {ownerEmail && !complianceBlocked ? (
        <aside className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-semibold">Listings</h2>

          {loading ? (
            <p className="mt-4 text-sm text-muted">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No listings found.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {listings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    selectedId === item.id
                      ? "border-accent bg-accent/5"
                      : "border-black/10 hover:bg-black/5"
                  }`}
                >
                  <p className="line-clamp-1 font-semibold">{item.title}</p>
                  <p className="text-sm text-muted">{item.city}</p>
                  <p className="text-xs font-semibold text-accent">{item.status ?? "PENDING"}</p>
                  <p className="text-sm font-semibold">{ngn(item.price)}</p>
                </button>
              ))}
            </div>
          )}
        </aside>
        ) : null}

        {ownerEmail && !complianceBlocked ? (
        <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          {!selected ? (
            <p className="text-sm text-muted">Select a listing to edit it.</p>
          ) : (
            <form className="grid gap-4" onSubmit={handleUpdate}>
              <div className="relative h-52 w-full overflow-hidden rounded-xl sm:h-64">
                <Image
                  src={getOptimizedListingImage(selected.imageUrl, 1000)}
                  alt={selected.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </div>

              <input name="title" defaultValue={selected.title} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />

              <textarea name="description" defaultValue={selected.description} rows={4} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />

              <div className="grid gap-4 sm:grid-cols-2">
                <input name="city" defaultValue={selected.city} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
                <input name="address" defaultValue={selected.address} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <select name="kind" defaultValue={selected.kind ?? "HOUSE"} className="rounded-xl border border-black/10 bg-white px-4 py-3">
                  <option value="HOUSE">House</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="LAND">Land</option>
                </select>

                <select name="listingTerm" defaultValue={selected.listingTerm ?? "SALE"} className="rounded-xl border border-black/10 bg-white px-4 py-3">
                  <option value="SALE">For Sale</option>
                  <option value="LEASE">For Lease</option>
                </select>

                <select name="status" defaultValue={selected.status ?? "PENDING"} className="rounded-xl border border-black/10 bg-white px-4 py-3">
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <input name="price" type="number" min={1} defaultValue={selected.price} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
                <input name="bedrooms" type="number" min={0} defaultValue={selected.bedrooms} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
                <input name="bathrooms" type="number" min={0} step="0.5" defaultValue={selected.bathrooms} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
                <input name="areaSqft" type="number" min={1} defaultValue={selected.areaSqft} required className="rounded-xl border border-black/10 bg-white px-4 py-3" />
              </div>

              <input name="imageUrl" defaultValue={selected.imageUrl ?? ""} placeholder="Cover Image URL" className="rounded-xl border border-black/10 bg-white px-4 py-3" />

              <textarea
                name="galleryUrls"
                rows={3}
                defaultValue={(selected.images ?? []).map((image) => image.imageUrl).join("\n")}
                placeholder="Gallery URLs (one per line)"
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              />

              <label className="flex items-center gap-2 text-sm">
                <input name="featured" type="checkbox" defaultChecked={selected.featured} className="h-4 w-4" />
                Mark as featured
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong">Save Changes</button>
                <select
                  value={selectedPlan}
                  onChange={(event) => setSelectedPlan(event.target.value as PromotionPlan)}
                  className="rounded-full border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-700"
                >
                  <option value="STANDARD">Standard Boost</option>
                  <option value="PLUS">Plus Boost</option>
                  <option value="PREMIUM">Premium Spotlight</option>
                </select>
                <button
                  type="button"
                  onClick={() => handlePromoteListing(selected.id, selectedPlan)}
                  className="rounded-full border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                >
                  Pay to Promote
                </button>
                <button type="button" onClick={() => handleDelete(selected.id)} className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">Archive Listing</button>
              </div>
            </form>
          )}
        </section>
        ) : null}
      </section>
    </main>
  );
}
