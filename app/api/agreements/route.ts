import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { createAgreement } from "@/lib/agreements";
import { agreementDetailInclude } from "@/lib/versioning";
import { computePricing } from "@/lib/agreement-public";
import { serialize } from "@/lib/serializers";
import { z } from "zod";
import { notDeleted, withNotDeleted } from "@/lib/soft-delete";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");

    const client = user.role === "CLIENT"
      ? await prisma.client.findFirst({ where: { userId: user.id, ...notDeleted } })
      : null;

    if (user.role === "CLIENT" && (!client || status === "DRAFT")) {
      return jsonOk([]);
    }

    const statusFilter =
      user.role === "CLIENT" && (!status || status === "ALL")
        ? { not: "DRAFT" as const }
        : status && status !== "ALL"
          ? (status as never)
          : undefined;

    const agreements = await prisma.agreement.findMany({
      where: withNotDeleted({
        clientId: user.role === "CLIENT" ? client?.id : clientId || undefined,
        projectId: projectId || undefined,
        status: statusFilter,
        OR: q
          ? [
              { number: { contains: q } },
              { project: { name: { contains: q } } },
              { client: { fullName: { contains: q } } },
              { client: { company: { contains: q } } },
            ]
          : undefined,
      }),
      include: {
        client: true,
        project: true,
        currentVersion: { include: { priceItems: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk(
      agreements.map((item) => ({
        ...item,
        internalNotes: user.role === "ADMIN" ? item.internalNotes : undefined,
        pricing: item.currentVersion
          ? computePricing(
              item.currentVersion.priceItems,
              item.currentVersion.discountAmount,
              item.currentVersion.taxPercent,
            )
          : null,
        currentVersion: item.currentVersion
          ? {
              id: item.currentVersion.id,
              versionNumber: item.currentVersion.versionNumber,
              projectTitle: item.currentVersion.projectTitle,
              currency: item.currentVersion.currency,
            }
          : null,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

const createSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1),
  templateId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await request.json());
    const created = await createAgreement({ ...body, createdById: admin.id });
    const agreement = await prisma.agreement.findUnique({
      where: { id: created.id },
      include: agreementDetailInclude,
    });
    return jsonOk(serialize(agreement, true), 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
