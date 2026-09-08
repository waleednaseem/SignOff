import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyUsers, notifyAdmins } from "@/lib/notify";
import { notDeleted } from "@/lib/soft-delete";
import { jsonError } from "@/lib/api";

export function handleDeliveryError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const status = Number((error as { status: number }).status);
    const code =
      status === 404 ? "NOT_FOUND" : status === 403 ? "FORBIDDEN" : status === 409 ? "CONFLICT" : "VALIDATION_ERROR";
    return jsonError(code, error.message, status);
  }
  return null;
}

async function loadSignedAgreement(agreementId: string) {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, ...notDeleted },
    include: {
      client: true,
      project: true,
      currentVersion: { include: { milestones: { orderBy: { order: "asc" } } } },
    },
  });
  if (!agreement?.currentVersion) throw Object.assign(new Error("Agreement not found"), { status: 404 });
  return agreement;
}

export async function completeMilestone(input: {
  agreementId: string;
  milestoneId: string;
  adminId: string;
}) {
  const agreement = await loadSignedAgreement(input.agreementId);
  if (agreement.status !== "SIGNED" && agreement.status !== "DELIVERY_REVIEW") {
    throw Object.assign(new Error("Milestones can only be completed on a signed agreement."), { status: 409 });
  }

  const milestone = agreement.currentVersion!.milestones.find((m) => m.id === input.milestoneId);
  if (!milestone) throw Object.assign(new Error("Milestone not found on current version."), { status: 404 });
  if (milestone.status === "COMPLETED") {
    throw Object.assign(new Error("Milestone already completed."), { status: 409 });
  }

  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await writeAudit({
    eventType: "MILESTONE_COMPLETED",
    userId: input.adminId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersionId!,
    metadata: { milestoneId: milestone.id, name: milestone.name },
  });

  if (agreement.client.userId) {
    await notifyUsers({
      userIds: [agreement.client.userId],
      type: "MILESTONE",
      title: `Milestone completed: ${milestone.name}`,
      message: `A milestone on ${agreement.number} was marked complete.`,
      link: `/agreements/${agreement.id}`,
      agreementId: agreement.id,
    });
  }

  const remaining = await prisma.milestone.count({
    where: { versionId: agreement.currentVersionId!, status: "PENDING" },
  });
  const completed = await prisma.milestone.count({
    where: { versionId: agreement.currentVersionId!, status: "COMPLETED" },
  });

  return {
    milestone: { id: milestone.id, name: milestone.name, status: "COMPLETED" as const },
    progress: { completed, remaining, total: completed + remaining },
    allComplete: remaining === 0,
  };
}

export async function requestDeliveryReview(input: { agreementId: string; adminId: string }) {
  const agreement = await loadSignedAgreement(input.agreementId);
  if (agreement.status !== "SIGNED") {
    throw Object.assign(new Error("Delivery review can only start from a signed agreement."), { status: 409 });
  }
  const pending = agreement.currentVersion!.milestones.filter((m) => m.status !== "COMPLETED");
  if (pending.length > 0) {
    throw Object.assign(
      new Error(`Complete all milestones first (${pending.length} remaining).`),
      { status: 409 },
    );
  }

  await prisma.agreement.update({
    where: { id: agreement.id },
    data: { status: "DELIVERY_REVIEW" },
  });
  await prisma.agreementVersion.update({
    where: { id: agreement.currentVersionId! },
    data: { status: "DELIVERY_REVIEW" },
  });

  await writeAudit({
    eventType: "DELIVERY_REVIEW_REQUESTED",
    userId: input.adminId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersionId!,
  });

  if (agreement.client.userId) {
    await notifyUsers({
      userIds: [agreement.client.userId],
      type: "DELIVERY",
      title: `${agreement.number} is ready for final signoff`,
      message: "All milestones are complete. Please accept delivery to close the project.",
      link: `/agreements/${agreement.id}`,
      agreementId: agreement.id,
    });
  }

  return { status: "DELIVERY_REVIEW" as const };
}

export async function acceptDelivery(input: { agreementId: string; userId: string }) {
  const agreement = await loadSignedAgreement(input.agreementId);
  if (agreement.client.userId !== input.userId) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (agreement.status !== "DELIVERY_REVIEW") {
    throw Object.assign(new Error("This agreement is not waiting for delivery acceptance."), { status: 409 });
  }

  await prisma.agreement.update({
    where: { id: agreement.id },
    data: { status: "COMPLETED" },
  });
  await prisma.agreementVersion.update({
    where: { id: agreement.currentVersionId! },
    data: { status: "COMPLETED" },
  });
  await prisma.project.update({
    where: { id: agreement.projectId },
    data: { status: "COMPLETED" },
  });

  await writeAudit({
    eventType: "FINAL_SIGNOFF",
    userId: input.userId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersionId!,
  });
  await writeAudit({
    eventType: "PROJECT_COMPLETED",
    userId: input.userId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersionId!,
    metadata: { projectId: agreement.projectId },
  });

  await notifyAdmins({
    type: "DELIVERY",
    title: `${agreement.number} closed by client`,
    message: "Client accepted delivery. Project marked completed.",
    link: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
  });

  return { status: "COMPLETED" as const, projectStatus: "COMPLETED" as const };
}
