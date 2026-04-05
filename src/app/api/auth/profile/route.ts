import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getAuthCookieName,
  getSessionTtlSeconds,
  getSessionUserFromRequest,
} from "@/lib/auth";

function parseString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim();
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = getSessionUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const nameProvided = Object.prototype.hasOwnProperty.call(body, "name");
    const rawName = parseString(body.name);
    const profileImageUrlProvided = Object.prototype.hasOwnProperty.call(body, "profileImageUrl");
    const profileImageUrl = parseString(body.profileImageUrl);
    const kycDocumentUrlProvided = Object.prototype.hasOwnProperty.call(body, "kycDocumentUrl");
    const kycDocumentUrl = parseString(body.kycDocumentUrl);

    const currentPassword = parseString(body.currentPassword);
    const newPassword = parseString(body.newPassword);

    const wantsPasswordChange = Boolean(currentPassword || newPassword);

    if (!nameProvided && !wantsPasswordChange && !profileImageUrlProvided && !kycDocumentUrlProvided) {
      return NextResponse.json(
        { error: "No profile updates were provided." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const data: {
      name?: string | null;
      passwordHash?: string;
      profileImageUrl?: string | null;
      kycDocumentUrl?: string | null;
      kycStatus?: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
      kycSubmittedAt?: Date | null;
    } = {};

    if (nameProvided) {
      data.name = rawName && rawName.length > 0 ? rawName : null;
    }

    if (profileImageUrlProvided) {
      data.profileImageUrl = profileImageUrl && profileImageUrl.length > 0 ? profileImageUrl : null;
    }

    if (kycDocumentUrlProvided) {
      if (kycDocumentUrl && kycDocumentUrl.length > 0) {
        data.kycDocumentUrl = kycDocumentUrl;
        data.kycStatus = "PENDING";
        data.kycSubmittedAt = new Date();
      } else {
        data.kycDocumentUrl = null;
        data.kycStatus = "NOT_SUBMITTED";
        data.kycSubmittedAt = null;
      }
    }

    if (wantsPasswordChange) {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "currentPassword and newPassword are required to change password." },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 }
        );
      }

      const validPassword = await bcrypt.compare(currentPassword, existingUser.passwordHash);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 }
        );
      }

      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImageUrl: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
      },
    } as unknown as Parameters<typeof prisma.user.update>[0]);

    const token = createSessionToken(updatedUser);
    const response = NextResponse.json({ user: updatedUser });

    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // No maxAge — session cookie is cleared when browser closes
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
