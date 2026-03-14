import { AuditEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type LogAdminActionInput = {
  adminEmail: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logAdminAction(input: LogAdminActionInput) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: input.adminEmail.toLowerCase(),
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Unable to write admin audit log", error);
  }
}
