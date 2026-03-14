import { prisma } from "@/lib/prisma";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function hasActiveSubscription(userId: string) {
  const now = new Date();

  const active = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      expiresAt: "desc",
    },
    select: {
      id: true,
      expiresAt: true,
      status: true,
    },
  });

  return active;
}

export async function activateSubscriptionByReference(reference: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS);

  const subscription = await prisma.subscription.update({
    where: { reference },
    data: {
      status: "ACTIVE",
      startsAt: now,
      expiresAt,
      paidAt: now,
    },
  });

  // Expire any other older active plans for this user to avoid overlapping active states.
  await prisma.subscription.updateMany({
    where: {
      userId: subscription.userId,
      id: { not: subscription.id },
      status: "ACTIVE",
    },
    data: {
      status: "EXPIRED",
    },
  });

  return subscription;
}
