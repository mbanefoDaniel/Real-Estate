import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedListingImage } from "@/lib/image-url";
import SaveSearchButton from "@/components/save-search-button";
import RecentlyViewedStrip from "@/components/recently-viewed-strip";

export const revalidate = 120;

const PAGE_SIZE = 24;

type PropertyListItem = {
  id: string;
  title: string;
  city: string;
  address: string;
  kind?: "LAND" | "HOUSE" | "APARTMENT";
  listingTerm?: "SALE" | "LEASE";
  price: number;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  featured: boolean;
  imageUrl?: string | null;
};

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function titleCase(value?: string) {
  if (!value) {
    return "";
  }

  return value.charAt(0) + value.slice(1).toLowerCase();
}

function parsePositiveNumber(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

type SearchFilters = {
  location?: string;
  category?: "LAND" | "HOUSE" | "APARTMENT";
  type?: "SALE" | "LEASE";
  beds?: number;
  plotSize?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "NEWEST" | "PRICE_ASC" | "PRICE_DESC";
};

type SearchQuery = {
  location?: string;
  category?: string;
  type?: string;
  beds?: string;
  plotSize?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
};

function buildWhere(filters: SearchFilters) {
  const where: Record<string, unknown> = {
    status: "APPROVED",
    isArchived: false,
  };

  if (filters.location) {
    where.city = {
      contains: filters.location,
      mode: "insensitive",
    };
  }

  if (filters.category) {
    where.kind = filters.category;
  }

  if (filters.type) {
    where.listingTerm = filters.type;
  }

  if (filters.beds !== undefined) {
    where.bedrooms = { gte: filters.beds };
  }

  if (filters.plotSize !== undefined) {
    where.areaSqft = { gte: filters.plotSize };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};

    if (filters.minPrice !== undefined) {
      (where.price as Record<string, number>).gte = filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      (where.price as Record<string, number>).lte = filters.maxPrice;
    }
  }

  return where;
}

async function getProperties(
  filters: SearchFilters,
  page: number
): Promise<{ items: PropertyListItem[]; total: number; totalPages: number }> {
  const where = buildWhere(filters);
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  const skip = (currentPage - 1) * PAGE_SIZE;
  const key = ["properties-page", JSON.stringify(where), String(currentPage), String(filters.sort ?? "NEWEST")];

  const orderBy =
    filters.sort === "PRICE_ASC"
      ? [{ featured: "desc" as const }, { price: "asc" as const }, { createdAt: "desc" as const }]
      : filters.sort === "PRICE_DESC"
        ? [{ featured: "desc" as const }, { price: "desc" as const }, { createdAt: "desc" as const }]
        : [{ featured: "desc" as const }, { createdAt: "desc" as const }];

  try {
    const run = unstable_cache(
      async () => {
        const [total, items] = await Promise.all([
          prisma.property.count({ where: where as never }),
          prisma.property.findMany({
            where: where as never,
            orderBy,
            skip,
            take: PAGE_SIZE,
            select: {
              id: true,
              title: true,
              city: true,
              address: true,
              kind: true,
              listingTerm: true,
              price: true,
              bedrooms: true,
              bathrooms: true,
              areaSqft: true,
              featured: true,
              imageUrl: true,
            },
          }),
        ]);

        return {
          items,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        };
      },
      key,
      {
        revalidate: 120,
        tags: ["properties-list"],
      }
    );

    return await run();
  } catch {
    return {
      items: [],
      total: 0,
      totalPages: 1,
    };
  }
}

function buildPageHref(page: number, query: SearchQuery) {
  const params = new URLSearchParams();

  if (query.location) params.set("location", query.location);
  if (query.category) params.set("category", query.category);
  if (query.type) params.set("type", query.type);
  if (query.beds) params.set("beds", query.beds);
  if (query.plotSize) params.set("plotSize", query.plotSize);
  if (query.minPrice) params.set("minPrice", query.minPrice);
  if (query.maxPrice) params.set("maxPrice", query.maxPrice);
  if (query.sort) params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));

  const search = params.toString();
  return search ? `/properties?${search}` : "/properties";
}

function parsePage(value?: string) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
}

type PropertiesPageProps = {
  searchParams: Promise<SearchQuery>;
};

export async function generateMetadata({ searchParams }: PropertiesPageProps): Promise<Metadata> {
  const query = await searchParams;
  const location = query.location?.trim();
  const category = query.category?.trim();
  const type = query.type?.trim();

  const titleBits = [location, category, type].filter(Boolean);
  const title =
    titleBits.length > 0
      ? `${titleBits.join(" ")} Properties | Christoland`
      : "Browse Properties in Nigeria | Christoland";

  const description = location
    ? `Search approved land and house listings in ${location}. Filter by price, beds, and property type.`
    : "Search approved land and house listings in Nigeria. Filter by location, price, beds, and listing term.";

  return {
    title,
    description,
    alternates: {
      canonical: "/properties",
    },
  };
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const query = await searchParams;
  const currentPage = parsePage(query.page);

  const filters: SearchFilters = {
    location: query.location?.trim() || undefined,
    category:
      query.category === "LAND" || query.category === "HOUSE" || query.category === "APARTMENT"
        ? query.category
        : undefined,
    type: query.type === "SALE" || query.type === "LEASE" ? query.type : undefined,
    beds: parsePositiveNumber(query.beds) ?? undefined,
    plotSize: parsePositiveNumber(query.plotSize) ?? undefined,
    minPrice: parsePositiveNumber(query.minPrice) ?? undefined,
    maxPrice: parsePositiveNumber(query.maxPrice) ?? undefined,
    sort:
      query.sort === "PRICE_ASC" || query.sort === "PRICE_DESC" || query.sort === "NEWEST"
        ? query.sort
        : "NEWEST",
  };

  const result = await getProperties(filters, currentPage);
  const properties = result.items;
  const landForSale = properties.filter(
    (property) => property.kind === "LAND" && property.listingTerm === "SALE"
  );
  const landForLease = properties.filter(
    (property) => property.kind === "LAND" && property.listingTerm === "LEASE"
  );

  const totalPages = result.totalPages;
  const safePage = Math.min(currentPage, totalPages);
  const showPrev = safePage > 1;
  const showNext = safePage < totalPages;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-black/10 bg-surface/95 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/18 blur-3xl" />
          <div className="absolute right-0 top-8 h-60 w-60 rounded-full bg-amber-200/22 blur-3xl" />
        </div>
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Browse Listings</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">Land and Houses in Nigeria</h1>
          <p className="mt-3 max-w-3xl text-muted">
            Explore active listings in Lagos, Abuja, Port Harcourt, Ibadan, and more.
            Use advanced filters to narrow results by price, property type, and location.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg border border-black/10 bg-white px-3 py-1 text-muted">Verified listings</span>
            <span className="rounded-lg border border-black/10 bg-white px-3 py-1 text-muted">For sale and lease</span>
            <span className="rounded-lg border border-black/10 bg-white px-3 py-1 text-muted">City-based search</span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Advanced Search</h2>
            <p className="mt-1 text-sm text-muted">
              Search by location, category, type, beds, plot size, and price range.
            </p>
          </div>
          <span className="rounded-full border border-amber-300/50 bg-amber-100/60 px-3 py-1 text-xs font-semibold text-amber-800">
            Smart Filters
          </span>
        </div>
        <SaveSearchButton
          filters={{
            location: query.location,
            category: query.category,
            type: query.type,
            beds: query.beds,
            plotSize: query.plotSize,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
          }}
        />

        <form action="/properties" method="GET" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="location"
            defaultValue={query.location ?? ""}
            placeholder="Location"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          />

          <select
            name="category"
            defaultValue={query.category ?? ""}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          >
            <option value="">All Categories</option>
            <option value="LAND">Land</option>
            <option value="HOUSE">House</option>
            <option value="APARTMENT">Apartment</option>
          </select>

          <select
            name="type"
            defaultValue={query.type ?? ""}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          >
            <option value="">Sale or Lease</option>
            <option value="SALE">For Sale</option>
            <option value="LEASE">For Lease</option>
          </select>

          <select
            name="sort"
            defaultValue={query.sort ?? "NEWEST"}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          >
            <option value="NEWEST">Sort: Newest</option>
            <option value="PRICE_ASC">Sort: Price Low to High</option>
            <option value="PRICE_DESC">Sort: Price High to Low</option>
          </select>

          <input
            name="beds"
            type="number"
            min={0}
            defaultValue={query.beds ?? ""}
            placeholder="Beds (min)"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          />

          <input
            name="plotSize"
            type="number"
            min={0}
            defaultValue={query.plotSize ?? ""}
            placeholder="Plot Size sqft (min)"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          />

          <input
            name="minPrice"
            type="number"
            min={0}
            defaultValue={query.minPrice ?? ""}
            placeholder="Min Price"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          />

          <input
            name="maxPrice"
            type="number"
            min={0}
            defaultValue={query.maxPrice ?? ""}
            placeholder="Max Price"
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-accent"
          />

          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Search
            </button>
            <Link
              href="/properties"
              className="w-full rounded-lg border border-black/15 px-5 py-3 text-center text-sm font-semibold transition hover:bg-black/5"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {properties.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-muted shadow-sm ring-1 ring-black/5">
            No properties found yet. Add one from your API client to populate this page.
          </p>
        ) : (
          properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="group overflow-hidden rounded-2xl border border-black/10 bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <article>
                <div className="relative h-48 w-full overflow-hidden sm:h-56">
                  <Image
                    src={getOptimizedListingImage(property.imageUrl, 1000)}
                    alt={property.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-semibold text-[#1f2a2c] backdrop-blur-sm">
                      {titleCase(property.kind)}
                    </span>
                    <span className="rounded-lg bg-amber-300/90 px-3 py-1 text-xs font-semibold text-[#1f2a2c] backdrop-blur-sm">
                      {property.listingTerm === "SALE" ? "For Sale" : "For Lease"}
                    </span>
                    {property.featured ? (
                      <span className="rounded-lg bg-cyan-300/90 px-3 py-1 text-xs font-semibold text-[#1f2a2c] backdrop-blur-sm">
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <p className="absolute bottom-4 left-4 right-4 text-sm font-semibold text-white/90">
                    {property.city}
                  </p>
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="line-clamp-2 text-xl font-semibold leading-tight sm:text-2xl">{property.title}</h2>

                  <p className="mt-2 line-clamp-2 text-sm text-muted">
                    {property.address}, {property.city}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-2xl font-bold text-accent">{ngn(property.price)}</p>
                    <span className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold text-muted">
                      View Details
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                    <p className="rounded-xl border border-black/10 bg-black/[0.02] px-2 py-2 text-center font-semibold text-muted">
                      {property.bedrooms} bed
                    </p>
                    <p className="rounded-xl border border-black/10 bg-black/[0.02] px-2 py-2 text-center font-semibold text-muted">
                      {property.bathrooms} bath
                    </p>
                    <p className="rounded-xl border border-black/10 bg-black/[0.02] px-2 py-2 text-center font-semibold text-muted">
                      {property.areaSqft} sqft
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </section>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm">
        {showPrev ? (
          <Link
            href={buildPageHref(safePage - 1, query)}
            className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs font-semibold transition hover:bg-black/[0.04]"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Prev
          </Link>
        ) : null}

        <span className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-xs font-semibold text-muted">
          {safePage} / {totalPages}
          <span className="ml-1.5 text-muted/60">({result.total.toLocaleString("en-NG")})</span>
        </span>

        {showNext ? (
          <Link
            href={buildPageHref(safePage + 1, query)}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent/90"
          >
            Next
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        ) : null}
      </div>

      <RecentlyViewedStrip />

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-surface/95 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">Available Land For Sale</h2>
          <p className="mt-2 text-sm text-muted">{landForSale.length} active listings</p>
          <div className="mt-4 space-y-3">
            {landForSale.length === 0 ? (
              <p className="text-sm text-muted">No land-for-sale listings yet.</p>
            ) : (
              landForSale.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="group block overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">For Sale</p>
                    <p className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted">
                      {property.city}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="line-clamp-2 text-base font-semibold leading-tight transition group-hover:text-accent">
                      {property.title}
                    </p>
                    <p className="mt-2 text-lg font-bold text-accent">{ngn(property.price)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-black/10 bg-surface/95 p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">Available Land For Lease</h2>
          <p className="mt-2 text-sm text-muted">{landForLease.length} active listings</p>
          <div className="mt-4 space-y-3">
            {landForLease.length === 0 ? (
              <p className="text-sm text-muted">No land-for-lease listings yet.</p>
            ) : (
              landForLease.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="group block overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">For Lease</p>
                    <p className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-muted">
                      {property.city}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="line-clamp-2 text-base font-semibold leading-tight transition group-hover:text-accent">
                      {property.title}
                    </p>
                    <p className="mt-2 text-lg font-bold text-accent">{ngn(property.price)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="relative mt-10 overflow-hidden rounded-2xl border border-black/10 bg-[#102a31] p-5 text-white shadow-sm sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-85"
          style={{ backgroundImage: "url('/city-landing-bg.svg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b1f24]/75 via-[#0e2a31]/65 to-[#122f37]/75" />

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Explore By City</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">City Landing Pages</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
            Jump into SEO-optimized city hubs to discover the newest verified homes and plots faster.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { city: "Lagos", region: "South West" },
              { city: "Abuja", region: "North Central" },
              { city: "Port-Harcourt", region: "South South" },
              { city: "Ibadan", region: "South West" },
              { city: "Kano", region: "North West" },
            ].map(({ city, region }) => (
              <Link
                key={city}
                href={`/city/${city.toLowerCase()}`}
                className="group flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-cyan-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4.35 8-11a8 8 0 1 0-16 0c0 6.65 8 11 8 11z" />
                    <circle cx="12" cy="11" r="3" />
                  </svg>
                </span>
                <span className="flex flex-col leading-tight">
                  <span>{city.replace("-", " ")}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    {region}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
