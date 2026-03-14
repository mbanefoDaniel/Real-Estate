import { prisma } from "@/lib/prisma";

type ComplianceCheckResult = {
  blocked: boolean;
  reason?: string;
  deadline?: Date;
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export async function getUserComplianceStatus(userId: string): Promise<ComplianceCheckResult> {
  const user = (await prisma.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      profileImageUrl: true,
      kycStatus: true,
    },
  } as unknown as Parameters<typeof prisma.user.findUnique>[0])) as {
    createdAt: Date;
    profileImageUrl: string | null;
    kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED" | null;
  } | null;

  if (!user) {
    return {
      blocked: true,
      reason: "User not found.",
    };
  }

  const deadline = new Date(user.createdAt.getTime() + TWO_DAYS_MS);
  if (Date.now() < deadline.getTime()) {
    return { blocked: false, deadline };
  }

  const hasProfileImage = Boolean(user.profileImageUrl?.trim());
  const kycVerified = user.kycStatus === "VERIFIED";

  if (hasProfileImage && kycVerified) {
    return { blocked: false, deadline };
  }

  const missing: string[] = [];
  if (!hasProfileImage) {
    missing.push("profile picture");
  }
  if (!kycVerified) {
    missing.push("KYC verification");
  }

  return {
    blocked: true,
    reason: `Profile compliance required: complete ${missing.join(" and ")}.`,
    deadline,
  };
}
