import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { nextNumber } from "@/lib/numbers";
import { cloneVersion } from "@/lib/versioning";
import { writeAudit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const source = await prisma.agreement.findUnique({ where: { id } });
    if (!source?.currentVersionId) return jsonError("NOT_FOUND", "Agreement not found.", 404);

    const number = await nextNumber("AG");
    const copy = await prisma.agreement.create({
      data: {
        number,
        projectId: source.projectId,
        clientId: source.clientId,
        createdById: admin.id,
        status: "DRAFT",
        expiresAt: source.expiresAt,
      },
    });
    const version = await prisma.agreementVersion.findUnique({ where: { id: source.currentVersionId } });
    if (!version) return jsonError("NOT_FOUND", "Version not found.", 404);

    const cloned = await cloneVersion({
      agreementId: copy.id,
      fromVersionId: source.currentVersionId,
      createdById: admin.id,
      reasonForChange: "Duplicated agreement",
      userId: admin.id,
    });
    await prisma.agreement.update({
      where: { id: copy.id },
      data: { currentVersionId: cloned.id, status: "DRAFT" },
    });
    await prisma.agreementVersion.update({
      where: { id: cloned.id },
      data: { status: "DRAFT", versionNumber: 1, previousVersionId: null },
    });
    await writeAudit({
      eventType: "AGREEMENT_CREATED",
      userId: admin.id,
      agreementId: copy.id,
      metadata: { duplicatedFrom: source.number },
    });
    return jsonOk({ id: copy.id, number }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
