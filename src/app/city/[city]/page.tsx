import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type CityPageProps = {
  params: Promise<{ city: string }>;
};

function toCityName(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function ngn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const cityName = toCityName(city);

  return {
    title: `${cityName} Properties | NaijaProperty Hub`,
    description: `Browse approved land and house listings in ${cityName}.`,
    alternates: {
      canonical: `/city/${encodeURIComponent(city)}`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const cityName = toCityName(city);

  const properties = await prisma.property.findMany({
    where: {
      city: {
        contains: cityName,
        mode: "insensitive",
      },
      status: "APPROVED",
      isArchived: false,
    },
    select: {
      id: true,
      title: true,
      price: true,
      kind: true,
      listingTerm: true,
      city: true,
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cityName} property listings`,
    itemListElement: properties.map((property, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/properties/${property.id}`,
      name: property.title,
    })),
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 md:px-10 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <section className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <h1 className="text-2xl font-semibold sm:text-3xl md:text-4xl">{cityName} Listings</h1>
        <p className="mt-2 text-sm text-muted">{properties.length} approved listings found in {cityName}.</p>
      </section>

      <section className="mt-6 space-y-3">
        {properties.length === 0 ? (
          <p className="rounded-2xl bg-surface p-5 text-sm text-muted shadow-sm ring-1 ring-black/5">
            No listings found in this city yet.
          </p>
        ) : (
          properties.map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-black/5 transition hover:bg-black/5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="card-heading card-heading-tight text-base">{property.title}</p>
                  <p className="text-sm text-muted">{property.kind} • {property.listingTerm}</p>
                </div>
                <p className="text-lg font-bold">{ngn(property.price)}</p>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
