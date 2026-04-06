"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type KycQueueUser = {
  id: string;
  name: string | null;
  email: string;
  profileImageUrl: string | null;
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
  kycDocumentUrl: string | null;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  createdAt: string;
};

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

type QueueFilter = "ALL" | "PENDING" | "REJECTED" | "VERIFIED" | "NOT_SUBMITTED";

export default function AdminKycQueuePage() {
  const [users, setUsers] = useState<KycQueueUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<QueueFilter>("PENDING");
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  async function loadQueue(nextFilter?: QueueFilter) {
    const activeFilter = nextFilter ?? filter;
    setLoading(true);

    const query = activeFilter === "ALL" ? "" : `?status=${activeFilter}`;
    const response = await authFetch(`/api/admin/kyc${query}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to load KYC queue." });
      setUsers([]);
      setLoading(false);
      return;
    }

    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      const response = await authFetch("/api/admin/kyc?status=PENDING", { cache: "no-store" });
      const data = await response.json();

      if (!active) {
        return;
      }

      if (!response.ok) {
        setStatus({ type: "error", message: data?.error || "Unable to load KYC queue." });
        setUsers([]);
        setLoading(false);
        return;
      }

      setUsers(data);
      setLoading(false);
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      all: users.length,
      pending: users.filter((u) => u.kycStatus === "PENDING").length,
      rejected: users.filter((u) => u.kycStatus === "REJECTED").length,
      verified: users.filter((u) => u.kycStatus === "VERIFIED").length,
      notSubmitted: users.filter((u) => u.kycStatus === "NOT_SUBMITTED").length,
    };
  }, [users]);

  async function updateKycStatus(userId: string, kycStatus: KycQueueUser["kycStatus"]) {
    setStatus({ type: "loading", message: `Updating KYC status to ${kycStatus}...` });

    const response = await authFetch("/api/admin/kyc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, kycStatus }),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to update KYC status." });
      return;
    }

    setUsers((prev) => prev.map((user) => (user.id === userId ? data : user)));
    setStatus({ type: "success", message: "KYC status updated." });
  }

  return (
    <main className="min-h-[70vh]">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">KYC Verification Queue</h1>
              <p className="mt-1 text-sm text-muted">
                Review submitted documents and enforce verification status.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadQueue()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["ALL", "PENDING", "REJECTED", "VERIFIED", "NOT_SUBMITTED"] as QueueFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setFilter(item);
                void loadQueue(item);
              }}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                filter === item ? "bg-black text-white shadow-sm" : "border border-black/[0.08] hover:bg-black/[0.03]"
              }`}
            >
              {item.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] px-2 py-1 font-medium">Total: {counts.all}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">Pending: {counts.pending}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 font-medium text-red-700">Rejected: {counts.rejected}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">Verified: {counts.verified}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-600">Not submitted: {counts.notSubmitted}</span>
        </div>

        {status.message ? (
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            status.type === "error"
              ? "bg-red-50 text-red-700"
              : status.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
          }`}>
            {status.type === "error" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {status.message}
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? <p className="text-sm text-muted">Loading KYC queue...</p> : null}

        {!loading && users.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/[0.06]">
            <svg className="mx-auto h-10 w-10 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" /></svg>
            <p className="mt-3 text-sm text-muted">No users in this KYC filter.</p>
          </div>
        ) : null}

        {!loading
          ? users.map((user) => (
              <article key={user.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.name || "Unnamed user"}</p>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        user.kycStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-700"
                        : user.kycStatus === "PENDING" ? "bg-amber-50 text-amber-700"
                        : user.kycStatus === "REJECTED" ? "bg-red-50 text-red-700"
                        : "bg-gray-50 text-gray-600"
                      }`}>{user.kycStatus.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm text-muted">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted">
                      <span>Registered: {new Date(user.createdAt).toLocaleString("en-NG")}</span>
                      {user.kycSubmittedAt ? (
                        <span>Submitted: {new Date(user.kycSubmittedAt).toLocaleString("en-NG")}</span>
                      ) : null}
                      {user.kycVerifiedAt ? (
                        <span className="text-emerald-700">Verified: {new Date(user.kycVerifiedAt).toLocaleString("en-NG")}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "VERIFIED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "REJECTED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "NOT_SUBMITTED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.03]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className={`inline-flex items-center gap-1 ${user.profileImageUrl ? "text-emerald-700" : "text-red-600"}`}>
                    {user.profileImageUrl ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    Profile photo: {user.profileImageUrl ? "Uploaded" : "Missing"}
                  </span>
                  {user.kycDocumentUrl ? (
                    <a href={user.kycDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent underline decoration-accent/30 hover:decoration-accent">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      View KYC document
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      No KYC document
                    </span>
                  )}
                </div>
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
