import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { cloneVersion } from "@/lib/versioning";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const versions = await prisma.agreementVersion.findMany({
      where: { agreementId: id },
      orderBy: { versionNumber: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { requirements: true, priceItems: true } },
      },
    });
    return jsonOk(versions);
  } catch (error) {
    return handleRouteError(error);
  }
}

const schema = z.object({
  reasonForChange: z.string().optional(),
  changesSummary: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const agreement = await prisma.agreement.findUnique({ where: { id } });
    if (!agreement?.currentVersionId) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (agreement.status === "SIGNED") return jsonError("ALREADY_SIGNED", "Create a change request instead.", 409);
    const version = await cloneVersion({
      agreementId: id,
      fromVersionId: agreement.currentVersionId,
      createdById: admin.id,
      reasonForChange: body.reasonForChange,
      changesSummary: body.changesSummary,
      userId: admin.id,
    });
    return jsonOk(version, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
