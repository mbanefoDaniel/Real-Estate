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
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">KYC Verification Queue</h1>
            <p className="mt-2 text-sm text-muted">
              Review submitted documents and enforce verification status quickly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadQueue()}
            className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
          >
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
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === item ? "bg-black text-white" : "border border-black/15 hover:bg-black/5"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">
          Loaded: {counts.all} users • Pending: {counts.pending} • Rejected: {counts.rejected} • Verified: {counts.verified} • Not submitted: {counts.notSubmitted}
        </p>

        {status.message ? (
          <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? <p className="text-sm text-muted">Loading KYC queue...</p> : null}

        {!loading && users.length === 0 ? (
          <p className="text-sm text-muted">No users in this KYC filter.</p>
        ) : null}

        {!loading
          ? users.map((user) => (
              <article key={user.id} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.name || "Unnamed user"}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                    <p className="text-xs font-semibold text-accent">KYC: {user.kycStatus}</p>
                    <p className="text-xs text-muted">
                      Registered: {new Date(user.createdAt).toLocaleString("en-NG")}
                    </p>
                    {user.kycSubmittedAt ? (
                      <p className="text-xs text-muted">
                        Submitted: {new Date(user.kycSubmittedAt).toLocaleString("en-NG")}
                      </p>
                    ) : null}
                    {user.kycVerifiedAt ? (
                      <p className="text-xs text-muted">
                        Verified: {new Date(user.kycVerifiedAt).toLocaleString("en-NG")}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "VERIFIED")}
                      className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "REJECTED")}
                      className="rounded-full border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => updateKycStatus(user.id, "NOT_SUBMITTED")}
                      className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className={user.profileImageUrl ? "text-emerald-700" : "text-red-600"}>
                    Profile photo: {user.profileImageUrl ? "Uploaded" : "Missing"}
                  </span>
                  {user.kycDocumentUrl ? (
                    <a href={user.kycDocumentUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
                      View KYC document
                    </a>
                  ) : (
                    <span className="text-red-600">No KYC document uploaded</span>
                  )}
                </div>
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
