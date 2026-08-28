import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSecureToken() {
  return randomBytes(32).toString("base64url");
}

export async function createAccessToken(agreementId: string, expiresAt?: Date | null) {
  const token = generateSecureToken();
  await prisma.agreementAccessToken.create({
    data: {
      agreementId,
      tokenHash: hashToken(token),
      expiresAt: expiresAt ?? undefined,
    },
  });
  return token;
}

export async function findValidToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.agreementAccessToken.findUnique({
    where: { tokenHash },
    include: {
      agreement: {
        include: {
          client: true,
          project: true,
          currentVersion: {
            include: {
              requirements: { orderBy: { order: "asc" } },
              priceItems: { orderBy: { order: "asc" } },
              milestones: { orderBy: { order: "asc" } },
              terms: { orderBy: { order: "asc" } },
              signatures: true,
            },
          },
        },
      },
    },
  });

  if (!record) return { error: "NOT_FOUND" as const };
  if (record.revokedAt) return { error: "REVOKED" as const };
  if (record.expiresAt && record.expiresAt < new Date()) return { error: "EXPIRED" as const };
  if (record.agreement.deletedAt) return { error: "NOT_FOUND" as const };

  await prisma.agreementAccessToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { record };
}

export async function revokeAgreementTokens(agreementId: string) {
  await prisma.agreementAccessToken.updateMany({
    where: { agreementId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
