"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";

type LeadItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
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
  "We've received your enquiry and will get back to you within 24 hours. Thank you for your patience.",
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

    const response = await authFetch(`/api/leads?${params.toString()}`, { cache: "no-store" });

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

    const response = await authFetch(`/api/leads/${id}`, {
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
    <main className="min-h-[70vh]">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Lead Inbox</h1>
              <p className="mt-1 text-sm text-muted">
                Manage buyer enquiries and move each lead through your pipeline.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadLeads}
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              Refresh
            </button>
            <Link
              href="/admin/listings"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              Moderation Queue
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "ALL" ? "bg-black text-white shadow-sm" : "border border-black/[0.08] hover:bg-black/[0.03]"
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter("NEW")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "NEW" ? "bg-blue-600 text-white shadow-sm" : "border border-black/[0.08] hover:bg-black/[0.03]"
            }`}
          >
            New ({stats.fresh})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CONTACTED")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "CONTACTED" ? "bg-amber-600 text-white shadow-sm" : "border border-black/[0.08] hover:bg-black/[0.03]"
            }`}
          >
            Contacted ({stats.contacted})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CLOSED")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "CLOSED" ? "bg-emerald-600 text-white shadow-sm" : "border border-black/[0.08] hover:bg-black/[0.03]"
            }`}
          >
            Closed ({stats.closed})
          </button>
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
          <p className="text-sm text-muted">Loading leads...</p>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/[0.06]">
            <svg className="mx-auto h-10 w-10 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
            <p className="mt-3 text-sm text-muted">No leads found for this filter.</p>
          </div>
        ) : (
          leads.map((lead) => (
            <article key={lead.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{lead.name}</h2>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      lead.status === "NEW" ? "bg-blue-50 text-blue-700"
                      : lead.status === "CONTACTED" ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                    }`}>{lead.status}</span>
                  </div>
                  <p className="text-sm text-muted">{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}{lead.whatsapp ? ` · WA: ${lead.whatsapp}` : ""}</p>
                  <p className="mt-1 text-xs font-semibold text-accent">
                    {lead.property.title} · {lead.property.city}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(lead.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/properties/${lead.property.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.03]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    View Property
                  </Link>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "CONTACTED")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    Contacted
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "CLOSED")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    Closed
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLeadStatus(lead.id, "NEW")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.03]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                    Reopen
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-black/[0.02] px-4 py-3 text-sm leading-6 ring-1 ring-black/[0.04]">{lead.message}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {quickReplies.map((reply) => (
                  <a
                    key={reply}
                    href={`mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(`Re: ${lead.property.title} — ${lead.property.city}`)}&body=${encodeURIComponent(reply)}`}
                    className="group flex items-start gap-2 rounded-lg border border-black/[0.08] px-3 py-2 text-left text-[11px] leading-relaxed transition hover:bg-black/[0.03]"
                  >
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    <span className="text-muted">{reply}</span>
                  </a>
                ))}
                {lead.whatsapp ? (
                  <a
                    href={`https://wa.me/${lead.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-left text-[11px] leading-relaxed transition hover:bg-emerald-100/60"
                  >
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    <span className="text-emerald-700">Chat on WhatsApp</span>
                  </a>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
