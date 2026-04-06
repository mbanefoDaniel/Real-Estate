import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";
import { getUserComplianceStatus } from "@/lib/compliance";
import { hasActiveSubscription } from "@/lib/subscriptions";

type PropertyKindValue = "LAND" | "HOUSE" | "APARTMENT";
type ListingTermValue = "SALE" | "LEASE";
type ListingStatusValue = "PENDING" | "APPROVED" | "REJECTED";

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseKind(value: unknown): PropertyKindValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "LAND" || normalized === "HOUSE" || normalized === "APARTMENT") {
    return normalized as PropertyKindValue;
  }

  return null;
}

function parseListingTerm(value: unknown): ListingTermValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "SALE" || normalized === "LEASE") {
    return normalized as ListingTermValue;
  }

  return null;
}

function parseStatus(value: unknown): ListingStatusValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "PENDING" || normalized === "APPROVED" || normalized === "REJECTED") {
    return normalized as ListingStatusValue;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get("city")?.trim();
    const ownerEmailParam = searchParams.get("ownerEmail")?.trim();
    const featuredParam = searchParams.get("featured");
    const kindParam = searchParams.get("kind");
    const listingTermParam = searchParams.get("listingTerm");
    const statusParam = searchParams.get("status");
    const includeAllParam = searchParams.get("includeAll");
    const includeArchivedParam = searchParams.get("includeArchived");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const limitParam = searchParams.get("limit");

    const sessionUser = getSessionUserFromRequest(request);
    const isAdmin = isAdminFromRequest(request);
    const requestedOwnerEmail = ownerEmailParam?.toLowerCase() ?? null;
    const sessionOwnerEmail = sessionUser?.email?.toLowerCase() ?? null;
    const ownerEmail = isAdmin
      ? requestedOwnerEmail
      : sessionOwnerEmail;

    if (includeAllParam === "true" && !sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to view private listings." },
        { status: 401 }
      );
    }

    if (includeAllParam === "true" && sessionUser && !isAdmin) {
      const compliance = await getUserComplianceStatus(sessionUser.id);
      if (compliance.blocked) {
        return NextResponse.json(
          { error: compliance.reason || "Compliance requirements must be completed." },
          { status: 403 }
        );
      }
    }

    const where: Prisma.PropertyWhereInput = {};

    if (includeArchivedParam !== "true") {
      where.isArchived = false;
    }

    if (city) {
      where.city = {
        contains: city,
        mode: "insensitive",
      };
    }

    if (ownerEmail) {
      (where as Record<string, unknown>).ownerEmail = ownerEmail;
    }

    if (featuredParam === "true") {
      where.featured = true;
      where.status = "APPROVED";
    }

    if (featuredParam === "false") {
      where.featured = false;
    }

    const kind = parseKind(kindParam);
    if (kind) {
      (where as Record<string, unknown>).kind = kind;
    }

    const listingTerm = parseListingTerm(listingTermParam);
    if (listingTerm) {
      (where as Record<string, unknown>).listingTerm = listingTerm;
    }

    const status = parseStatus(statusParam);
    if (status) {
      (where as Record<string, unknown>).status = status;
    } else if (includeAllParam !== "true") {
      (where as Record<string, unknown>).status = "APPROVED";
    } else if (!isAdmin) {
      // Non-admin includeAll is still constrained to owner scope above.
      delete (where as Record<string, unknown>).status;
    }

    const minPrice = parseNumber(minPriceParam);
    const maxPrice = parseNumber(maxPriceParam);

    if (minPrice !== null || maxPrice !== null) {
      where.price = {};

      if (minPrice !== null) {
        where.price.gte = minPrice;
      }

      if (maxPrice !== null) {
        where.price.lte = maxPrice;
      }
    }

    const parsedLimit = parseNumber(limitParam);
    const take =
      parsedLimit !== null && Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : undefined;

    const properties = await prisma.property.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json(properties);
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch properties." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "properties:create", {
      limit: 20,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many listing submissions. Please try again shortly." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
      return response;
    }

    const body = await request.json();
    const sessionUser = getSessionUserFromRequest(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to post a property." },
        { status: 401 }
      );
    }

    if (sessionUser.role !== "ADMIN") {
      const activeSubscription = await hasActiveSubscription(sessionUser.id);
      if (!activeSubscription) {
        return NextResponse.json(
          { error: "An active monthly subscription is required before posting a property." },
          { status: 402 }
        );
      }
    }

    const compliance = await getUserComplianceStatus(sessionUser.id);
    if (compliance.blocked) {
      return NextResponse.json(
        { error: compliance.reason || "Compliance requirements must be completed before posting." },
        { status: 403 }
      );
    }

    const captcha = await verifyCaptchaToken(request, typeof body.captchaToken === "string" ? body.captchaToken : null);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    const title = parseRequiredString(body.title);
    const description = parseRequiredString(body.description);
    const city = parseRequiredString(body.city);
    const address = parseRequiredString(body.address);
    const ownerEmail = sessionUser.email.toLowerCase();
    const price = parseNumber(body.price);
    const bedrooms = parseNumber(body.bedrooms);
    const bathrooms = parseNumber(body.bathrooms);
    const areaSqft = parseNumber(body.areaSqft);
    const kind = parseKind(body.kind) ?? "HOUSE";
    const listingTerm = parseListingTerm(body.listingTerm) ?? "SALE";

    if (!title || !description || !city || !address) {
      return NextResponse.json(
        { error: "title, description, city, and address are required." },
        { status: 400 }
      );
    }

    if (
      price === null ||
      bedrooms === null ||
      bathrooms === null ||
      areaSqft === null
    ) {
      return NextResponse.json(
        {
          error:
            "price, bedrooms, bathrooms, and areaSqft must be valid numbers.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(price) || price <= 0) {
      return NextResponse.json(
        { error: "price must be a positive integer." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(bedrooms) || bedrooms < 0) {
      return NextResponse.json(
        { error: "bedrooms must be a non-negative integer." },
        { status: 400 }
      );
    }

    if (bathrooms < 0) {
      return NextResponse.json(
        { error: "bathrooms must be zero or greater." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(areaSqft) || areaSqft <= 0) {
      return NextResponse.json(
        { error: "areaSqft must be a positive integer." },
        { status: 400 }
      );
    }

    const imageUrl = parseRequiredString(body.imageUrl);
    const galleryUrls = Array.isArray(body.galleryUrls)
      ? body.galleryUrls
          .map((value: unknown) => parseRequiredString(value))
          .filter((value: string | null): value is string => Boolean(value))
      : [];
    const featured =
      body.featured === true ||
      body.featured === "true" ||
      body.featured === 1 ||
      body.featured === "1";

    const createData: Record<string, unknown> = {
        title,
        description,
        city,
        address,
        ownerEmail,
        kind,
        listingTerm,
        status: "PENDING",
        price,
        bedrooms,
        bathrooms,
        areaSqft,
        imageUrl,
        featured,
      };

    const property = await prisma.property.create({
      data: createData as never,
      include: {
        images: true,
      },
    });

    if (galleryUrls.length > 0) {
      await prisma.propertyImage.createMany({
        data: galleryUrls.map((url: string, index: number) => ({
          propertyId: property.id,
          imageUrl: url,
          sortOrder: index,
        })),
      });

      const withImages = await prisma.property.findUnique({
        where: { id: property.id },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return NextResponse.json(withImages, { status: 201 });
    }

    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error("[properties:create] failed", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Database rejected the listing data. Please check your fields and try again." },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to create property.";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Unable to create property. ${message}`
            : "Unable to create property.",
      },
      { status: 500 }
    );
  }
}
