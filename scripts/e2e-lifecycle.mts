/**
 * E2E lifecycle probe.
 * Avoid importing lib/sign (PDF/hyphenate breaks under tsx).
 */
import { PrismaClient } from "@prisma/client";
import {
  approveProposal,
  createOrResumeProposal,
  rejectProposal,
  saveProposal,
  submitProposal,
} from "../lib/proposals";
import { createAgreement } from "../lib/agreements";
import { attachVersionChildren } from "../lib/version-children";
import { writeAudit } from "../lib/audit";

const prisma = new PrismaClient();

async function main() {
  const clientUser = await prisma.user.findUnique({ where: { email: "ayesha@example.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@signoff.local" } });
  if (!clientUser || !admin) throw new Error("Seed users missing");
  const client = await prisma.client.findFirst({ where: { userId: clientUser.id } });
  if (!client) throw new Error("Client missing");
  let project = await prisma.project.findFirst({ where: { clientId: client.id } });
  if (!project) {
    project = await prisma.project.create({
      data: { clientId: client.id, name: "Lifecycle E2E Shop", status: "PLANNING" },
    });
  }

  const agreement = await createAgreement({
    clientId: client.id,
    projectId: project.id,
    createdById: admin.id,
  });
  const versionId = (await prisma.agreement.findUnique({ where: { id: agreement.id } }))!.currentVersionId!;

  await prisma.agreementVersion.update({
    where: { id: versionId },
    data: {
      projectTitle: "Northstar Lifecycle Rebuild",
      shortDescription: "Full site rebuild with 4 milestones",
      currency: "USD",
      status: "SENT",
    },
  });
  await prisma.requirement.deleteMany({ where: { versionId } });
  await prisma.priceItem.deleteMany({ where: { versionId } });
  await prisma.milestone.deleteMany({ where: { versionId } });
  await attachVersionChildren(versionId, {
    requirements: [
      { order: 0, title: "Homepage", inclusion: "INCLUDED" },
      { order: 1, title: "Catalog", inclusion: "INCLUDED" },
      { order: 2, title: "Checkout", inclusion: "INCLUDED" },
    ],
    priceItems: [{ order: 0, label: "Build", amount: 4000, type: "INCLUDED" }],
    milestones: [
      { order: 0, name: "Discovery", amount: 500, deliverables: "Brief + sitemap", description: "Kickoff" },
      { order: 1, name: "Design", amount: 1000, deliverables: "UI kit", description: "Figma" },
      { order: 2, name: "Build", amount: 2000, deliverables: "Staging site", description: "Dev" },
      { order: 3, name: "Launch", amount: 500, deliverables: "Go-live", description: "Prod" },
    ],
  });
  await prisma.agreement.update({
    where: { id: agreement.id },
    data: { status: "SENT", expiresAt: new Date(Date.now() + 14 * 86400000) },
  });

  for (let round = 1; round <= 4; round++) {
    const draft = await createOrResumeProposal(agreement.id, clientUser.id);
    if (draft.proposalStatus !== "DRAFT_PROPOSAL") {
      throw new Error(`Round ${round} did not get DRAFT_PROPOSAL`);
    }
    await saveProposal(agreement.id, draft.id, clientUser.id, {
      projectTitle: `Northstar Lifecycle Rebuild R${round}`,
      shortDescription: `Client counter #${round}`,
      priceItems: [{ label: "Build", amount: 4000 - round * 100, type: "INCLUDED" }],
      milestones: [
        { name: "Discovery", amount: 500, deliverables: "Brief", description: "Kickoff" },
        { name: "Design", amount: 1000, deliverables: "UI", description: "Figma" },
        { name: "Build", amount: 2000, deliverables: "Staging", description: "Dev" },
        { name: "Launch", amount: 500, deliverables: "Go-live", description: "Prod" },
      ],
    });
    await submitProposal(agreement.id, draft.id, clientUser.id);

    if (round < 4) {
      await rejectProposal(agreement.id, draft.id, admin.id, `Counter note round ${round}`);
    } else {
      await approveProposal(agreement.id, draft.id, admin.id, "http://localhost:3000");
    }
  }

  // Sign via prisma (mirrors signCurrentVersion state; PDF path tested separately in UI)
  const ready = await prisma.agreement.findUnique({ where: { id: agreement.id } });
  const canSign = ["SENT", "VIEWED", "AWAITING_APPROVAL", "AWAITING_SIGNATURE"].includes(ready!.status);
  if (!canSign) throw new Error(`Not signable: ${ready?.status}`);

  await prisma.signature.create({
    data: {
      versionId: ready!.currentVersionId!,
      signerName: "Ayesha Khan",
      email: "ayesha@example.com",
      typedName: "Ayesha Khan",
      imageData: "data:image/png;base64,aaa",
      userId: clientUser.id,
      isAnonymous: false,
    },
  });
  await prisma.agreement.update({ where: { id: agreement.id }, data: { status: "SIGNED" } });
  await prisma.agreementVersion.update({
    where: { id: ready!.currentVersionId! },
    data: { status: "SIGNED" },
  });
  await prisma.project.update({ where: { id: project.id }, data: { status: "ACTIVE" } });
  await writeAudit({
    eventType: "AGREEMENT_SIGNED",
    userId: clientUser.id,
    clientId: client.id,
    agreementId: agreement.id,
    versionId: ready!.currentVersionId!,
  });

  const signed = await prisma.agreement.findUnique({
    where: { id: agreement.id },
    include: { currentVersion: { include: { milestones: true, signatures: true } }, project: true },
  });

  // Delivery: complete all 4 milestones → request review → client accept
  const { completeMilestone, requestDeliveryReview, acceptDelivery } = await import("../lib/delivery");
  for (const m of signed!.currentVersion!.milestones) {
    await completeMilestone({
      agreementId: agreement.id,
      milestoneId: m.id,
      adminId: admin.id,
    });
  }
  await requestDeliveryReview({ agreementId: agreement.id, adminId: admin.id });
  await acceptDelivery({ agreementId: agreement.id, userId: clientUser.id });
  const finalAg = await prisma.agreement.findUnique({
    where: { id: agreement.id },
    include: { project: true },
  });

  console.log("E2E done", agreement.number, finalAg?.status, finalAg?.project.status);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
