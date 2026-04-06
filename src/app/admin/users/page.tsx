"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  async function loadUsers(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    const response = await authFetch("/api/admin/users", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to load users." });
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
      const response = await authFetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();

      if (!active) {
        return;
      }

      if (!response.ok) {
        setStatus({ type: "error", message: data?.error || "Unable to load users." });
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

  async function setKycStatus(user: AdminUser, kycStatus: AdminUser["kycStatus"]) {
    setStatus({ type: "loading", message: `Updating KYC for ${user.email}...` });

    const response = await authFetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, kycStatus }),
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to update KYC status." });
      return;
    }

    setUsers((prev) => prev.map((entry) => (entry.id === user.id ? data : entry)));
    setStatus({ type: "success", message: `${user.email} KYC is now ${kycStatus}.` });
  }

  return (
    <main className="min-h-[70vh]">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Users</h1>
              <p className="mt-1 text-sm text-muted">Manage user access and KYC status.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              loadUsers();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Refresh
          </button>
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
        {loading ? <p className="text-sm text-muted">Loading users...</p> : null}

        {!loading
          ? users.map((user) => (
              <article key={user.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.name || "Unnamed user"}</p>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        user.role === "ADMIN" ? "bg-accent/10 text-accent" : "bg-black/[0.04] text-muted"
                      }`}>{user.role}</span>
                    </div>
                    <p className="text-sm text-muted">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                        user.kycStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-700"
                        : user.kycStatus === "PENDING" ? "bg-amber-50 text-amber-700"
                        : user.kycStatus === "REJECTED" ? "bg-red-50 text-red-700"
                        : "bg-gray-50 text-gray-600"
                      }`}>
                        {user.kycStatus === "VERIFIED" ? (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : null}
                        KYC: {user.kycStatus}
                      </span>
                      {user.profileImageUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                          Photo uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          No photo
                        </span>
                      )}
                      {user.kycDocumentUrl ? (
                        <a href={user.kycDocumentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent underline decoration-accent/30 hover:decoration-accent">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          View KYC Doc
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setKycStatus(user, "VERIFIED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Verify KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => setKycStatus(user, "REJECTED")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      Reject KYC
                    </button>
                  </div>
                </div>
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
