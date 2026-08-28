import { prisma } from "@/lib/db";
import { getClientIp, handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const agreement = await prisma.agreement.findUnique({ where: { id }, include: { client: true } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You cannot approve this agreement.", 403);
    }
    if (agreement.status === "SIGNED") return jsonError("ALREADY_SIGNED", "Already signed.", 409);
    await prisma.agreement.update({ where: { id }, data: { status: "AWAITING_SIGNATURE" } });
    await writeAudit({
      eventType: "APPROVAL_SUBMITTED",
      userId: user.id,
      agreementId: id,
      versionId: agreement.currentVersionId,
      ipAddress: getClientIp(request),
    });
    return jsonOk({ status: "AWAITING_SIGNATURE" });
  } catch (error) {
    return handleRouteError(error);
  }
}
