import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSessionUserFromRequest } from "@/lib/auth";

type LeadStatusValue = "NEW" | "CONTACTED" | "CLOSED";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const ownerEmail = sessionUser.email.toLowerCase();

    const properties = await prisma.property.findMany({
      where: {
        ownerEmail,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        featured: true,
        status: true,
      },
    });

    if (properties.length === 0) {
      return NextResponse.json({
        totals: {
          listings: 0,
          featuredListings: 0,
          approvedListings: 0,
          leads: 0,
          newLeads: 0,
          contactedLeads: 0,
          closedLeads: 0,
        },
        byProperty: [],
      });
    }

    const propertyIds = properties.map((property) => property.id);
    const leads = await prisma.lead.findMany({
      where: {
        propertyId: {
          in: propertyIds,
        },
      },
      select: {
        propertyId: true,
        status: true,
        createdAt: true,
      },
    });

    const perProperty = new Map<
      string,
      {
        leadCount: number;
        newLeads: number;
        contactedLeads: number;
        closedLeads: number;
        lastLeadAt: Date | null;
      }
    >();

    for (const lead of leads) {
      const status = lead.status as LeadStatusValue;
      const previous =
        perProperty.get(lead.propertyId) ??
        ({
          leadCount: 0,
          newLeads: 0,
          contactedLeads: 0,
          closedLeads: 0,
          lastLeadAt: null,
        } as const);

      const next = {
        leadCount: previous.leadCount + 1,
        newLeads: previous.newLeads + (status === "NEW" ? 1 : 0),
        contactedLeads: previous.contactedLeads + (status === "CONTACTED" ? 1 : 0),
        closedLeads: previous.closedLeads + (status === "CLOSED" ? 1 : 0),
        lastLeadAt:
          !previous.lastLeadAt || lead.createdAt > previous.lastLeadAt
            ? lead.createdAt
            : previous.lastLeadAt,
      };

      perProperty.set(lead.propertyId, next);
    }

    const byProperty = properties
      .map((property) => {
        const stats =
          perProperty.get(property.id) ?? {
            leadCount: 0,
            newLeads: 0,
            contactedLeads: 0,
            closedLeads: 0,
            lastLeadAt: null,
          };

        return {
          propertyId: property.id,
          title: property.title,
          status: property.status,
          featured: property.featured,
          createdAt: property.createdAt,
          ...stats,
        };
      })
      .sort((a, b) => b.leadCount - a.leadCount);

    const totals = byProperty.reduce(
      (acc, row) => ({
        listings: acc.listings + 1,
        featuredListings: acc.featuredListings + (row.featured ? 1 : 0),
        approvedListings: acc.approvedListings + (row.status === "APPROVED" ? 1 : 0),
        leads: acc.leads + row.leadCount,
        newLeads: acc.newLeads + row.newLeads,
        contactedLeads: acc.contactedLeads + row.contactedLeads,
        closedLeads: acc.closedLeads + row.closedLeads,
      }),
      {
        listings: 0,
        featuredListings: 0,
        approvedListings: 0,
        leads: 0,
        newLeads: 0,
        contactedLeads: 0,
        closedLeads: 0,
      }
    );

    return NextResponse.json({ totals, byProperty });
  } catch {
    return NextResponse.json({ error: "Unable to load analytics." }, { status: 500 });
  }
}
