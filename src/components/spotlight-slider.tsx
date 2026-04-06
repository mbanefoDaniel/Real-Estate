"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

type SpotlightProperty = {
  id: string;
  title: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  imageUrl: string;
};

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SpotlightSlider({ items }: { items: SpotlightProperty[] }) {
  const [active, setActive] = useState(0);
  const count = items.length;

  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  /* auto-advance every 5 seconds */
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, count]);

  if (count === 0) return null;
  const item = items[active];

  return (
    <div className="hidden lg:block">
      <div className="relative">
        <Link
          href={`/properties/${item.id}`}
          className="group relative block overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.06] backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30"
        >
          <div className="relative h-52 w-full overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              priority={active === 0}
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="340px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Spotlight
            </span>
          </div>

          <div className="p-4">
            <p className="text-xs font-medium text-white/50">{item.city}</p>
            <h2 className="mt-0.5 line-clamp-1 text-base font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-xl font-bold text-amber-300">{ngn(item.price)}</p>
            <div className="mt-2.5 flex items-center gap-3 text-xs text-white/55">
              <span>{item.bedrooms} bed</span>
              <span className="h-3 w-px bg-white/20" />
              <span>{item.bathrooms} bath</span>
              <span className="h-3 w-px bg-white/20" />
              <span>{item.areaSqft.toLocaleString()} sqft</span>
            </div>
          </div>
        </Link>

        {/* prev / next arrows */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute -left-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70"
              aria-label="Previous spotlight"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute -right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 backdrop-blur-sm transition hover:bg-black/70"
              aria-label="Next spotlight"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>

      {/* dot indicators */}
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === active ? "w-5 bg-amber-400" : "w-1.5 bg-white/25 hover:bg-white/40"
              }`}
              aria-label={`Go to spotlight ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
