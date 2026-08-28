import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { expiresAt } = await request.json();
    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (agreement.status === "SIGNED") return jsonError("ALREADY_SIGNED", "Signed agreements stay locked.", 409);

    const next = new Date(expiresAt);
    await prisma.agreement.update({
      where: { id },
      data: {
        expiresAt: next,
        reminder3dSentAt: null,
        reminder1dSentAt: null,
        reminderExpiredSentAt: null,
        status: agreement.status === "EXPIRED" ? "SENT" : agreement.status,
      },
    });
    await writeAudit({
      eventType: "EXPIRY_EXTENDED",
      userId: admin.id,
      agreementId: id,
      metadata: { expiresAt: next.toISOString() },
    });
    return jsonOk({ expiresAt: next });
  } catch (error) {
    return handleRouteError(error);
  }
}
