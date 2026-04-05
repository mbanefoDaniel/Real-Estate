"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";

type ModerationListing = {
  id: string;
  title: string;
  city: string;
  ownerEmail: string;
  kind?: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm?: "SALE" | "LEASE";
  status?: "PENDING" | "APPROVED" | "REJECTED";
  moderationReason?: string | null;
  moderatedByEmail?: string | null;
  moderatedAt?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
  archivedByEmail?: string | null;
  price: number;
};

type StatusMessage = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

const rejectionTemplates = [
  "Duplicate listing detected. Please keep one active listing per property.",
  "Listing details are incomplete or inaccurate. Update required fields and resubmit.",
  "Image quality is too low or does not represent the listed property.",
];

export default function AdminListingsPage() {
  const [listings, setListings] = useState<ModerationListing[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    type: "idle",
    message: "",
  });

  async function loadCurrentUser() {
    const response = await authFetch("/api/auth/me", { cache: "no-store", credentials: "include" });
    const data = await response.json();
    const admin = data?.user?.role === "ADMIN";
    setIsAdmin(admin);

    if (!admin) {
      setStatusMessage({
        type: "error",
        message: "Admin access required. Sign in with an admin account.",
      });
    }

    return admin;
  }

  async function loadListings() {
    setLoading(true);
    const admin = await loadCurrentUser();

    if (!admin) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch(`/api/properties?includeAll=true&includeArchived=${showArchived ? "true" : "false"}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to fetch listings.");
      }

      setListings(data);
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load listings.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const pendingCount = useMemo(
    () => listings.filter((listing) => listing.status === "PENDING").length,
    [listings]
  );

  const visibleListings = useMemo(() => {
    if (!showPendingOnly) {
      return listings;
    }

    return listings.filter(
      (listing) => (listing.status ?? "PENDING") === "PENDING" && !listing.isArchived
    );
  }, [listings, showPendingOnly]);

  async function restoreListing(id: string) {
    const response = await authFetch(`/api/properties/${id}/restore`, {
      method: "POST",
    });

    const data = await response.json();
    if (!response.ok) {
      setStatusMessage({
        type: "error",
        message: data?.error || "Unable to restore listing.",
      });
      return;
    }

    setListings((prev) => prev.map((item) => (item.id === id ? data : item)));
    setStatusMessage({ type: "success", message: "Listing restored successfully." });
  }

  async function updateStatus(id: string, status: "APPROVED" | "REJECTED") {
    if (!isAdmin) {
      setStatusMessage({ type: "error", message: "Admin access required." });
      return;
    }

    setStatusMessage({ type: "loading", message: `Setting listing ${status.toLowerCase()}...` });

    const listing = listings.find((item) => item.id === id);
    if (!listing) {
      setStatusMessage({ type: "error", message: "Listing not found in state." });
      return;
    }

    let moderationReason: string | null = null;
    if (status === "REJECTED") {
      const templateGuide = rejectionTemplates.map((reason, index) => `${index + 1}. ${reason}`).join("\n");
      const note = window.prompt(
        `Enter rejection reason (required). You can use a template below:\n${templateGuide}`,
        listing.moderationReason ?? rejectionTemplates[0]
      );
      if (note === null) {
        setStatusMessage({ type: "idle", message: "Rejection cancelled." });
        return;
      }

      moderationReason = note.trim();
      if (!moderationReason) {
        setStatusMessage({
          type: "error",
          message: "A rejection reason is required.",
        });
        return;
      }
    }

    const response = await authFetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...listing,
        status,
        moderationReason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage({
        type: "error",
        message: data?.error || "Unable to update listing status.",
      });
      return;
    }

    setListings((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              moderationReason: status === "REJECTED" ? moderationReason : null,
              moderatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setStatusMessage({ type: "success", message: `Listing ${status.toLowerCase()} successfully.` });
  }

  return (
    <main className="min-h-[70vh]">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Moderation Queue</h1>
            <p className="mt-2 text-sm text-muted">
              Review pending submissions. Use the buttons inside each card under Moderation Actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadListings}
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowPendingOnly(true)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                showPendingOnly
                  ? "border-accent bg-accent text-white"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              Pending Only
            </button>
            <button
              type="button"
              onClick={() => setShowPendingOnly(false)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                !showPendingOnly
                  ? "border-accent bg-accent text-white"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              All Listings
            </button>
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                showArchived
                  ? "border-accent bg-accent text-white"
                  : "border-black/15 hover:bg-black/5"
              }`}
            >
              {showArchived ? "Hide Archived" : "Show Archived"}
            </button>
            <Link
              href="/admin/leads"
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              Lead Inbox
            </Link>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-accent">
          Pending reviews: {pendingCount}
        </p>

        {statusMessage.message ? (
          <p className={`mt-2 text-sm ${statusMessage.type === "error" ? "text-red-600" : "text-accent"}`}>
            {statusMessage.message}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? (
          <p className="text-sm text-muted">Loading listings...</p>
        ) : visibleListings.length === 0 ? (
          <p className="text-sm text-muted">
            {showPendingOnly
              ? "No pending listings found. Switch to All Listings to review previously moderated items."
              : "No listings found."}
          </p>
        ) : (
          visibleListings.map((listing) => (
            <article
              key={listing.id}
              className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{listing.title}</h2>
                  <p className="text-sm text-muted">{listing.city}</p>
                  <p className="mt-1 text-sm font-semibold">{ngn(listing.price)}</p>
                  <p className="mt-1 text-xs font-semibold text-accent">
                    {listing.kind ?? "HOUSE"} • {listing.listingTerm ?? "SALE"} • {listing.status ?? "PENDING"}
                  </p>
                  {listing.isArchived ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">Archived</p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Moderation Actions
                    </p>
                    {(listing.status ?? "PENDING") === "PENDING" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Needs Review
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <Link
                      href={`/properties/${listing.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-black/15 px-4 py-3 text-sm font-semibold transition hover:bg-black/5"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => updateStatus(listing.id, "APPROVED")}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(listing.id, "REJECTED")}
                      className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {listing.status !== "PENDING" ? (
                  <p className="text-xs font-semibold text-muted">
                    This listing is already {String(listing.status).toLowerCase()}.
                  </p>
                ) : null}

                {listing.isArchived ? (
                  <button
                    type="button"
                    onClick={() => restoreListing(listing.id)}
                    className="w-fit rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Restore Listing
                  </button>
                ) : null}

                {listing.moderationReason ? (
                  <p className="text-xs text-muted">
                    Reason: <span className="font-semibold">{listing.moderationReason}</span>
                  </p>
                ) : null}

                {listing.moderatedByEmail || listing.moderatedAt ? (
                  <p className="text-xs text-muted">
                    Last moderated by {listing.moderatedByEmail ?? "admin"}
                    {listing.moderatedAt
                      ? ` on ${new Date(listing.moderatedAt).toLocaleString("en-NG")}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
