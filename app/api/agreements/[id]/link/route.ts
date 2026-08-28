import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createAccessToken, revokeAgreementTokens } from "@/lib/tokens";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);

    await revokeAgreementTokens(id);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : agreement.expiresAt;
    const token = await createAccessToken(id, expiresAt);
    const link = `${process.env.APP_URL ?? new URL(request.url).origin}/agreement/a/${token}`;

    await writeAudit({
      eventType: "LINK_GENERATED",
      userId: admin.id,
      agreementId: id,
      metadata: { regenerated: true },
    });
    return jsonOk({ link, expiresAt });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await revokeAgreementTokens(id);
    await writeAudit({ eventType: "TOKEN_REVOKED", userId: admin.id, agreementId: id });
    return jsonOk({ revoked: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
