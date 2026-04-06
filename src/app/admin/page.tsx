import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-[70vh]">
      <section className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Admin Control Center</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight leading-tight sm:text-3xl md:text-4xl">
                Marketplace Operations Hub
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">
                Review fresh listings, resolve KYC and lead queues, and keep moderation workflows moving from one place.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Moderation Active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 6.166a4.5 4.5 0 019 0H7.125z" /></svg>
                  KYC Monitoring
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
                  Lead Triage
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:max-w-xs sm:grid-cols-2 lg:max-w-none lg:grid-cols-1">
              <Link
                href="/admin/listings"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Start Listing Review
              </Link>
              <Link
                href="/admin/leads"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-black/5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
                Open Lead Inbox
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/admin/listings"
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="rounded-lg bg-accent/10 p-2 w-fit">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold">Review Listings</p>
            <p className="mt-1 text-sm text-muted">
              Approve or reject pending property submissions.
            </p>
          </Link>

          <Link
            href="/admin/leads"
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="rounded-lg bg-blue-50 p-2 w-fit">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V18z" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold">Lead Inbox</p>
            <p className="mt-1 text-sm text-muted">
              Track and update buyer enquiries from listing pages.
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="rounded-lg bg-purple-50 p-2 w-fit">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold">User Roles</p>
            <p className="mt-1 text-sm text-muted">Promote or demote user access safely.</p>
          </Link>

          <Link
            href="/admin/kyc"
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="rounded-lg bg-emerald-50 p-2 w-fit">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold">KYC Queue</p>
            <p className="mt-1 text-sm text-muted">Review documents and verify compliance.</p>
          </Link>

          <Link
            href="/admin/audit"
            className="group rounded-2xl border border-black/10 bg-white p-5 shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="rounded-lg bg-amber-50 p-2 w-fit">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold">Audit Timeline</p>
            <p className="mt-1 text-sm text-muted">Review moderation and role activity history.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
