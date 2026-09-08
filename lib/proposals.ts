import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { attachVersionChildren } from "@/lib/version-children";
import { computePricing } from "@/lib/agreement-public";
import { nextNumber } from "@/lib/numbers";
import { createAccessToken, revokeAgreementTokens } from "@/lib/tokens";
import { notifyAdmins, notifyUsers } from "@/lib/notify";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";
import { notDeleted } from "@/lib/soft-delete";
import { toNumber } from "@/lib/utils";
import { jsonError } from "@/lib/api";
import { SIGNABLE_STATUSES } from "@/lib/status";
import type { z } from "zod";
import type { proposalDraftSchema } from "@/lib/validators";

const versionChildrenInclude = {
  requirements: { orderBy: { order: "asc" as const } },
  priceItems: { orderBy: { order: "asc" as const } },
  milestones: { orderBy: { order: "asc" as const } },
  terms: { orderBy: { order: "asc" as const } },
} satisfies Prisma.AgreementVersionInclude;

export const proposalDetailInclude = {
  ...versionChildrenInclude,
  createdBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AgreementVersionInclude;

type DraftInput = z.infer<typeof proposalDraftSchema>;

export function handleProposalError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const status = Number((error as { status: number }).status);
    const code = status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : "VALIDATION_ERROR";
    return jsonError(code, error.message, status);
  }
  return null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start?: Date | null, end?: Date | null) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

export function serializeProposal(version: any) {
  return {
    ...version,
    discountAmount: toNumber(version.discountAmount),
    taxPercent: toNumber(version.taxPercent),
    priceItems: version.priceItems?.map((item: any) => ({ ...item, amount: toNumber(item.amount) })),
    milestones: version.milestones?.map((item: any) => ({ ...item, amount: toNumber(item.amount) })),
    pricing: computePricing(version.priceItems ?? [], version.discountAmount, version.taxPercent),
  };
}

export async function loadOwnedAgreement(agreementId: string, userId: string, role: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: { client: true, currentVersion: true },
  });
  if (!agreement) return null;
  if (role === "CLIENT" && agreement.client.userId !== userId) return null;
  return agreement;
}

export async function createOrResumeProposal(agreementId: string, userId: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: { client: true, currentVersion: { include: versionChildrenInclude } },
  });
  if (!agreement?.currentVersion) throw Object.assign(new Error("Agreement not found"), { status: 404 });
  if (agreement.client.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (agreement.status === "DRAFT" || agreement.status === "CANCELLED" || agreement.status === "COMPLETED") {
    throw Object.assign(new Error("This agreement cannot be negotiated yet."), { status: 409 });
  }
  if (agreement.status === "DELIVERY_REVIEW") {
    throw Object.assign(new Error("Accept or finish delivery review before negotiating again."), { status: 409 });
  }

  const open = await prisma.agreementVersion.findFirst({
    where: {
      agreementId,
      kind: "PROPOSAL",
      createdById: userId,
      proposalStatus: { in: ["DRAFT_PROPOSAL", "SUBMITTED"] },
    },
    include: proposalDetailInclude,
    orderBy: { createdAt: "desc" },
  });
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'A',location:'lib/proposals.ts:createOrResumeProposal',message:'resume-or-create',data:{agreementId,agreementStatus:agreement.status,openId:open?.id??null,openStatus:open?.proposalStatus??null,currentVersionId:agreement.currentVersionId,milestoneCount:agreement.currentVersion.milestones?.length??0},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (open) return open;

  const source = agreement.currentVersion;
  const latest = await prisma.agreementVersion.findFirst({
    where: { agreementId },
    orderBy: { versionNumber: "desc" },
  });
  let versionNumber = (latest?.versionNumber ?? 0) + 1;
  let created;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      created = await prisma.agreementVersion.create({
        data: {
          agreementId,
          versionNumber: versionNumber + attempt,
          createdById: userId,
          previousVersionId: source.id,
          status: agreement.status,
          kind: "PROPOSAL",
          proposalStatus: "DRAFT_PROPOSAL",
          reasonForChange: agreement.status === "SIGNED" ? "Additional work" : "Client negotiation",
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
      break;
    } catch (error) {
      const resumed = await prisma.agreementVersion.findFirst({
        where: {
          agreementId,
          kind: "PROPOSAL",
          createdById: userId,
          proposalStatus: { in: ["DRAFT_PROPOSAL", "SUBMITTED"] },
        },
        include: proposalDetailInclude,
        orderBy: { createdAt: "desc" },
      });
      if (resumed) return resumed;
      if (typeof error === "object" && error && "code" in error && error.code !== "P2002") throw error;
      if (attempt === 5) throw error;
    }
  }
  if (!created) throw Object.assign(new Error("Could not create proposal"), { status: 409 });

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

  return prisma.agreementVersion.findUniqueOrThrow({
    where: { id: created.id },
    include: proposalDetailInclude,
  });
}

export async function listProposals(agreementId: string, userId: string, role: string) {
  return prisma.agreementVersion.findMany({
    where: {
      agreementId,
      kind: "PROPOSAL",
      createdById: role === "CLIENT" ? userId : undefined,
    },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export async function getProposal(agreementId: string, versionId: string, userId: string, role: string) {
  const version = await prisma.agreementVersion.findFirst({
    where: { id: versionId, agreementId, kind: "PROPOSAL" },
    include: proposalDetailInclude,
  });
  if (!version) return null;
  if (role === "CLIENT" && version.createdById !== userId) return null;
  return version;
}

export async function saveProposal(agreementId: string, versionId: string, userId: string, input: DraftInput) {
  const version = await prisma.agreementVersion.findFirst({
    where: { id: versionId, agreementId, kind: "PROPOSAL", createdById: userId },
  });
  if (!version) throw Object.assign(new Error("Proposal not found"), { status: 404 });
  if (version.proposalStatus !== "DRAFT_PROPOSAL") {
    throw Object.assign(new Error("Only draft proposals can be edited"), { status: 409 });
  }

  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: {
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
      reasonForChange: input.reasonForChange,
      changesSummary: input.changesSummary,
    },
  });

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

  return prisma.agreementVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: proposalDetailInclude,
  });
}

export async function submitProposal(agreementId: string, versionId: string, userId: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: { client: true, currentVersion: { include: { priceItems: true } } },
  });
  if (!agreement?.currentVersion) throw Object.assign(new Error("Agreement not found"), { status: 404 });
  if (agreement.client.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const version = await prisma.agreementVersion.findFirst({
    where: { id: versionId, agreementId, kind: "PROPOSAL", createdById: userId },
    include: proposalDetailInclude,
  });
  if (!version) throw Object.assign(new Error("Proposal not found"), { status: 404 });
  if (version.proposalStatus !== "DRAFT_PROPOSAL") {
    throw Object.assign(new Error("This proposal is already submitted"), { status: 409 });
  }

  const pricing = computePricing(version.priceItems, version.discountAmount, version.taxPercent);
  const extraDays = daysBetween(version.startDate, version.estimatedCompletion);

  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: { proposalStatus: "SUBMITTED" },
  });
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'A',location:'lib/proposals.ts:submitProposal',message:'proposal-submitted',data:{agreementId,versionId,wasSigned:agreement.status==='SIGNED',priorStatus:agreement.status,currentVersionId:agreement.currentVersionId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (agreement.status === "SIGNED") {
    const number = await nextNumber("CR");
    await prisma.changeRequest.create({
      data: {
        number,
        agreementId,
        projectId: agreement.projectId,
        title: version.projectTitle || "Additional work",
        description: version.shortDescription || version.changesSummary || "Client submitted a full-document extra-work proposal.",
        additionalCost: pricing.total,
        additionalTimeDays: extraDays,
        createdById: userId,
        requesterName: agreement.client.fullName,
        requesterEmail: agreement.client.email,
        proposalVersionId: versionId,
      },
    });
    await writeAudit({
      eventType: "CHANGE_REQUEST_CREATED",
      userId,
      clientId: agreement.clientId,
      agreementId,
      versionId,
      metadata: { number },
    });
    await writeAudit({
      eventType: "PROPOSAL_SUBMITTED",
      userId,
      clientId: agreement.clientId,
      agreementId,
      versionId,
      metadata: { signed: true },
    });
    await notifyAdmins({
      type: "PROPOSAL",
      title: `Proposal submitted on ${agreement.number}`,
      message: "Client requested additional work as a full document.",
      link: `/agreements/${agreementId}`,
      agreementId,
    });
    await sendTemplatedEmail(agreement.client.email, EMAIL_TEMPLATES.changeRequestSubmitted(number));
  } else {
    await prisma.agreement.update({
      where: { id: agreementId },
      data: { status: "CHANGES_REQUESTED" },
    });
    await writeAudit({
      eventType: "PROPOSAL_SUBMITTED",
      userId,
      clientId: agreement.clientId,
      agreementId,
      versionId,
      metadata: { signed: false },
    });
    await notifyAdmins({
      type: "PROPOSAL",
      title: `Proposal submitted on ${agreement.number}`,
      message: "Client negotiated a new agreement version.",
      link: `/agreements/${agreementId}`,
      agreementId,
    });
    await sendTemplatedEmail(agreement.client.email, EMAIL_TEMPLATES.changesRequested(agreement.number));
  }

  return prisma.agreementVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: proposalDetailInclude,
  });
}

async function sendAgreementToClient(agreementId: string, adminId: string, origin: string, event: "received" | "updated") {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { client: true, currentVersion: true },
  });
  if (!agreement?.currentVersion) throw new Error("Agreement not found");

  const expiresAt = agreement.expiresAt ?? new Date(Date.now() + 14 * 86400000);
  await revokeAgreementTokens(agreementId);
  const token = await createAccessToken(agreementId, expiresAt);
  const link = `${process.env.APP_URL ?? origin}/agreement/a/${token}`;
  const template =
    event === "updated"
      ? EMAIL_TEMPLATES.agreementUpdated(agreement.number, link)
      : EMAIL_TEMPLATES.agreementReceived(agreement.number, link);

  await prisma.agreement.update({
    where: { id: agreementId },
    data: { expiresAt },
  });

  await sendTemplatedEmail(agreement.client.email, template);
  if (agreement.client.userId) {
    await notifyUsers({
      userIds: [agreement.client.userId],
      type: "AGREEMENT_SENT",
      title: `Agreement ${agreement.number} is ready`,
      message: event === "updated" ? "Your proposed document was accepted. Please review and sign." : "A new agreement is ready for review.",
      link: `/agreements/${agreementId}`,
      agreementId,
    });
  }
  return { link, agreement };
}

export async function approveProposal(agreementId: string, versionId: string, adminId: string, origin: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: { client: true, currentVersion: true },
  });
  if (!agreement) throw Object.assign(new Error("Agreement not found"), { status: 404 });

  const proposal = await prisma.agreementVersion.findFirst({
    where: { id: versionId, agreementId, kind: "PROPOSAL" },
    include: versionChildrenInclude,
  });
  if (!proposal) throw Object.assign(new Error("Proposal not found"), { status: 404 });
  if (proposal.proposalStatus !== "SUBMITTED") {
    throw Object.assign(new Error("Only submitted proposals can be approved"), { status: 409 });
  }

  if (agreement.status === "SIGNED") {
    const cr = await prisma.changeRequest.findFirst({ where: { proposalVersionId: versionId } });
    if (cr) {
      await prisma.changeRequest.update({
        where: { id: cr.id },
        data: { status: "APPROVED" },
      });
      await writeAudit({
        eventType: "CHANGE_REQUEST_APPROVED",
        userId: adminId,
        agreementId,
        versionId,
        metadata: { number: cr.number },
      });
      if (cr.createdById) {
        await notifyUsers({
          userIds: [cr.createdById],
          type: "CHANGE_REQUEST",
          title: `Change request ${cr.number} is APPROVED`,
          message: "A new linked agreement was created for this extra work.",
          link: "/agreements",
          agreementId,
        });
      }
      await sendTemplatedEmail(cr.requesterEmail, EMAIL_TEMPLATES.changeRequestResponse(cr.number, "APPROVED"));
    }

    const number = await nextNumber("AG");
    const child = await prisma.agreement.create({
      data: {
        number,
        clientId: agreement.clientId,
        projectId: agreement.projectId,
        createdById: adminId,
        parentAgreementId: agreement.id,
        status: "SENT",
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
    });

    const childVersion = await prisma.agreementVersion.create({
      data: {
        agreementId: child.id,
        versionNumber: 1,
        createdById: adminId,
        status: "SENT",
        kind: "CURRENT",
        proposalStatus: null,
        reasonForChange: `Extra work from ${agreement.number}`,
        projectTitle: proposal.projectTitle,
        shortDescription: proposal.shortDescription,
        detailedDescription: proposal.detailedDescription,
        objectives: proposal.objectives,
        startDate: proposal.startDate,
        estimatedCompletion: proposal.estimatedCompletion,
        timelineDisclaimer: proposal.timelineDisclaimer,
        currency: proposal.currency,
        discountAmount: proposal.discountAmount,
        taxPercent: proposal.taxPercent,
      },
    });

    await attachVersionChildren(childVersion.id, {
      requirements: proposal.requirements.map((item) => ({
        order: item.order,
        title: item.title,
        description: item.description,
        category: item.category,
        inclusion: item.inclusion,
        estimatedEffort: item.estimatedEffort,
        notes: item.notes,
      })),
      priceItems: proposal.priceItems.map((item) => ({
        order: item.order,
        label: item.label,
        amount: item.amount,
        type: item.type,
      })),
      milestones: proposal.milestones.map((item) => ({
        order: item.order,
        name: item.name,
        description: item.description,
        dueDate: item.dueDate,
        amount: item.amount,
        deliverables: item.deliverables,
      })),
      terms: proposal.terms.map((item) => ({
        order: item.order,
        key: item.key,
        title: item.title,
        content: item.content,
      })),
    });

    await prisma.agreement.update({
      where: { id: child.id },
      data: { currentVersionId: childVersion.id },
    });
    await prisma.agreementVersion.update({
      where: { id: versionId },
      data: { proposalStatus: "APPROVED" },
    });

    await writeAudit({
      eventType: "PROPOSAL_APPROVED",
      userId: adminId,
      clientId: agreement.clientId,
      agreementId,
      versionId,
      metadata: { childAgreementId: child.id, childNumber: number },
    });
    await writeAudit({
      eventType: "AGREEMENT_SENT",
      userId: adminId,
      clientId: agreement.clientId,
      agreementId: child.id,
      versionId: childVersion.id,
      metadata: { parentAgreementId: agreement.id },
    });

    const sent = await sendAgreementToClient(child.id, adminId, origin, "received");
    return { proposalStatus: "APPROVED", childAgreement: { id: child.id, number }, link: sent.link };
  }

  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: {
      kind: "CURRENT",
      proposalStatus: "APPROVED",
      status: "AWAITING_APPROVAL",
    },
  });
  await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      currentVersionId: versionId,
      status: "AWAITING_APPROVAL",
    },
  });
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'B',location:'lib/proposals.ts:approveProposal',message:'pre-sign-approved',data:{agreementId,versionId,prevCurrent:agreement.currentVersionId,newStatus:'AWAITING_APPROVAL'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  await writeAudit({
    eventType: "PROPOSAL_APPROVED",
    userId: adminId,
    clientId: agreement.clientId,
    agreementId,
    versionId,
  });

  const sent = await sendAgreementToClient(agreementId, adminId, origin, "updated");
  return { proposalStatus: "APPROVED", currentVersionId: versionId, link: sent.link };
}

export async function rejectProposal(agreementId: string, versionId: string, adminId: string, note?: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: { client: true },
  });
  if (!agreement) throw Object.assign(new Error("Agreement not found"), { status: 404 });

  const proposal = await prisma.agreementVersion.findFirst({
    where: { id: versionId, agreementId, kind: "PROPOSAL" },
  });
  if (!proposal) throw Object.assign(new Error("Proposal not found"), { status: 404 });
  if (proposal.proposalStatus !== "SUBMITTED") {
    throw Object.assign(new Error("Only submitted proposals can be rejected"), { status: 409 });
  }

  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: { proposalStatus: "REJECTED", changesSummary: note ?? proposal.changesSummary },
  });

  // Pre-sign: restore a signable status so client can still sign the unchanged current version.
  if (agreement.status === "CHANGES_REQUESTED" && agreement.currentVersionId) {
    const current = await prisma.agreementVersion.findUnique({ where: { id: agreement.currentVersionId } });
    const restore =
      current && (SIGNABLE_STATUSES as string[]).includes(current.status)
        ? current.status
        : "SENT";
    await prisma.agreement.update({
      where: { id: agreementId },
      data: { status: restore as never },
    });
    // #region agent log
    fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'A',location:'lib/proposals.ts:rejectProposal',message:'status-restored-after-reject',data:{agreementId,versionId,restoredTo:restore,currentVersionStatus:current?.status??null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  const cr = await prisma.changeRequest.findFirst({ where: { proposalVersionId: versionId } });
  if (cr) {
    await prisma.changeRequest.update({
      where: { id: cr.id },
      data: { status: "REJECTED", adminNotes: note ?? cr.adminNotes },
    });
    await writeAudit({
      eventType: "CHANGE_REQUEST_REJECTED",
      userId: adminId,
      agreementId,
      versionId,
      metadata: { number: cr.number },
    });
    if (cr.createdById) {
      await notifyUsers({
        userIds: [cr.createdById],
        type: "CHANGE_REQUEST",
        title: `Change request ${cr.number} is REJECTED`,
        message: note || "Your extra-work proposal was not accepted. The signed agreement is unchanged.",
        link: `/agreements/${agreementId}`,
        agreementId,
      });
    }
    await sendTemplatedEmail(cr.requesterEmail, EMAIL_TEMPLATES.changeRequestResponse(cr.number, "REJECTED"));
  } else if (agreement.client.userId) {
    await notifyUsers({
      userIds: [agreement.client.userId],
      type: "PROPOSAL",
      title: `Proposal on ${agreement.number} was declined`,
      message: note || "The current agreement version is unchanged.",
      link: `/agreements/${agreementId}`,
      agreementId,
    });
  }

  await writeAudit({
    eventType: "PROPOSAL_REJECTED",
    userId: adminId,
    clientId: agreement.clientId,
    agreementId,
    versionId,
    metadata: { note: note ?? null },
  });

  return { proposalStatus: "REJECTED" };
}
