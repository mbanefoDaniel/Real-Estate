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
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Audit Timeline</h1>
              <p className="mt-1 text-sm text-muted">Every admin moderation and access-control action in one feed.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              loadLogs();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Refresh
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? <p className="text-sm text-muted">Loading audit logs...</p> : null}
        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            {error}
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/[0.06]">
            <svg className="mx-auto h-10 w-10 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="mt-3 text-sm text-muted">No audit actions recorded yet.</p>
          </div>
        ) : null}

        {!loading
          ? items.map((item) => (
              <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      item.entityType === "PROPERTY" ? "bg-blue-50 text-blue-700"
                      : item.entityType === "USER" ? "bg-purple-50 text-purple-700"
                      : item.entityType === "LEAD" ? "bg-amber-50 text-amber-700"
                      : "bg-gray-50 text-gray-600"
                    }`}>{item.entityType}</span>
                    <p className="text-sm font-semibold">{item.action}</p>
                  </div>
                  <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString("en-NG")}</p>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  {item.adminEmail} · <span className="font-mono text-[11px]">{item.entityId}</span>
                </p>
                {item.metadata ? (
                  <div className="mt-3 rounded-lg border border-black/[0.06] bg-black/[0.01] p-3 text-xs text-muted">
                    {toMetadataRows(item.metadata).length > 0 ? (
                      <div className="grid gap-1">
                        {toMetadataRows(item.metadata).map((row) => (
                          <p key={`${item.id}-${row.key}`}>
                            <span className="font-semibold text-foreground">{row.key}:</span> {row.value}
                          </p>
                        ))}
                      </div>
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
