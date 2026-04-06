"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CompareProperty = {
  id: string;
  title: string;
  city: string;
  address: string;
  kind: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm: "SALE" | "LEASE";
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  featured: boolean;
};

const COMPARE_KEY = "nph_compare_ids";

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function readCompareIds() {
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed.filter((item): item is string => typeof item === "string").slice(0, 4);
  } catch {
    return [];
  }
}

function saveCompareIds(ids: string[]) {
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, 4)));
}

export default function ComparePage() {
  const [compareIds, setCompareIds] = useState<string[]>(() => readCompareIds());
  const [items, setItems] = useState<CompareProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(() => readCompareIds().length > 0);

  useEffect(() => {
    if (compareIds.length === 0) {
      return;
    }

    fetch(`/api/properties/compare?ids=${encodeURIComponent(compareIds.join(","))}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        setItems(Array.isArray(data) ? (data as CompareProperty[]) : []);
      })
      .finally(() => setLoading(false));
  }, [compareIds]);

  function removeOne(id: string) {
    const ids = readCompareIds().filter((value) => value !== id);
    saveCompareIds(ids);
    setCompareIds(ids);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6 md:px-10 md:py-14">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Compare Properties</h1>
          <p className="mt-1 text-sm text-muted">Side-by-side comparison of up to 4 shortlisted properties.</p>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Browse Listings
        </Link>
      </header>

      {loading ? (
        <div className="mt-10 flex flex-col items-center gap-3 py-16 text-sm text-muted">
          <svg className="h-6 w-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading properties...
        </div>
      ) : items.length === 0 ? (
        <section className="mt-10 flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-black/[0.06]">
          <div className="rounded-full bg-accent/10 p-4">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold">No properties to compare</h2>
          <p className="mt-1 text-sm text-muted">Add properties from the listings page using the compare button.</p>
          <Link
            href="/properties"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Browse Listings
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </section>
      ) : (
        <>
          {/* Property Cards Row */}
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.06]">
                <button
                  type="button"
                  onClick={() => removeOne(item.id)}
                  className="absolute right-3 top-3 rounded-full bg-black/5 p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600"
                  title="Remove from compare"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <Link href={`/properties/${item.id}`} className="group">
                  <h3 className="line-clamp-2 pr-6 text-sm font-bold group-hover:text-accent">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted">{item.city}</p>
                  <p className="mt-2 text-lg font-extrabold text-accent">{ngn(item.price)}</p>
                </Link>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{item.kind}</span>
                  <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{item.listingTerm === "LEASE" ? "Lease" : "Sale"}</span>
                  {item.featured && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-amber-200">★ Featured</span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Comparison Table */}
          <section className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">Metric</th>
                  {items.map((item) => (
                    <th key={item.id} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                      <span className="line-clamp-1">{item.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Price", render: (item: CompareProperty) => <span className="font-bold text-accent">{ngn(item.price)}</span> },
                  { label: "City", render: (item: CompareProperty) => item.city },
                  { label: "Address", render: (item: CompareProperty) => item.address },
                  { label: "Type", render: (item: CompareProperty) => item.kind },
                  { label: "Term", render: (item: CompareProperty) => item.listingTerm === "LEASE" ? "Lease" : "Sale" },
                  { label: "Bedrooms", render: (item: CompareProperty) => <span className="font-semibold">{item.bedrooms}</span> },
                  { label: "Bathrooms", render: (item: CompareProperty) => <span className="font-semibold">{item.bathrooms}</span> },
                  { label: "Area", render: (item: CompareProperty) => `${item.areaSqft.toLocaleString()} sqft` },
                  { label: "Featured", render: (item: CompareProperty) => item.featured ? (
                    <span className="inline-flex items-center gap-1 text-amber-600"><svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg> Yes</span>
                  ) : <span className="text-muted">No</span> },
                ].map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? "bg-black/[0.015]" : ""}>
                    <td className="px-5 py-3 font-semibold">{row.label}</td>
                    {items.map((item) => (
                      <td key={`${item.id}-${row.label}`} className="px-5 py-3">{row.render(item)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
