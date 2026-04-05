import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest, isAdminFromRequest } from "@/lib/auth";
import { sendLeadOwnerNotification } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyCaptchaToken } from "@/lib/captcha";

type LeadStatusValue = "NEW" | "CONTACTED" | "CLOSED";

function parseRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseLeadStatus(value: unknown): LeadStatusValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  if (normalized === "NEW" || normalized === "CONTACTED" || normalized === "CLOSED") {
    return normalized as LeadStatusValue;
  }

  return null;
}

function parsePositiveInt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerEmailParam = searchParams.get("ownerEmail")?.trim().toLowerCase() ?? "";
    const propertyId = searchParams.get("propertyId")?.trim() ?? "";
    const status = parseLeadStatus(searchParams.get("status"));
    const take = parsePositiveInt(searchParams.get("limit"));
    const isAdmin = isAdminFromRequest(request);
    const sessionEmail = getSessionUserFromRequest(request)?.email?.toLowerCase() ?? "";
    const ownerEmail = isAdmin ? ownerEmailParam || sessionEmail : sessionEmail;

    if (!isAdmin && !ownerEmail) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to view leads." },
        { status: 401 }
      );
    }

    const leads = await prisma.lead.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status } : {}),
        ...(isAdmin
          ? {}
          : {
              property: {
                ownerEmail,
              },
            }),
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            ownerEmail: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take ? Math.min(take, 200) : undefined,
    });

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch leads." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, "leads:submit", {
      limit: 12,
      windowMs: 60_000,
    });

    if (!rate.allowed) {
      const response = NextResponse.json(
        { error: "Too many enquiries. Please try again shortly." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
      return response;
    }

    const body = await request.json();

    const captcha = await verifyCaptchaToken(request, typeof body.captchaToken === "string" ? body.captchaToken : null);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    const propertyId = parseRequiredString(body.propertyId);
    const name = parseRequiredString(body.name);
    const email = parseRequiredString(body.email);
    const message = parseRequiredString(body.message);
    const phone = parseRequiredString(body.phone);
    const source = parseRequiredString(body.source);

    if (!propertyId || !name || !email || !message) {
      return NextResponse.json(
        { error: "propertyId, name, email, and message are required." },
        { status: 400 }
      );
    }

    const propertyExists = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerEmail: true, title: true, city: true },
    });

    if (!propertyExists) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        propertyId,
        name,
        email,
        phone,
        message: source ? `${message}\n\n[Source: ${source}]` : message,
        status: "NEW",
      },
    });

    try {
      await sendLeadOwnerNotification({
        ownerEmail: propertyExists.ownerEmail,
        propertyTitle: propertyExists.title,
        city: propertyExists.city,
        leadName: name,
        leadEmail: email,
        leadPhone: phone,
        leadMessage: message,
      });
    } catch (error) {
      console.error("Unable to send lead notification email", error);
    }

    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to submit lead." },
      { status: 500 }
    );
  }
}
