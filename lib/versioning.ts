import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { LOCKED_STATUSES } from "@/lib/status";
import { attachVersionChildren } from "@/lib/version-children";

const versionInclude = {
  requirements: { orderBy: { order: "asc" as const } },
  priceItems: { orderBy: { order: "asc" as const } },
  milestones: { orderBy: { order: "asc" as const } },
  terms: { orderBy: { order: "asc" as const } },
} satisfies Prisma.AgreementVersionInclude;

export async function cloneVersion(input: {
  agreementId: string;
  fromVersionId: string;
  createdById: string;
  reasonForChange?: string;
  changesSummary?: string;
  userId?: string;
}) {
  const agreement = await prisma.agreement.findUnique({ where: { id: input.agreementId } });
  if (!agreement) throw new Error("Agreement not found");
  if (LOCKED_STATUSES.includes(agreement.status)) {
    throw new Error("Signed or cancelled agreements cannot be versioned this way");
  }

  const source = await prisma.agreementVersion.findUnique({
    where: { id: input.fromVersionId },
    include: versionInclude,
  });
  if (!source) throw new Error("Version not found");

  const latest = await prisma.agreementVersion.findFirst({
    where: { agreementId: input.agreementId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  const created = await prisma.agreementVersion.create({
    data: {
      agreementId: input.agreementId,
      versionNumber,
      createdById: input.createdById,
      reasonForChange: input.reasonForChange,
      changesSummary: input.changesSummary,
      previousVersionId: source.id,
      status: "REVISION_IN_PROGRESS",
      projectTitle: source.projectTitle,
      shortDescription: source.shortDescription,
      detailedDescription: source.detailedDescription,
      objectives: source.objectives,
      startDate: source.startDate,
      estimatedCompletion: source.estimatedCompletion,
      timelineDisclaimer: source.timelineDisclaimer,
      currency: source.currency,
      discountAmount: source.discountAmount,
      taxPercent: source.taxPercent,
    },
  });

  await attachVersionChildren(created.id, {
    requirements: source.requirements.map((item) => ({
      order: item.order,
      title: item.title,
      description: item.description,
      category: item.category,
      inclusion: item.inclusion,
      estimatedEffort: item.estimatedEffort,
      notes: item.notes,
    })),
    priceItems: source.priceItems.map((item) => ({
      order: item.order,
      label: item.label,
      amount: item.amount,
      type: item.type,
    })),
    milestones: source.milestones.map((item) => ({
      order: item.order,
      name: item.name,
      description: item.description,
      dueDate: item.dueDate,
      amount: item.amount,
      deliverables: item.deliverables,
    })),
    terms: source.terms.map((item) => ({
      order: item.order,
      key: item.key,
      title: item.title,
      content: item.content,
    })),
  });

  await prisma.agreement.update({
    where: { id: input.agreementId },
    data: {
      currentVersionId: created.id,
      status: "REVISION_IN_PROGRESS",
    },
  });

  await writeAudit({
    eventType: "VERSION_CREATED",
    userId: input.userId ?? input.createdById,
    agreementId: input.agreementId,
    versionId: created.id,
    metadata: { fromVersion: source.versionNumber, toVersion: versionNumber },
  });

  return created;
}

export const agreementDetailInclude = {
  client: true,
  project: { include: { client: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  currentVersion: {
    include: {
      ...versionInclude,
      createdBy: { select: { id: true, name: true, email: true } },
      signatures: true,
    },
  },
  tokens: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } },
} satisfies Prisma.AgreementInclude;
