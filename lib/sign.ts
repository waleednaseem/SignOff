import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { notifyAdmins, notifyUsers } from "@/lib/notify";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";
import { generateAgreementPdfBuffer, persistSignedPdf } from "@/lib/pdf/generate";
import { SIGNABLE_STATUSES } from "@/lib/status";
import { jsonError } from "@/lib/api";
import { notDeleted } from "@/lib/soft-delete";

export async function signCurrentVersion(input: {
  agreementId: string;
  versionId: string;
  signerName: string;
  email: string;
  typedName: string;
  imageData: string;
  ipAddress?: string | null;
  userId?: string | null;
  isAnonymous: boolean;
  createAccount?: boolean;
  password?: string;
}) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: input.agreementId },
    include: {
      client: true,
      project: true,
      currentVersion: {
        include: {
          requirements: { orderBy: { order: "asc" } },
          priceItems: { orderBy: { order: "asc" } },
          milestones: { orderBy: { order: "asc" } },
          terms: { orderBy: { order: "asc" } },
          signatures: true,
        },
      },
    },
  });

  if (!agreement?.currentVersion) {
    return { error: jsonError("INVALID_AGREEMENT", "Agreement not found.", 404) };
  }
  if (agreement.currentVersionId !== input.versionId) {
    return { error: jsonError("OLD_VERSION", "Only the current version can be signed.", 409) };
  }
  if (agreement.status === "SIGNED" || agreement.currentVersion.signatures.length > 0) {
    return { error: jsonError("ALREADY_SIGNED", "This agreement is already signed.", 409) };
  }
  if (agreement.status === "EXPIRED" || (agreement.expiresAt && agreement.expiresAt < new Date())) {
    return { error: jsonError("EXPIRED_AGREEMENT", "This agreement has expired.", 409) };
  }
  if (agreement.status === "CANCELLED") {
    return { error: jsonError("INVALID_AGREEMENT", "This agreement was cancelled.", 409) };
  }
  if (!SIGNABLE_STATUSES.includes(agreement.status) && agreement.status !== "DRAFT") {
    // #region agent log
    fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'B',location:'lib/sign.ts:signCurrentVersion',message:'sign-blocked',data:{agreementId:input.agreementId,status:agreement.status,versionId:input.versionId,currentVersionId:agreement.currentVersionId},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return { error: jsonError("INVALID_AGREEMENT", "This agreement is not ready for signature.", 409) };
  }
  if (!input.imageData.startsWith("data:image")) {
    return { error: jsonError("INVALID_SIGNATURE", "A drawn signature is required.", 400) };
  }
  // #region agent log
  fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'e2e-lifecycle',hypothesisId:'B',location:'lib/sign.ts:signCurrentVersion',message:'sign-allowed',data:{agreementId:input.agreementId,status:agreement.status,milestoneCount:agreement.currentVersion.milestones.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  let userId = input.userId ?? agreement.client.userId ?? null;
  if (input.createAccount && input.password) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) {
      userId = existing.id;
    } else {
      const user = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.signerName,
          passwordHash: await bcrypt.hash(input.password, 12),
          role: "CLIENT",
        },
      });
      userId = user.id;
    }
    if (!agreement.client.userId && userId) {
      await prisma.client.update({
        where: { id: agreement.clientId },
        data: { userId },
      });
    }
  }

  const signature = await prisma.signature.create({
    data: {
      versionId: agreement.currentVersion.id,
      signerName: input.signerName,
      email: input.email.toLowerCase(),
      typedName: input.typedName,
      imageData: input.imageData,
      ipAddress: input.ipAddress,
      userId,
      isAnonymous: !userId,
    },
  });

  const pdfBuffer = await generateAgreementPdfBuffer({
    agreement,
    version: agreement.currentVersion,
    client: agreement.client,
    project: agreement.project,
    signature,
  });
  const stored = await persistSignedPdf(agreement.number, agreement.currentVersion.versionNumber, pdfBuffer);

  await prisma.signature.update({
    where: { id: signature.id },
    data: { pdfPath: stored.filePath, pdfHash: stored.hash },
  });

  await prisma.agreement.update({
    where: { id: agreement.id },
    data: { status: "SIGNED" },
  });
  await prisma.agreementVersion.update({
    where: { id: agreement.currentVersion.id },
    data: { status: "SIGNED" },
  });
  await prisma.project.update({
    where: { id: agreement.projectId },
    data: { status: "ACTIVE" },
  });

  await writeAudit({
    eventType: "SIGNATURE_SUBMITTED",
    userId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersion.id,
    ipAddress: input.ipAddress,
    metadata: { signerName: input.signerName, email: input.email },
  });
  await writeAudit({
    eventType: "AGREEMENT_SIGNED",
    userId,
    clientId: agreement.clientId,
    agreementId: agreement.id,
    versionId: agreement.currentVersion.id,
    ipAddress: input.ipAddress,
  });
  await writeAudit({
    eventType: "PDF_GENERATED",
    userId,
    agreementId: agreement.id,
    versionId: agreement.currentVersion.id,
    metadata: { hash: stored.hash, path: stored.filePath },
  });

  await notifyAdmins({
    type: "AGREEMENT_SIGNED",
    title: `Client signed Agreement #${agreement.number}`,
    message: `${input.signerName} signed ${agreement.number}.`,
    link: `/agreements/${agreement.id}`,
    agreementId: agreement.id,
  });
  if (userId) {
    await notifyUsers({
      userIds: [userId],
      type: "AGREEMENT_SIGNED",
      title: `Agreement ${agreement.number} is signed`,
      message: "Your signed copy is ready to download.",
      link: `/agreements/${agreement.id}`,
      agreementId: agreement.id,
    });
  }

  await sendTemplatedEmail(agreement.client.email, EMAIL_TEMPLATES.agreementSignedClient(agreement.number));
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", ...notDeleted } });
  for (const admin of admins) {
    await sendTemplatedEmail(admin.email, EMAIL_TEMPLATES.agreementSignedAdmin(agreement.number));
  }

  return { signature, hash: stored.hash, agreementNumber: agreement.number };
}
