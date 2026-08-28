import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  eventType: string;
  userId?: string | null;
  clientId?: string | null;
  agreementId?: string | null;
  versionId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      userId: input.userId ?? undefined,
      clientId: input.clientId ?? undefined,
      agreementId: input.agreementId ?? undefined,
      versionId: input.versionId ?? undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}
