"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type LeadItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
  createdAt: string;
  property: {
    id: string;
    title: string;
    city: string;
    ownerEmail: string;
  };
};

type StatusMessage = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const quickReplies = [
  "Thanks for your interest. The property is still available. What date works for inspection?",
  "Inspection slots are open this week. Please share your preferred day and time.",
  "Thank you. Kindly confirm your budget range so we can align options before inspection.",
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "NEW" | "CONTACTED" | "CLOSED">("ALL");
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({
    type: "idle",
    message: "",
  });

  async function loadCurrentUser() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
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

  async function loadLeads() {
    setLoading(true);
    setStatusMessage({ type: "idle", message: "" });

    const admin = await loadCurrentUser();
    if (!admin) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (filter !== "ALL") {
      params.set("status", filter);
    }

    const response = await fetch(`/api/leads?${params.toString()}`, { cache: "no-store" });

    const data = await response.json();

    if (!response.ok) {
      setLeads([]);
      setStatusMessage({
        type: "error",
        message: data?.error || "Unable to load leads.",
      });
      setLoading(false);
      return;
    }

    setLeads(data);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const fresh = leads.filter((lead) => lead.status === "NEW").length;
    const contacted = leads.filter((lead) => lead.status === "CONTACTED").length;
    const closed = leads.filter((lead) => lead.status === "CLOSED").length;
    return { total, fresh, contacted, closed };
  }, [leads]);

  async function updateLeadStatus(id: string, status: "NEW" | "CONTACTED" | "CLOSED") {
    if (!isAdmin) {
      setStatusMessage({ type: "error", message: "Admin access required." });
      return;
    }

    setStatusMessage({ type: "loading", message: `Updating lead to ${status.toLowerCase()}...` });

    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatusMessage({ type: "error", message: data?.error || "Unable to update lead status." });
      return;
    }

    setLeads((prev) => prev.map((lead) => (lead.id === id ? data : lead)));
    setStatusMessage({ type: "success", message: "Lead status updated." });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Lead Inbox</h1>
            <p className="mt-2 text-sm text-muted">
              Manage buyer enquiries and move each lead through your pipeline.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadLeads}
              className="rounded-full border border-black/15 px-5 py-2 text-sm font-semibold transition hover:bg-black/5"
            >
              Refresh
            </button>
            <Link
              href="/admin/listings"
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Moderation Queue
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filter === "ALL" ? "bg-black text-white" : "border border-black/15 hover:bg-black/5"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("NEW")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filter === "NEW" ? "bg-blue-700 text-white" : "border border-black/15 hover:bg-black/5"
            }`}
          >
            New ({stats.fresh})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CONTACTED")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filter === "CONTACTED" ? "bg-amber-600 text-white" : "border border-black/15 hover:bg-black/5"
            }`}
          >
            Contacted ({stats.contacted})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CLOSED")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              filter === "CLOSED" ? "bg-emerald-700 text-white" : "border border-black/15 hover:bg-black/5"
            }`}
          >
            Closed ({stats.closed})
          </button>
        </div>

        {statusMessage.message ? (
          <p className={`mt-3 text-sm ${statusMessage.type === "error" ? "text-red-600" : "text-accent"}`}>
            {statusMessage.message}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? (
          <p className="text-sm text-muted">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted">No leads found for this filter.</p>
        ) : (
          leads.map((lead) => (
            <article key={lead.id} className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{lead.name}</h2>
                  <p className="text-sm text-muted">{lead.email}{lead.phone ? ` • ${lead.phone}` : ""}</p>
                  <p className="mt-1 text-xs font-semibold text-accent">
                    {lead.property.title} • {lead.property.city}
                  </p>
                  <p className="mt-1 text-xs text-muted">{formatDate(lead.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/properties/${lead.property.id}`}
                    className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
                  >
                    View Property
                  </Link>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "CONTACTED")}
                    className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
                  >
                    Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "CLOSED")}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Closed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "NEW")}
                    className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold transition hover:bg-black/5"
                  >
                    Reopen
                  </button>
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-black/5 px-4 py-3 text-sm leading-6">{lead.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(reply);
                        setStatusMessage({ type: "success", message: "Reply template copied to clipboard." });
                      } catch {
                        setStatusMessage({ type: "error", message: "Unable to copy reply template." });
                      }
                    }}
                    className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-black/5"
                  >
                    Copy Reply {index + 1}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
