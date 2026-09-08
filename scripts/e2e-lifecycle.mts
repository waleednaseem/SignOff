/**
 * E2E lifecycle probe — session a2684c
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
const INGEST = "http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8";

function log(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  const payload = {
    sessionId: "a2684c",
    runId: "e2e-lifecycle",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  console.log(JSON.stringify(payload));
  return fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

async function probeHttp(path: string, method: string, body?: unknown) {
  try {
    const res = await fetch(`http://localhost:3000${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, body: text.slice(0, 180) };
  } catch (e) {
    return { status: 0, ok: false, body: String(e) };
  }
}

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

  const ms = await prisma.milestone.count({ where: { versionId } });
  await log("C", "e2e:offer", "agreement-offered-with-4-milestones", {
    agreementId: agreement.id,
    number: agreement.number,
    milestoneCount: ms,
  });

  let lastProposalId = "";
  for (let round = 1; round <= 4; round++) {
    const draft = await createOrResumeProposal(agreement.id, clientUser.id);
    lastProposalId = draft.id;
    if (draft.proposalStatus !== "DRAFT_PROPOSAL") {
      await log("A", "e2e:negotiate", `round-${round}-blocked-not-draft`, {
        round,
        proposalId: draft.id,
        proposalStatus: draft.proposalStatus,
      });
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
    const mid = await prisma.agreement.findUnique({ where: { id: agreement.id } });
    await log("A", "e2e:negotiate", `round-${round}-submitted`, {
      round,
      proposalId: draft.id,
      agreementStatus: mid?.status,
      currentStillOriginal: mid?.currentVersionId === versionId,
    });

    if (round < 4) {
      await rejectProposal(agreement.id, draft.id, admin.id, `Counter note round ${round}`);
      const after = await prisma.agreement.findUnique({ where: { id: agreement.id } });
      await log("A", "e2e:negotiate", `round-${round}-rejected`, {
        round,
        agreementStatus: after?.status,
        currentStillOriginal: after?.currentVersionId === versionId,
      });
    } else {
      const approved = await approveProposal(agreement.id, draft.id, admin.id, "http://localhost:3000");
      const after = await prisma.agreement.findUnique({
        where: { id: agreement.id },
        include: { currentVersion: { include: { milestones: true } } },
      });
      await log("B", "e2e:negotiate", "round-4-approved", {
        approved,
        agreementStatus: after?.status,
        currentIsProposal: after?.currentVersionId === lastProposalId,
        milestoneCount: after?.currentVersion?.milestones.length ?? 0,
      });
    }
  }

  // Sign via prisma (mirrors signCurrentVersion state; PDF path tested separately in UI)
  const ready = await prisma.agreement.findUnique({ where: { id: agreement.id } });
  const canSign = ["SENT", "VIEWED", "AWAITING_APPROVAL", "AWAITING_SIGNATURE"].includes(ready!.status);
  await log("B", "e2e:sign", "pre-sign-check", {
    status: ready?.status,
    canSign,
    currentVersionId: ready?.currentVersionId,
  });
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
  await log("B", "e2e:sign", "signed", {
    agreementStatus: signed?.status,
    signatureCount: signed?.currentVersion?.signatures.length ?? 0,
    projectStatus: signed?.project.status,
    milestoneCount: signed?.currentVersion?.milestones.length ?? 0,
  });

  // Delivery: complete all 4 milestones → request review → client accept
  const { completeMilestone, requestDeliveryReview, acceptDelivery } = await import("../lib/delivery");
  for (const m of signed!.currentVersion!.milestones) {
    const r = await completeMilestone({
      agreementId: agreement.id,
      milestoneId: m.id,
      adminId: admin.id,
    });
    await log("D", "e2e:milestone", "completed-one", {
      name: m.name,
      progress: r.progress,
      allComplete: r.allComplete,
    });
  }
  const review = await requestDeliveryReview({ agreementId: agreement.id, adminId: admin.id });
  await log("E", "e2e:delivery", "review-requested", review);
  const closed = await acceptDelivery({ agreementId: agreement.id, userId: clientUser.id });
  const finalAg = await prisma.agreement.findUnique({
    where: { id: agreement.id },
    include: { project: true },
  });
  await log("E", "e2e:delivery", "final-signoff", {
    closed,
    agreementStatus: finalAg?.status,
    projectStatus: finalAg?.project.status,
  });

  console.log("E2E done", agreement.number, finalAg?.status, finalAg?.project.status);
}

main()
  .catch(async (e) => {
    await log("X", "e2e:error", "fatal", { error: String(e), stack: e instanceof Error ? e.stack?.slice(0, 400) : null });
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
