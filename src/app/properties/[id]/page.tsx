import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getOptimizedListingImage } from "@/lib/image-url";
import { getAuthCookieName, verifySessionToken } from "@/lib/auth";
import LeadForm from "@/components/lead-form";
import RecentlyViewedTracker from "@/components/recently-viewed-tracker";
import CompareToggleButton from "@/components/compare-toggle-button";

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      city: true,
      imageUrl: true,
    },
  });

  if (!property) {
    return {
      title: "Property Not Found | Christoland",
    };
  }

  return {
    title: `${property.title} in ${property.city} | Christoland`,
    description: property.description.slice(0, 160),
    alternates: {
      canonical: `/properties/${property.id}`,
    },
    openGraph: {
      title: property.title,
      description: property.description.slice(0, 160),
      images: property.imageUrl ? [property.imageUrl] : [],
      type: "website",
    },
  };
}

export default async function PropertyDetailsPage({ params }: PropertyPageProps) {
  const { id } = await params;

  const propertyRecord = await prisma.property.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const property = propertyRecord as
    | (NonNullable<typeof propertyRecord> & {
        kind?: string;
        listingTerm?: string;
      })
    | null;

  if (!property) {
    notFound();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const sessionUser = token ? verifySessionToken(token) : null;
  const isOwner = sessionUser?.email === property.ownerEmail;

  const isLandOnly = property.bedrooms === 0 && property.bathrooms === 0;
  const similarListings = await prisma.property.findMany({
    where: {
      id: { not: property.id },
      city: property.city,
      status: "APPROVED",
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      city: true,
      price: true,
      imageUrl: true,
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description,
    url: `/properties/${property.id}`,
    image: property.imageUrl,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      streetAddress: property.address,
      addressCountry: "NG",
    },
    numberOfRooms: property.bedrooms,
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.areaSqft,
      unitCode: "FTK",
    },
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <RecentlyViewedTracker propertyId={property.id} />

      <Link href="/properties" className="text-sm font-semibold text-accent">
        Back to listings
      </Link>

      <article className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
        <div className="relative h-56 w-full sm:h-72 md:h-[420px]">
          <Image
            src={getOptimizedListingImage(property.imageUrl, 1600)}
            alt={property.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
            <p className="rounded-lg bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {property.city}
            </p>
            <p className="rounded-lg bg-black/10 px-3 py-1 text-xs font-semibold">
              {property.kind ?? "HOUSE"}
            </p>
            <p className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {property.listingTerm ?? "SALE"}
            </p>
            {property.featured ? (
              <p className="rounded-lg bg-black/10 px-3 py-1 text-xs font-semibold">
                Featured Listing
              </p>
            ) : null}
          </div>

            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl md:text-4xl">{property.title}</h1>
            <p className="mt-2 text-sm text-muted">{property.address}</p>
            <p className="mt-4 text-3xl font-bold">{ngn(property.price)}</p>
            <CompareToggleButton propertyId={property.id} />

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <p className="rounded-xl bg-black/5 px-4 py-3">
                <span className="block text-xs uppercase tracking-wide text-muted">Area</span>
                {property.areaSqft} sqft
              </p>
              <p className="rounded-xl bg-black/5 px-4 py-3">
                <span className="block text-xs uppercase tracking-wide text-muted">Bedrooms</span>
                {isLandOnly ? "Land only" : property.bedrooms}
              </p>
              <p className="rounded-xl bg-black/5 px-4 py-3">
                <span className="block text-xs uppercase tracking-wide text-muted">Bathrooms</span>
                {isLandOnly ? "Land only" : property.bathrooms}
              </p>
            </div>

            <h2 className="mt-8 text-xl font-semibold">Property Description</h2>
            <p className="mt-2 leading-7 text-muted">{property.description}</p>

            {property.images.length > 0 ? (
              <>
                <h2 className="mt-8 text-xl font-semibold">Gallery</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {property.images.map((image) => (
                    <div key={image.id} className="relative h-52 overflow-hidden rounded-xl sm:h-56">
                      <Image
                        src={getOptimizedListingImage(image.imageUrl, 1200)}
                        alt={`${property.title} gallery image`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {isOwner ? (
              <div id="contact-owner" className="mt-8 rounded-xl border border-accent/20 bg-accent/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-accent">This is your listing</p>
                    <p className="text-xs text-muted">You are the owner of this property</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href="/my-listings" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent/90">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                    Manage Listings
                  </Link>
                  <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg bg-black/[0.06] px-3.5 py-2 text-xs font-semibold transition hover:bg-black/[0.1]">
                    Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 id="contact-owner" className="mt-8 text-xl font-semibold">Contact Owner</h2>
                <p className="mt-2 text-sm text-muted">
                  Send an enquiry to request inspection details or negotiate terms.
                </p>
                <LeadForm propertyId={property.id} />
              </>
            )}
          </div>

          <aside className="md:sticky md:top-24 md:self-start">
            {isOwner ? (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs font-bold text-accent">Your Listing</p>
                </div>
                <p className="mt-2 text-xs text-muted">This property was posted from your account. Manage it from your listings page.</p>
                <Link
                  href="/my-listings"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90"
                >
                  Manage Listings
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Need a fast response?</p>
                <p className="mt-2 text-sm text-muted">Send your enquiry now and include your preferred inspection time.</p>
                <a
                  href="#contact-owner"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  Enquire About This Property
                </a>
              </div>
            )}
          </aside>
        </div>
      </article>

      {similarListings.length > 0 ? (
        <section className="mt-6 rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 sm:p-6">
          <h2 className="text-xl font-semibold">Similar Listings in {property.city}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similarListings.map((item) => (
              <Link key={item.id} href={`/properties/${item.id}`} className="overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-0.5">
                <div className="relative h-36 w-full">
                  <Image
                    src={getOptimizedListingImage(item.imageUrl, 900)}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted">{item.city}</p>
                  <p className="mt-2 text-sm font-bold">{ngn(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
