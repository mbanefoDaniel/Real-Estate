import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getOptimizedListingImage } from "@/lib/image-url";

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
  const heroSpotlight = featuredProperties[0] ?? fallbackProperties[0];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-[#0d1f23] p-6 text-white shadow-sm sm:p-8 md:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.18),transparent_36%),radial-gradient(circle_at_55%_100%,rgba(16,185,129,0.16),transparent_44%)]" />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200 sm:text-sm">
              Christoland
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              Find verified homes and land across
              <span className="text-amber-300"> Nigeria&apos;s prime neighborhoods</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base md:text-lg">
              Browse premium listings, compare locations, and connect with trusted sellers through one modern marketplace.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex rounded-full bg-amber-400 px-6 py-3 text-center text-sm font-semibold text-[#1f2a2c] transition hover:bg-amber-300"
              >
                Explore Properties
              </Link>
              <Link
                href="/sell"
                className="inline-flex rounded-full border border-white/25 bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Post a Listing
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Cities Covered</p>
                <p className="mt-1 text-lg font-semibold">25+</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Verified Leads</p>
                <p className="mt-1 text-lg font-semibold">12k+</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wide text-white/70">Avg. Response</p>
                <p className="mt-1 text-lg font-semibold">Under 2h</p>
              </div>
            </div>
          </div>

          <Link
            href={`/properties/${heroSpotlight.id}`}
            className="group overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md"
          >
            <div className="relative h-56 w-full">
              <Image
                src={getOptimizedListingImage(heroSpotlight.imageUrl, 1200)}
                alt={heroSpotlight.title}
                fill
                priority
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Spotlight Listing</p>
                <p className="mt-1 text-lg font-semibold">{heroSpotlight.city}</p>
              </div>
            </div>
            <div className="p-5">
              <h2 className="line-clamp-2 text-lg font-semibold">{heroSpotlight.title}</h2>
              <p className="mt-2 text-2xl font-bold text-amber-300">{ngn(heroSpotlight.price)}</p>
              <p className="mt-2 text-sm text-white/75">
                {heroSpotlight.bedrooms} bed • {heroSpotlight.bathrooms} bath • {heroSpotlight.areaSqft} sqft
              </p>
            </div>
          </Link>
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
