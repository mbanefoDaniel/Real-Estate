import { prisma } from "@/lib/prisma";
import { sendFeaturedPaymentStatusNotification } from "@/lib/notifications";

type MutablePaymentStatus = "PAID" | "FAILED" | "CANCELLED";

export async function applyFeaturedPaymentStatus(reference: string, nextStatus: MutablePaymentStatus) {
  const payment = await prisma.featuredPayment.findUnique({
    where: { reference },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
    },
  });

  if (!payment) {
    return { found: false as const };
  }

  if (payment.status === nextStatus) {
    return { found: true as const, changed: false as const, payment };
  }

  if (nextStatus === "PAID") {
    await prisma.$transaction([
      prisma.featuredPayment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: payment.paidAt ?? new Date(),
        },
      }),
      prisma.property.update({
        where: { id: payment.propertyId },
        data: { featured: true },
      }),
    ]);
  } else {
    await prisma.featuredPayment.update({
      where: { id: payment.id },
      data: { status: nextStatus },
    });
  }

  try {
    await sendFeaturedPaymentStatusNotification({
      ownerEmail: payment.ownerEmail,
      propertyTitle: payment.property.title,
      city: payment.property.city,
      reference: payment.reference,
      amountKobo: payment.amount,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Unable to send featured payment notification", error);
  }

  return { found: true as const, changed: true as const, payment };
}
