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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">Compare Properties</h1>
        <p className="mt-2 text-sm text-muted">Compare up to 4 recently shortlisted properties side by side.</p>
      </section>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Loading compare list...</p>
      ) : items.length === 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-muted">No properties in compare list yet.</p>
          <Link
            href="/properties"
            className="mt-4 inline-flex rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            Browse Listings
          </Link>
        </section>
      ) : (
        <section className="mt-6 overflow-x-auto rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="border-b border-black/10 px-4 py-3 text-left">Metric</th>
                {items.map((item) => (
                  <th key={item.id} className="border-b border-black/10 px-4 py-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => removeOne(item.id)}
                        className="rounded-full border border-black/15 px-2 py-1 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Price", "City", "Address", "Type", "Term", "Bedrooms", "Bathrooms", "Area", "Featured"].map((label) => (
                <tr key={label}>
                  <td className="border-b border-black/5 px-4 py-3 font-semibold">{label}</td>
                  {items.map((item) => (
                    <td key={`${item.id}-${label}`} className="border-b border-black/5 px-4 py-3 text-muted">
                      {label === "Price"
                        ? ngn(item.price)
                        : label === "City"
                          ? item.city
                          : label === "Address"
                            ? item.address
                            : label === "Type"
                              ? item.kind
                              : label === "Term"
                                ? item.listingTerm
                                : label === "Bedrooms"
                                  ? item.bedrooms
                                  : label === "Bathrooms"
                                    ? item.bathrooms
                                    : label === "Area"
                                      ? `${item.areaSqft} sqft`
                                      : item.featured
                                        ? "Yes"
                                        : "No"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
