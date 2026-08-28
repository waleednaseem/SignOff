import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextNumber } from "@/lib/numbers";
import { DEFAULT_TERMS, DEFAULT_TIMELINE_DISCLAIMER } from "@/lib/terms";
import { writeAudit } from "@/lib/audit";
import { cloneVersion } from "@/lib/versioning";
import { attachVersionChildren } from "@/lib/version-children";
import { EDITABLE_IN_PLACE, LOCKED_STATUSES } from "@/lib/status";
import type { z } from "zod";
import type { agreementDraftSchema } from "@/lib/validators";
import { notDeleted } from "@/lib/soft-delete";

type DraftInput = z.infer<typeof agreementDraftSchema>;

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createAgreement(input: {
  clientId: string;
  projectId: string;
  createdById: string;
  templateId?: string | null;
  expiresAt?: string | null;
}) {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, clientId: input.clientId, ...notDeleted },
  });
  if (!project) throw new Error("Project not found for this client");

  const template = input.templateId
    ? await prisma.agreementTemplate.findFirst({
        where: { id: input.templateId, ...notDeleted },
        include: {
          requirements: { orderBy: { order: "asc" } },
          priceItems: { orderBy: { order: "asc" } },
          milestones: { orderBy: { order: "asc" } },
          terms: { orderBy: { order: "asc" } },
        },
      })
    : null;

  const number = await nextNumber("AG");
  const agreement = await prisma.agreement.create({
    data: {
      number,
      clientId: input.clientId,
      projectId: input.projectId,
      createdById: input.createdById,
      expiresAt: parseDate(input.expiresAt),
      status: "DRAFT",
    },
  });

  const version = await prisma.agreementVersion.create({
    data: {
      agreementId: agreement.id,
      versionNumber: 1,
      createdById: input.createdById,
      status: "DRAFT",
      projectTitle: project.name,
      timelineDisclaimer: DEFAULT_TIMELINE_DISCLAIMER,
    },
  });

  await attachVersionChildren(version.id, {
    requirements: template?.requirements.map((item) => ({
      order: item.order,
      title: item.title,
      description: item.description,
      category: item.category,
      inclusion: item.inclusion,
      estimatedEffort: item.estimatedEffort,
      notes: item.notes,
    })),
    priceItems: template?.priceItems.map((item) => ({
      order: item.order,
      label: item.label,
      amount: item.amount,
      type: item.type,
    })),
    milestones: template?.milestones.map((item) => ({
      order: item.order,
      name: item.name,
      description: item.description,
      amount: item.amount,
      deliverables: item.deliverables,
    })),
    terms: (template?.terms.length ? template.terms : DEFAULT_TERMS).map((term, order) => ({
      order,
      key: term.key,
      title: term.title,
      content: term.content,
    })),
  });

  const updated = await prisma.agreement.update({
    where: { id: agreement.id },
    data: { currentVersionId: version.id },
  });

  await writeAudit({
    eventType: "AGREEMENT_CREATED",
    userId: input.createdById,
    clientId: input.clientId,
    agreementId: agreement.id,
    versionId: version.id,
    metadata: { number, templateId: input.templateId ?? null },
  });

  return updated;
}

export async function saveAgreementDraft(
  agreementId: string,
  userId: string,
  input: DraftInput,
  options?: { forceNewVersion?: boolean },
) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { currentVersion: true },
  });
  if (!agreement || !agreement.currentVersion) throw new Error("Agreement not found");
  if (LOCKED_STATUSES.includes(agreement.status)) {
    throw new Error("Signed agreements cannot be edited");
  }

  let versionId = agreement.currentVersionId!;
  if (!EDITABLE_IN_PLACE.includes(agreement.status) || options?.forceNewVersion) {
    const cloned = await cloneVersion({
      agreementId,
      fromVersionId: versionId,
      createdById: userId,
      reasonForChange: input.reasonForChange,
      changesSummary: input.changesSummary,
      userId,
    });
    versionId = cloned.id;
  }

  const data: Prisma.AgreementVersionUpdateInput = {
    projectTitle: input.projectTitle ?? undefined,
    shortDescription: input.shortDescription,
    detailedDescription: input.detailedDescription,
    objectives: input.objectives,
    startDate: parseDate(input.startDate ?? null),
    estimatedCompletion: parseDate(input.estimatedCompletion ?? null),
    timelineDisclaimer: input.timelineDisclaimer,
    currency: input.currency,
    discountAmount: input.discountAmount,
    taxPercent: input.taxPercent,
  };

  await prisma.agreementVersion.update({ where: { id: versionId }, data });

  if (input.requirements) {
    await prisma.requirement.deleteMany({ where: { versionId } });
    if (input.requirements.length) {
      await prisma.requirement.createMany({
        data: input.requirements.map((item, order) => ({
          versionId,
          order,
          title: item.title,
          description: item.description,
          category: item.category,
          inclusion: item.inclusion,
          estimatedEffort: item.estimatedEffort,
          notes: item.notes,
        })),
      });
    }
  }
  if (input.priceItems) {
    await prisma.priceItem.deleteMany({ where: { versionId } });
    if (input.priceItems.length) {
      await prisma.priceItem.createMany({
        data: input.priceItems.map((item, order) => ({
          versionId,
          order,
          label: item.label,
          amount: item.amount,
          type: item.type,
        })),
      });
    }
  }
  if (input.milestones) {
    await prisma.milestone.deleteMany({ where: { versionId } });
    if (input.milestones.length) {
      await prisma.milestone.createMany({
        data: input.milestones.map((item, order) => ({
          versionId,
          order,
          name: item.name,
          description: item.description,
          dueDate: parseDate(item.dueDate ?? null),
          amount: item.amount,
          deliverables: item.deliverables,
        })),
      });
    }
  }
  if (input.terms) {
    await prisma.term.deleteMany({ where: { versionId } });
    if (input.terms.length) {
      await prisma.term.createMany({
        data: input.terms.map((item, order) => ({
          versionId,
          order,
          key: item.key,
          title: item.title,
          content: item.content,
        })),
      });
    }
  }

  await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      expiresAt: input.expiresAt !== undefined ? parseDate(input.expiresAt) : undefined,
      internalNotes: input.internalNotes === undefined ? undefined : input.internalNotes,
    },
  });

  await writeAudit({
    eventType: "AGREEMENT_EDITED",
    userId,
    agreementId,
    versionId,
  });

  return prisma.agreement.findUnique({ where: { id: agreementId } });
}
