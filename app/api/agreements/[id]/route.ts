import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { agreementDraftSchema } from "@/lib/validators";
import { saveAgreementDraft } from "@/lib/agreements";
import { agreementDetailInclude } from "@/lib/versioning";
import { serialize } from "@/lib/serializers";
import { LOCKED_STATUSES } from "@/lib/status";
import { notDeleted } from "@/lib/soft-delete";

async function loadAgreement(id: string, userId: string, role: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id, ...notDeleted },
    include: agreementDetailInclude,
  });
  if (!agreement) return { error: jsonError("NOT_FOUND", "Agreement not found.", 404) };
  if (role === "CLIENT" && agreement.client.userId !== userId) {
    return { error: jsonError("FORBIDDEN", "You do not have access to this agreement.", 403) };
  }
  if (role === "CLIENT" && agreement.status === "DRAFT") {
    return { error: jsonError("FORBIDDEN", "This agreement is not ready for review yet.", 403) };
  }
  return { agreement };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await loadAgreement(id, user.id, user.role);
    if ("error" in result && result.error) return result.error;
    return jsonOk(serialize(result.agreement, user.role === "ADMIN"));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const existing = await prisma.agreement.findUnique({ where: { id } });
    if (!existing) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (LOCKED_STATUSES.includes(existing.status)) {
      return jsonError("ALREADY_SIGNED", "Signed agreements cannot be edited.", 409);
    }
    const body = agreementDraftSchema.parse(await request.json());
    await saveAgreementDraft(id, admin.id, body);
    const agreement = await prisma.agreement.findUnique({ where: { id }, include: agreementDetailInclude });
    return jsonOk(serialize(agreement, true));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (agreement.status === "SIGNED") {
      return jsonError("ALREADY_SIGNED", "Signed agreements cannot be deleted.", 409);
    }
    await prisma.agreement.update({ where: { id }, data: { deletedAt: new Date(), status: "CANCELLED" } });
    return jsonOk({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
