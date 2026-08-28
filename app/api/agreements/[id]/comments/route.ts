import { prisma } from "@/lib/db";
import { getClientIp, handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { commentSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notify";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const comments = await prisma.agreementComment.findMany({
      where: { agreementId: id, parentId: null },
      include: { replies: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(comments);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = commentSchema.parse(await request.json());
    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);

    const comment = await prisma.agreementComment.create({
      data: {
        agreementId: id,
        versionId: agreement.currentVersionId,
        requirementId: body.requirementId,
        parentId: body.parentId,
        authorId: user.id,
        authorName: user.name ?? "User",
        authorEmail: user.email,
        text: body.text,
      },
    });
    await writeAudit({
      eventType: "COMMENT_ADDED",
      userId: user.id,
      agreementId: id,
      versionId: agreement.currentVersionId,
      ipAddress: getClientIp(request),
      metadata: { requirementId: body.requirementId },
    });
    if (user.role === "CLIENT") {
      await notifyAdmins({
        type: "COMMENT",
        title: `New comment on ${agreement.number}`,
        message: body.text.slice(0, 140),
        link: `/agreements/${id}`,
        agreementId: id,
      });
    }
    return jsonOk(comment, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
