import Link from "next/link";
import MonthlySubscriptionCard from "@/components/monthly-subscription-card";

const plans = [
  {
    name: "Standard Boost",
    key: "STANDARD",
    priceNgn: Number(process.env.FEATURED_LISTING_PRICE_NGN || 5000),
    features: ["3-day featured badge", "Higher feed ranking", "Priority in city listing"],
  },
  {
    name: "Plus Boost",
    key: "PLUS",
    priceNgn: Number(process.env.FEATURED_LISTING_PLUS_PRICE_NGN || 12000),
    features: ["7-day featured badge", "Homepage priority slot", "Lead response recommendation tag"],
  },
  {
    name: "Premium Spotlight",
    key: "PREMIUM",
    priceNgn: Number(process.env.FEATURED_LISTING_PREMIUM_PRICE_NGN || 25000),
    features: ["14-day premium badge", "Top position in search", "High-intent buyer spotlight"],
  },
];

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PricingPage() {
  const monthlySubscriptionPriceNgn = Number(process.env.MONTHLY_SUBSCRIPTION_PRICE_NGN || 15000);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="reveal-rise relative overflow-hidden rounded-3xl border border-black/10 bg-[linear-gradient(120deg,#0f2a33_0%,#123f4a_42%,#1e6a77_100%)] p-6 text-white shadow-[0_30px_80px_rgba(15,42,51,0.35)] sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-16 h-52 w-52 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-amber-300/15 blur-2xl" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.25) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
        </div>

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Growth Suite</p>
          <h1 className="mt-3 text-2xl font-semibold sm:text-3xl md:text-4xl">Listing Promotion Plans</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Turn visibility into leads with tiered promotion packages designed for serious sellers in high-demand Nigerian markets.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MonthlySubscriptionCard priceNgn={monthlySubscriptionPriceNgn} className="reveal-rise reveal-delay-1" />

        {plans.map((plan, index) => (
          <article
            key={plan.key}
            className={`reveal-rise relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.96)_0%,rgba(241,248,249,0.98)_100%)] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.10)] ring-1 ring-black/5 sm:p-6 ${
              index === 0 ? "reveal-delay-2" : index === 1 ? "reveal-delay-3" : "reveal-delay-4"
            }`}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-cyan-200/45 blur-xl" />
            <div className="relative z-10 flex h-full flex-col">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2 inline-flex w-fit rounded-full border border-cyan-700/20 bg-cyan-900/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-900/80">
                Tier {index + 1}
              </p>
              <p className="mt-2 text-3xl font-bold">{ngn(plan.priceNgn)}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Link
                  href="/my-listings"
                  className="inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  Choose On My Listings
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
