"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

type AuditLog = {
  id: string;
  adminEmail: string;
  action: string;
  entityType: "PROPERTY" | "USER" | "LEAD" | "SYSTEM";
  entityId: string;
  metadata: unknown;
  createdAt: string;
};

function toMetadataRows(metadata: unknown): Array<{ key: string; value: string }> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  return Object.entries(metadata as Record<string, unknown>).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : value === null
            ? "null"
            : JSON.stringify(value),
  }));
}

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    }
    const response = await authFetch("/api/admin/audit?limit=200", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setError(data?.error || "Unable to load audit logs.");
      setItems([]);
      setLoading(false);
      return;
    }

    setItems(data);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      const response = await authFetch("/api/admin/audit?limit=200", { cache: "no-store" });
      const data = await response.json();

      if (!active) {
        return;
      }

      if (!response.ok) {
        setError(data?.error || "Unable to load audit logs.");
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(data);
      setError("");
      setLoading(false);
    }

    initialLoad();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-[70vh]">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Audit Timeline</h1>
            <p className="mt-2 text-sm text-muted">Every admin moderation and access-control action in one feed.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadLogs();
            }}
            className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? <p className="text-sm text-muted">Loading audit logs...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-muted">No audit actions recorded yet.</p>
        ) : null}

        {!loading
          ? items.map((item) => (
              <article key={item.id} className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.action}</p>
                  <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString("en-NG")}</p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {item.adminEmail} • {item.entityType} • {item.entityId}
                </p>
                {item.metadata ? (
                  <div className="mt-3 rounded-xl border border-black/10 bg-white p-3 text-xs text-muted">
                    {toMetadataRows(item.metadata).length > 0 ? (
                      toMetadataRows(item.metadata).map((row) => (
                        <p key={`${item.id}-${row.key}`}>
                          <span className="font-semibold text-foreground">{row.key}:</span> {row.value}
                        </p>
                      ))
                    ) : (
                      <p>{String(item.metadata)}</p>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
