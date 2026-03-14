export const metadata = {
  title: "Terms of Service | NaijaProperty Hub",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <h1 className="text-3xl font-semibold md:text-4xl">Terms of Service</h1>
      <p className="mt-4 text-muted">
        By using NaijaProperty Hub, you agree to these terms and all applicable laws.
      </p>
      <div className="mt-8 space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5">
        <section>
          <h2 className="text-xl font-semibold">Acceptable Use</h2>
          <p className="mt-2 text-muted">
            Do not submit fraudulent listings, impersonate others, or use the platform for unlawful activity.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Listing Responsibility</h2>
          <p className="mt-2 text-muted">
            Listing owners are responsible for accuracy, legal ownership claims, and timely responses to inquiries.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Payments and Refunds</h2>
          <p className="mt-2 text-muted">
            Paid promotion features are processed by third-party providers. Refund terms depend on provider settlement status.
          </p>
        </section>
      </div>
    </main>
  );
}
