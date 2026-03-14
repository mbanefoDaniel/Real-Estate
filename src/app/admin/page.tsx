import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-[70vh]">
      <section className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Admin Control Center</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                Marketplace Operations Hub
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">
                Review fresh listings, resolve KYC and lead queues, and keep moderation workflows moving from one place.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Moderation Active
                </span>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                  KYC Monitoring
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Lead Triage
                </span>
              </div>
            </div>

            <div className="grid gap-2 sm:max-w-xs sm:grid-cols-2 lg:max-w-none lg:grid-cols-1">
              <Link
                href="/admin/listings"
                className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
              >
                Start Listing Review
              </Link>
              <Link
                href="/admin/leads"
                className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-black/5"
              >
                Open Lead Inbox
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/admin/listings"
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:bg-black/5"
          >
            <p className="text-lg font-semibold">Review Listings</p>
            <p className="mt-1 text-sm text-muted">
              Approve or reject pending property submissions.
            </p>
          </Link>

          <Link
            href="/admin/leads"
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:bg-black/5"
          >
            <p className="text-lg font-semibold">Lead Inbox</p>
            <p className="mt-1 text-sm text-muted">
              Track and update buyer enquiries from listing pages.
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:bg-black/5"
          >
            <p className="text-lg font-semibold">User Roles</p>
            <p className="mt-1 text-sm text-muted">Promote or demote user access safely.</p>
          </Link>

          <Link
            href="/admin/kyc"
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:bg-black/5"
          >
            <p className="text-lg font-semibold">KYC Queue</p>
            <p className="mt-1 text-sm text-muted">Review documents and verify compliance.</p>
          </Link>

          <Link
            href="/admin/audit"
            className="rounded-2xl border border-black/10 bg-white p-5 transition hover:bg-black/5"
          >
            <p className="text-lg font-semibold">Audit Timeline</p>
            <p className="mt-1 text-sm text-muted">Review moderation and role activity history.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
