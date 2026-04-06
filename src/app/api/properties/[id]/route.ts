import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { sendModerationOwnerNotification } from "@/lib/notifications";
import { logAdminAction } from "@/lib/audit";
import { getUserComplianceStatus } from "@/lib/compliance";

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

function parseOptionalString(value: unknown) {
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

function sessionEmail(request: NextRequest) {
  return getSessionUserFromRequest(request)?.email?.toLowerCase() ?? null;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const isAdmin = isAdminFromRequest(request);
    const owner = sessionEmail(request);

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (property.isArchived && !isAdmin && owner !== property.ownerEmail.toLowerCase()) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch property." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const existingProperty = await prisma.property.findUnique({ where: { id } });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const isAdmin = isAdminFromRequest(request);
    const owner = sessionEmail(request);

    if (!isAdmin && (!owner || owner !== existingProperty.ownerEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "Unauthorized. Only the owner or admin can update this listing." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      const sessionUser = getSessionUserFromRequest(request);
      if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const compliance = await getUserComplianceStatus(sessionUser.id);
      if (compliance.blocked) {
        return NextResponse.json(
          { error: compliance.reason || "Compliance requirements must be completed." },
          { status: 403 }
        );
      }
    }

    if (existingProperty.isArchived && !isAdmin) {
      return NextResponse.json(
        { error: "Archived listings can only be edited by an admin." },
        { status: 403 }
      );
    }

    const title = parseRequiredString(body.title);
    const description = parseRequiredString(body.description);
    const city = parseRequiredString(body.city);
    const address = parseRequiredString(body.address);
    const price = parseNumber(body.price);
    const bedrooms = parseNumber(body.bedrooms);
    const bathrooms = parseNumber(body.bathrooms);
    const areaSqft = parseNumber(body.areaSqft);
    const ownerEmail = isAdmin
      ? parseRequiredString(body.ownerEmail)?.toLowerCase() ?? existingProperty.ownerEmail
      : existingProperty.ownerEmail;
    const kind = parseKind(body.kind) ?? "HOUSE";
    const listingTerm = parseListingTerm(body.listingTerm) ?? "SALE";
    const status = isAdmin
      ? parseStatus(body.status) ?? existingProperty.status
      : existingProperty.status;
    const moderationReason = isAdmin
      ? parseOptionalString(body.moderationReason)
      : null;
    const willModerate =
      isAdmin && (status !== existingProperty.status || (status === "REJECTED" && Boolean(moderationReason)));
    const galleryUrls = Array.isArray(body.galleryUrls)
      ? body.galleryUrls
          .map((value: unknown) => parseRequiredString(value))
          .filter((value: string | null): value is string => Boolean(value))
      : null;

    if (!title || !description || !city || !address || !ownerEmail) {
      return NextResponse.json(
        { error: "title, description, city, address, and ownerEmail are required." },
        { status: 400 }
      );
    }

    if (isAdmin && status === "REJECTED" && !moderationReason) {
      return NextResponse.json(
        { error: "Provide a rejection reason before rejecting a listing." },
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
    const featured =
      isAdmin && status === "REJECTED"
        ? false
        : body.featured === true ||
          body.featured === "true" ||
          body.featured === 1 ||
          body.featured === "1";

    const updateData: Record<string, unknown> = {
      title,
      description,
      city,
      address,
      ownerEmail,
      kind,
      listingTerm,
      status,
      price,
      bedrooms,
      bathrooms,
      areaSqft,
      imageUrl,
      ...(isAdmin
        ? {
            moderationReason: status === "REJECTED" ? moderationReason : null,
            moderatedByEmail: willModerate ? owner : undefined,
            moderatedAt: willModerate ? new Date() : undefined,
          }
        : {}),
      featured,
    };

    const property = await prisma.property.update({
      where: { id },
      data: updateData as never,
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Cancel active featured payments when an admin rejects a listing
    if (isAdmin && status === "REJECTED" && existingProperty.featured) {
      await prisma.featuredPayment.updateMany({
        where: {
          propertyId: id,
          status: { in: ["PENDING", "PAID"] },
        },
        data: { status: "CANCELLED" },
      });
    }

    if (isAdmin && status !== existingProperty.status && (status === "APPROVED" || status === "REJECTED")) {
      try {
        await sendModerationOwnerNotification({
          ownerEmail: property.ownerEmail,
          propertyTitle: property.title,
          city: property.city,
          status,
          moderatedByEmail: owner,
          reason: status === "REJECTED" ? moderationReason : null,
        });
      } catch (error) {
        console.error("Unable to send moderation notification email", error);
      }

      if (owner) {
        await logAdminAction({
          adminEmail: owner,
          action: status === "APPROVED" ? "approved_property" : "rejected_property",
          entityType: "PROPERTY",
          entityId: property.id,
          metadata: {
            title: property.title,
            reason: status === "REJECTED" ? moderationReason : null,
          },
        });
      }
    }

    if (galleryUrls) {
      await prisma.propertyImage.deleteMany({ where: { propertyId: id } });

      if (galleryUrls.length > 0) {
        await prisma.propertyImage.createMany({
          data: galleryUrls.map((url: string, index: number) => ({
            propertyId: id,
            imageUrl: url,
            sortOrder: index,
          })),
        });
      }

      const withImages = await prisma.property.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return NextResponse.json(withImages);
    }

    return NextResponse.json(property);
  } catch {
    return NextResponse.json(
      { error: "Unable to update property." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existingProperty = await prisma.property.findUnique({ where: { id } });

    if (!existingProperty) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const isAdmin = isAdminFromRequest(request);
    const owner = sessionEmail(request);

    if (!isAdmin && (!owner || owner !== existingProperty.ownerEmail.toLowerCase())) {
      return NextResponse.json(
        { error: "Unauthorized. Only the owner or admin can delete this listing." },
        { status: 403 }
      );
    }

    if (!isAdmin) {
      const sessionUser = getSessionUserFromRequest(request);
      if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const compliance = await getUserComplianceStatus(sessionUser.id);
      if (compliance.blocked) {
        return NextResponse.json(
          { error: compliance.reason || "Compliance requirements must be completed." },
          { status: 403 }
        );
      }
    }

    const archivedByEmail = isAdmin ? owner : existingProperty.ownerEmail.toLowerCase();

    await prisma.property.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedByEmail,
      },
    });

    if (isAdmin && owner) {
      await logAdminAction({
        adminEmail: owner,
        action: "archived_property",
        entityType: "PROPERTY",
        entityId: id,
        metadata: {
          title: existingProperty.title,
          ownerEmail: existingProperty.ownerEmail,
        },
      });
    }

    return NextResponse.json({ success: true, archived: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete property." },
      { status: 500 }
    );
  }
}
