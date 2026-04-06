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
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Moderation Queue</h1>
              <p className="mt-1 text-sm text-muted">
                Review pending submissions and moderate listings.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadListings}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowPendingOnly(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                showPendingOnly
                  ? "bg-accent text-white shadow-sm"
                  : "border border-black/[0.08] hover:bg-black/[0.03]"
              }`}
            >
              Pending Only
            </button>
            <button
              type="button"
              onClick={() => setShowPendingOnly(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                !showPendingOnly
                  ? "bg-accent text-white shadow-sm"
                  : "border border-black/[0.08] hover:bg-black/[0.03]"
              }`}
            >
              All Listings
            </button>
            <button
              type="button"
              onClick={() => setShowArchived((prev) => !prev)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                showArchived
                  ? "bg-accent text-white shadow-sm"
                  : "border border-black/[0.08] hover:bg-black/[0.03]"
              }`}
            >
              {showArchived ? "Hide Archived" : "Show Archived"}
            </button>
            <Link
              href="/admin/leads"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
              Lead Inbox
            </Link>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5">
          <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          <span className="text-sm font-semibold text-amber-800">Pending reviews: {pendingCount}</span>
        </div>

        {statusMessage.message ? (
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-700"
              : statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
          }`}>
            {statusMessage.type === "error" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {statusMessage.message}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? (
          <p className="text-sm text-muted">Loading listings...</p>
        ) : visibleListings.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/[0.06]">
            <svg className="mx-auto h-10 w-10 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            <p className="mt-3 text-sm text-muted">
              {showPendingOnly
                ? "No pending listings. Switch to All Listings to review previously moderated items."
                : "No listings found."}
            </p>
          </div>
        ) : (
          visibleListings.map((listing) => (
            <article
              key={listing.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{listing.title}</h2>
                    <p className="text-sm text-muted">{listing.city}</p>
                    <p className="mt-1 text-sm font-semibold">{ngn(listing.price)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">{listing.kind ?? "HOUSE"}</span>
                    <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[11px] font-semibold text-muted">{listing.listingTerm ?? "SALE"}</span>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      (listing.status ?? "PENDING") === "APPROVED" ? "bg-emerald-50 text-emerald-700"
                      : (listing.status ?? "PENDING") === "REJECTED" ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                    }`}>{listing.status ?? "PENDING"}</span>
                    {listing.isArchived ? (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">Archived</span>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-black/[0.01] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.26m0 0l-.25-.17A2.25 2.25 0 015 9.75V9a2.25 2.25 0 012.25-2.25h9.5A2.25 2.25 0 0119 9v.75c0 .756-.38 1.462-1.07 1.88l-.25.17m0 0l-5.1 3.26a2.25 2.25 0 01-2.18 0" /></svg>
                      Moderation Actions
                    </p>
                    {(listing.status ?? "PENDING") === "PENDING" ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        Needs Review
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <Link
                      href={`/properties/${listing.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2.5 text-sm font-medium transition hover:bg-black/[0.03]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => updateStatus(listing.id, "APPROVED")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(listing.id, "REJECTED")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Reject
                    </button>
                  </div>
                </div>

                {listing.status !== "PENDING" ? (
                  <p className="text-xs font-medium text-muted">
                    This listing is already {String(listing.status).toLowerCase()}.
                  </p>
                ) : null}

                {listing.isArchived ? (
                  <button
                    type="button"
                    onClick={() => restoreListing(listing.id)}
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                    Restore Listing
                  </button>
                ) : null}

                {listing.moderationReason ? (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                    <span>Reason: <span className="font-semibold">{listing.moderationReason}</span></span>
                  </div>
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
