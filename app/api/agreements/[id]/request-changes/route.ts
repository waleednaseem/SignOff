import { prisma } from "@/lib/db";
import { getClientIp, handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { text } = await request.json();
    const agreement = await prisma.agreement.findUnique({ where: { id }, include: { client: true } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You cannot request changes on this agreement.", 403);
    }
    if (agreement.status === "SIGNED") {
      return jsonError("ALREADY_SIGNED", "Use a change request after signing.", 409);
    }
    await prisma.agreementComment.create({
      data: {
        agreementId: id,
        versionId: agreement.currentVersionId,
        authorId: user.id,
        authorName: user.name ?? "Client",
        authorEmail: user.email,
        text: text || "Changes requested",
      },
    });
    await prisma.agreement.update({ where: { id }, data: { status: "CHANGES_REQUESTED" } });
    await writeAudit({
      eventType: "CHANGE_REQUESTED",
      userId: user.id,
      agreementId: id,
      versionId: agreement.currentVersionId,
      ipAddress: getClientIp(request),
    });
    await notifyAdmins({
      type: "CHANGES_REQUESTED",
      title: `Client has requested changes to Agreement #${agreement.number}`,
      message: text || "The client requested changes.",
      link: `/agreements/${id}`,
      agreementId: id,
    });
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await sendTemplatedEmail(admin.email, EMAIL_TEMPLATES.changesRequested(agreement.number));
    }
    return jsonOk({ status: "CHANGES_REQUESTED" });
  } catch (error) {
    return handleRouteError(error);
  }
}
