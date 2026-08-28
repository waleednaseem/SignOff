import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { changeRequestSchema } from "@/lib/validators";
import { nextNumber } from "@/lib/numbers";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins, notifyUsers } from "@/lib/notify";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const client = user.role === "CLIENT"
      ? await prisma.client.findFirst({ where: { userId: user.id } })
      : null;

    const items = await prisma.changeRequest.findMany({
      where: {
        status: status && status !== "ALL" ? (status as never) : undefined,
        agreement: user.role === "CLIENT" ? { clientId: client?.id } : undefined,
      },
      include: { agreement: { select: { number: true, id: true } }, project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(items);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = changeRequestSchema.parse(await request.json());
    const agreement = await prisma.agreement.findUnique({
      where: { id: body.agreementId },
      include: { client: true },
    });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (agreement.status !== "SIGNED") {
      return jsonError("VALIDATION_ERROR", "Change requests can only be filed against signed agreements.", 400);
    }
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You cannot file a change request on this agreement.", 403);
    }
    const number = await nextNumber("CR");
    const cr = await prisma.changeRequest.create({
      data: {
        number,
        agreementId: agreement.id,
        projectId: agreement.projectId,
        title: body.title,
        description: body.description,
        additionalCost: body.additionalCost,
        additionalTimeDays: body.additionalTimeDays,
        createdById: user.id,
        requesterName: body.requesterName || user.name || "Client",
        requesterEmail: body.requesterEmail || user.email || agreement.client.email,
      },
    });
    await writeAudit({
      eventType: "CHANGE_REQUEST_CREATED",
      userId: user.id,
      clientId: agreement.clientId,
      agreementId: agreement.id,
      metadata: { number },
    });
    await notifyAdmins({
      type: "CHANGE_REQUEST",
      title: `Change request ${number} submitted`,
      message: cr.title,
      link: "/change-requests",
      agreementId: agreement.id,
    });
    return jsonOk(cr, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const cr = await prisma.changeRequest.update({
      where: { id: body.id },
      data: { status: body.status, adminNotes: body.adminNotes },
      include: { agreement: true },
    });
    if (body.status === "APPROVED") {
      await writeAudit({
        eventType: "CHANGE_REQUEST_APPROVED",
        userId: admin.id,
        agreementId: cr.agreementId,
        metadata: { number: cr.number },
      });
    }
    if (cr.createdById) {
      await notifyUsers({
        userIds: [cr.createdById],
        type: "CHANGE_REQUEST",
        title: `Change request ${cr.number} is ${body.status}`,
        message: "The service provider updated your change request.",
        link: "/change-requests",
        agreementId: cr.agreementId,
      });
    }
    await sendTemplatedEmail(cr.requesterEmail, EMAIL_TEMPLATES.changeRequestResponse(cr.number, body.status));
    return jsonOk(cr);
  } catch (error) {
    return handleRouteError(error);
  }
}
