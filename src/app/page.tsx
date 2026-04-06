import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getOptimizedListingImage } from "@/lib/image-url";
import SpotlightSlider from "@/components/spotlight-slider";

type PropertyCard = {
  id: string;
  title: string;
  city: string;
  kind?: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm?: "SALE" | "LEASE";
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  imageUrl?: string | null;
};

const fallbackProperties: PropertyCard[] = [
  {
    id: "sample-1",
    title: "Lekki Family Duplex",
    city: "Lagos",
    kind: "HOUSE",
    listingTerm: "SALE",
    price: 285000000,
    bedrooms: 4,
    bathrooms: 3.5,
    areaSqft: 3420,
    imageUrl: "/listing-placeholder.svg",
  },
  {
    id: "sample-2",
    title: "Maitama Terrace Home",
    city: "Abuja",
    kind: "HOUSE",
    listingTerm: "SALE",
    price: 210000000,
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1860,
    imageUrl: "/listing-placeholder.svg",
  },
  {
    id: "sample-3",
    title: "Ibadan Courtyard Bungalow",
    city: "Ibadan",
    kind: "HOUSE",
    listingTerm: "SALE",
    price: 95000000,
    bedrooms: 3,
    bathrooms: 2.5,
    areaSqft: 2480,
    imageUrl: "/listing-placeholder.svg",
  },
];

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

async function getFeaturedProperties(): Promise<PropertyCard[]> {
  try {
    return await prisma.property.findMany({
      where: { featured: true },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        city: true,
        kind: true,
        listingTerm: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        areaSqft: true,
        imageUrl: true,
      },
    });
  } catch {
    return fallbackProperties;
  }
}

async function getLandListings(listingTerm: "SALE" | "LEASE"): Promise<PropertyCard[]> {
  try {
    return await prisma.property.findMany({
      where: {
        kind: "LAND",
        listingTerm,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        city: true,
        kind: true,
        listingTerm: true,
        price: true,
        bedrooms: true,
        bathrooms: true,
        areaSqft: true,
        imageUrl: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  const featuredProperties = await getFeaturedProperties();
  const [landForSale, landForLease] = await Promise.all([
    getLandListings("SALE"),
    getLandListings("LEASE"),
  ]);
  const spotlightItems = (featuredProperties.length > 0 ? featuredProperties : fallbackProperties).map((p) => ({
    id: p.id,
    title: p.title,
    city: p.city,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    areaSqft: p.areaSqft,
    imageUrl: getOptimizedListingImage(p.imageUrl, 1200),
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1a1d] via-[#0d2428] to-[#112f28] p-6 text-white sm:p-8 md:p-10 lg:p-12">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-amber-400/20 blur-[90px]" />
        </div>

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1fr_340px]">
          {/* ── left copy ── */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Christoland
            </span>

            <h1 className="mt-5 max-w-xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-[2.75rem]">
              Premium homes &amp; land in
              <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent"> Nigeria&apos;s finest locations</span>
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/65">
              Verified listings, transparent pricing, and direct seller access — everything you need in one marketplace.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-[#1a2c1e] shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 hover:shadow-amber-300/30"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                Explore Properties
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.12]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Post a Listing
              </Link>
            </div>

            {/* stat chips */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { label: "Cities", value: "25+" },
                { label: "Verified Leads", value: "12k+" },
                { label: "Avg. Response", value: "< 2 hrs" },
              ].map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs backdrop-blur-sm">
                  <span className="font-bold text-white">{s.value}</span>
                  <span className="text-white/50">{s.label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── spotlight slider ── */}
          <SpotlightSlider items={spotlightItems} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">Featured Listings</h2>
          <Link href="/properties" className="text-sm font-semibold text-accent">
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProperties.map((property, index) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <article>
                <div className="relative h-40 w-full sm:h-44">
                  <Image
                    src={getOptimizedListingImage(property.imageUrl, 900)}
                    alt={property.title}
                    fill
                    priority={index < 2}
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <p className="text-sm font-semibold text-accent">{property.city}</p>
                  <h3 className="card-heading mt-1 line-clamp-2 text-lg sm:text-xl">{property.title}</h3>
                  <p className="mt-3 text-2xl font-bold">{ngn(property.price)}</p>
                  <p className="mt-3 text-sm text-muted">
                    {property.bedrooms} bed • {property.bathrooms} bath • {property.areaSqft} sqft
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">Land For Sale</h2>
          <Link href="/properties" className="text-sm font-semibold text-accent">
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {landForSale.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <article>
                <div className="relative h-36 w-full sm:h-40">
                  <Image
                    src={getOptimizedListingImage(property.imageUrl, 700)}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{property.city}</p>
                  <h3 className="card-heading card-heading-tight mt-1 line-clamp-2 text-base">{property.title}</h3>
                  <p className="mt-2 text-lg font-bold">{ngn(property.price)}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold">Land For Lease</h2>
          <Link href="/properties" className="text-sm font-semibold text-accent">
            View all
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {landForLease.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <article>
                <div className="relative h-36 w-full sm:h-40">
                  <Image
                    src={getOptimizedListingImage(property.imageUrl, 700)}
                    alt={property.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{property.city}</p>
                  <h3 className="card-heading card-heading-tight mt-1 line-clamp-2 text-base">{property.title}</h3>
                  <p className="mt-2 text-lg font-bold">{ngn(property.price)}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
