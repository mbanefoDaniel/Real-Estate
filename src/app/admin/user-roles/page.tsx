"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

type Status = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function AdminUserRolesPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  async function loadUsers() {
    setLoading(true);
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

  async function setRole(user: AdminUser, role: "USER" | "ADMIN") {
    setStatus({ type: "loading", message: `Updating ${user.email}...` });

    const response = await authFetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ type: "error", message: data?.error || "Unable to update role." });
      return;
    }

    setUsers((prev) => prev.map((entry) => (entry.id === user.id ? data : entry)));
    setStatus({ type: "success", message: `${user.email} is now ${role}.` });
  }

  return (
    <main className="min-h-[70vh]">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">User Roles</h1>
              <p className="mt-1 text-sm text-muted">Promote or demote users with clear role controls.</p>
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
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRole(user, "USER")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.03]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                      Set USER
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(user, "ADMIN")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-accent/90"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                      Set ADMIN
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
