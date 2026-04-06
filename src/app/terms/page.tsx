export const metadata = {
  title: "Terms of Service | Christoland",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-accent/10 p-2.5">
          <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>
          <p className="mt-1 text-sm text-muted">Last updated: March 2026</p>
        </div>
      </div>
      <p className="mt-4 text-muted">
        By using Christoland, you agree to these terms and all applicable laws.
      </p>
      <div className="mt-8 space-y-4">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold">Acceptable Use</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted">
            Do not submit fraudulent listings, impersonate others, or use the platform for unlawful activity.
          </p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            </div>
            <h2 className="text-lg font-bold">Listing Responsibility</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted">
            Listing owners are responsible for accuracy, legal ownership claims, and timely responses to inquiries.
          </p>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
            </div>
            <h2 className="text-lg font-bold">Payments and Refunds</h2>
          </div>
          <p className="mt-3 leading-relaxed text-muted">
            Paid promotion features are processed by third-party providers. Refund terms depend on provider settlement status.
          </p>
        </section>
      </div>
    </main>
  );
}
