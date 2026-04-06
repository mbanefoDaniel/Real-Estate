import Link from "next/link";
import MonthlySubscriptionCard from "@/components/monthly-subscription-card";

const plans = [
  {
    name: "Standard Boost",
    key: "STANDARD",
    priceNgn: Number(process.env.FEATURED_LISTING_PRICE_NGN || 5000),
    duration: "3 days",
    features: ["Featured badge on listing", "Higher feed ranking", "Priority in city listing"],
    accent: "emerald",
  },
  {
    name: "Plus Boost",
    key: "PLUS",
    priceNgn: Number(process.env.FEATURED_LISTING_PLUS_PRICE_NGN || 12000),
    duration: "7 days",
    popular: true,
    features: ["Featured badge on listing", "Homepage priority slot", "Lead response tag", "Higher feed ranking"],
    accent: "accent",
  },
  {
    name: "Premium Spotlight",
    key: "PREMIUM",
    priceNgn: Number(process.env.FEATURED_LISTING_PREMIUM_PRICE_NGN || 25000),
    duration: "14 days",
    features: ["Premium badge on listing", "Top position in search", "High-intent buyer spotlight", "Homepage priority slot", "Lead response tag"],
    accent: "amber",
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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Growth Suite
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Promote your listings,<br className="hidden sm:block" /> close deals faster
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
          Choose a plan to boost visibility and attract serious buyers in high-demand Nigerian markets.
        </p>
      </div>

      {/* Subscription + Boost Plans */}
      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* Monthly Subscription */}
        <MonthlySubscriptionCard priceNgn={monthlySubscriptionPriceNgn} />

        {/* Boost Plans */}
        {plans.map((plan) => (
          <article
            key={plan.key}
            className={`relative flex flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] transition hover:shadow-md ${
              plan.popular ? "ring-2 ring-accent" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute right-4 top-4 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Most Popular
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <p className="mt-0.5 text-xs font-medium text-muted">{plan.duration} promotion</p>
            </div>

            <p className="mt-4">
              <span className="text-3xl font-extrabold tracking-tight">{ngn(plan.priceNgn)}</span>
              <span className="ml-1 text-sm text-muted">/ listing</span>
            </p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <Link
                href="/my-listings"
                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                  plan.popular
                    ? "bg-accent text-white shadow-sm hover:bg-accent-strong"
                    : "border border-black/10 bg-white text-foreground hover:bg-black/[0.03]"
                }`}
              >
                Select on My Listings
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          </article>
        ))}
      </section>

      {/* FAQ / Info */}
      <section className="mt-12 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
        <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Do I need a subscription to post?</h3>
            <p className="mt-1 text-sm text-muted">Yes. An active monthly subscription is required to create new property listings. Existing listings remain visible.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">When does my boost start?</h3>
            <p className="mt-1 text-sm text-muted">Boosts activate as soon as payment is confirmed and your listing is approved by an admin.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Can I boost multiple listings?</h3>
            <p className="mt-1 text-sm text-muted">Absolutely. Each boost is per-listing, so you can promote as many properties as you like simultaneously.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">What payment methods are accepted?</h3>
            <p className="mt-1 text-sm text-muted">We accept all payment methods supported by Paystack — cards, bank transfers, USSD, and mobile money.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
