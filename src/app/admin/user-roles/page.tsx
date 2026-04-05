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
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">User Roles</h1>
            <p className="mt-2 text-sm text-muted">Promote or demote users with clear role controls.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadUsers();
            }}
            className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
          >
            Refresh
          </button>
        </div>

        {status.message ? (
          <p className={`mt-3 text-sm ${status.type === "error" ? "text-red-600" : "text-accent"}`}>
            {status.message}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? <p className="text-sm text-muted">Loading users...</p> : null}

        {!loading
          ? users.map((user) => (
              <article key={user.id} className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{user.name || "Unnamed user"}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                    <p className="text-xs font-semibold text-accent">Current role: {user.role}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setRole(user, "USER")}
                      className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
                    >
                      Set USER
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(user, "ADMIN")}
                      className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-strong"
                    >
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
