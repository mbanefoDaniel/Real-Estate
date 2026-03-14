"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ComparedProperty = {
  id: string;
  title: string;
  city: string;
  price: number;
  kind: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm: "SALE" | "LEASE";
};

const RECENTLY_VIEWED_KEY = "nph_recently_viewed";

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function readIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string").slice(0, 6);
  } catch {
    return [];
  }
}

export default function RecentlyViewedStrip() {
  const [items, setItems] = useState<ComparedProperty[]>([]);

  useEffect(() => {
    const ids = readIds();
    if (ids.length === 0) {
      return;
    }

    fetch(`/api/properties/compare?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data as ComparedProperty[]);
        }
      })
      .catch(() => {
        setItems([]);
      });
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="relative mt-8 overflow-hidden rounded-3xl border border-black/10 bg-[#10272d] p-5 text-white shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-85"
        style={{ backgroundImage: "url('/recently-viewed-bg.svg')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b1f24]/75 via-[#0e2a31]/65 to-[#122f37]/75" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Continue Browsing</p>
          <h2 className="text-xl font-semibold">Recently Viewed</h2>
        </div>
        <Link
          href="/compare"
          className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
        >
          Open Compare
        </Link>
      </div>

      <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((property) => (
          <Link
            key={property.id}
            href={`/properties/${property.id}`}
            className="group rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/20"
          >
            <p className="line-clamp-1 text-base font-semibold text-white group-hover:text-amber-100">{property.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
              <span className="rounded-full bg-white/15 px-2.5 py-1">{property.city}</span>
              <span className="rounded-full bg-amber-300/85 px-2.5 py-1 text-[#1f2a2c]">
                {property.listingTerm === "SALE" ? "For Sale" : "For Lease"}
              </span>
              <span className="rounded-full bg-cyan-300/85 px-2.5 py-1 text-[#1f2a2c]">
                {property.kind}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-amber-100">{ngn(property.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
