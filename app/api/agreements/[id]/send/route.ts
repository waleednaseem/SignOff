import { prisma } from "@/lib/db";
import { getClientIp, handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { createAccessToken, revokeAgreementTokens } from "@/lib/tokens";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";
import { notifyUsers } from "@/lib/notify";
import { serialize } from "@/lib/serializers";
import { agreementDetailInclude } from "@/lib/versioning";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: { client: true, currentVersion: true },
    });
    if (!agreement?.currentVersion) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (agreement.status === "SIGNED") return jsonError("ALREADY_SIGNED", "Already signed.", 409);
    if (!agreement.currentVersion.projectTitle) {
      return jsonError("MISSING_FIELDS", "Add a project title before sending.", 400);
    }

    await revokeAgreementTokens(id);
    const expiresAt = agreement.expiresAt ?? new Date(Date.now() + 14 * 86400000);
    const token = await createAccessToken(id, expiresAt);
    const nextStatus = agreement.status === "REVISION_IN_PROGRESS" ? "AWAITING_APPROVAL" : "SENT";

    await prisma.agreement.update({
      where: { id },
      data: { status: nextStatus, expiresAt },
    });
    await prisma.agreementVersion.update({
      where: { id: agreement.currentVersion.id },
      data: { status: nextStatus },
    });

    const link = `${process.env.APP_URL ?? new URL(request.url).origin}/agreement/a/${token}`;
    await writeAudit({
      eventType: "AGREEMENT_SENT",
      userId: admin.id,
      clientId: agreement.clientId,
      agreementId: id,
      versionId: agreement.currentVersion.id,
      ipAddress: getClientIp(request),
      metadata: { linkGenerated: true },
    });
    await writeAudit({
      eventType: "LINK_GENERATED",
      userId: admin.id,
      agreementId: id,
      versionId: agreement.currentVersion.id,
    });

    await sendTemplatedEmail(agreement.client.email, EMAIL_TEMPLATES.agreementReceived(agreement.number, link));
    if (agreement.client.userId) {
      await notifyUsers({
        userIds: [agreement.client.userId],
        type: "AGREEMENT_SENT",
        title: `Agreement ${agreement.number} received`,
        message: "A new agreement is ready for review.",
        link: `/agreements/${id}`,
        agreementId: id,
      });
    }

    const full = await prisma.agreement.findUnique({ where: { id }, include: agreementDetailInclude });
    return jsonOk({ agreement: serialize(full, true), link });
  } catch (error) {
    return handleRouteError(error);
  }
}
