export const metadata = {
  title: "Privacy Policy | Christoland",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <h1 className="text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
      <p className="mt-4 text-muted">
        We collect account details, listing content, and lead activity to operate the platform and prevent abuse.
      </p>
      <div className="mt-8 space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5">
        <section>
          <h2 className="text-xl font-semibold">What We Collect</h2>
          <p className="mt-2 text-muted">
            Name, email, password hash, profile details, KYC data, listings, and inquiry messages submitted through the website.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">How We Use Data</h2>
          <p className="mt-2 text-muted">
            To authenticate users, publish listings, route leads, run security checks, and send operational notifications.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Retention and Security</h2>
          <p className="mt-2 text-muted">
            We retain data only as needed for legal and operational purposes and apply technical safeguards to protect it.
          </p>
        </section>
      </div>
    </main>
  );
}
