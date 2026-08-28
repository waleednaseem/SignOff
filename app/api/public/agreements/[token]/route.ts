import { prisma } from "@/lib/db";
import { getClientIp, handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { findValidToken } from "@/lib/tokens";
import { publicAgreementPayload } from "@/lib/agreement-public";
import { writeAudit } from "@/lib/audit";
import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { commentSchema, signSchema } from "@/lib/validators";
import { signCurrentVersion } from "@/lib/sign";
import { notDeleted } from "@/lib/soft-delete";
import { nextNumber } from "@/lib/numbers";

async function loadPublic(token: string, ip: string | null) {
  const limited = rateLimit(`token:${ip ?? "unknown"}:${token.slice(0, 8)}`, 40);
  if (!limited.ok) return { error: jsonError("RATE_LIMITED", "Too many requests. Try again shortly.", 429) };
  const result = await findValidToken(token);
  if ("error" in result) {
    if (result.error === "REVOKED") return { error: jsonError("REVOKED_LINK", "This agreement link has been revoked.", 410) };
    if (result.error === "EXPIRED") return { error: jsonError("EXPIRED_AGREEMENT", "This agreement link has expired.", 410) };
    return { error: jsonError("NOT_FOUND", "Agreement link is invalid.", 404) };
  }
  return { record: result.record };
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const loaded = await loadPublic(token, getClientIp(request));
    if ("error" in loaded && loaded.error) return loaded.error;
    const agreement = loaded.record!.agreement;
    const payload = publicAgreementPayload(agreement as never);
    if (!payload) return jsonError("INVALID_AGREEMENT", "Agreement is not ready.", 400);
    return jsonOk(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ip = getClientIp(request);
    const loaded = await loadPublic(token, ip);
    if ("error" in loaded && loaded.error) return loaded.error;
    const agreement = loaded.record!.agreement;
    const body = await request.json();
    const action = body.action as string;

    if (agreement.status === "EXPIRED" || (agreement.expiresAt && agreement.expiresAt < new Date() && action !== "view")) {
      return jsonError("EXPIRED_AGREEMENT", "This agreement has expired.", 409);
    }

    if (action === "view") {
      if (agreement.status === "SENT") {
        await prisma.agreement.update({ where: { id: agreement.id }, data: { status: "VIEWED" } });
      }
      await writeAudit({
        eventType: "LINK_OPENED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        versionId: agreement.currentVersionId,
        ipAddress: ip,
      });
      await writeAudit({
        eventType: "AGREEMENT_VIEWED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        versionId: agreement.currentVersionId,
        ipAddress: ip,
      });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", ...notDeleted } });
      for (const admin of admins) {
        await sendTemplatedEmail(admin.email, EMAIL_TEMPLATES.agreementViewed(agreement.number));
      }
      await notifyAdmins({
        type: "AGREEMENT_VIEWED",
        title: `Client viewed Agreement #${agreement.number}`,
        message: `${agreement.client.fullName} opened the agreement.`,
        link: `/agreements/${agreement.id}`,
        agreementId: agreement.id,
      });
      return jsonOk({ viewed: true });
    }

    if (action === "comment") {
      const parsed = commentSchema.parse(body);
      const comment = await prisma.agreementComment.create({
        data: {
          agreementId: agreement.id,
          versionId: agreement.currentVersionId,
          requirementId: parsed.requirementId,
          parentId: parsed.parentId,
          authorName: parsed.authorName || agreement.client.fullName,
          authorEmail: parsed.authorEmail || agreement.client.email,
          text: parsed.text,
        },
      });
      await writeAudit({
        eventType: "COMMENT_ADDED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        versionId: agreement.currentVersionId,
        ipAddress: ip,
      });
      await notifyAdmins({
        type: "COMMENT",
        title: `Comment on ${agreement.number}`,
        message: parsed.text.slice(0, 140),
        link: `/agreements/${agreement.id}`,
        agreementId: agreement.id,
      });
      return jsonOk(comment, 201);
    }

    if (action === "request_changes") {
      const parsed = commentSchema.parse(body);
      await prisma.agreementComment.create({
        data: {
          agreementId: agreement.id,
          versionId: agreement.currentVersionId,
          requirementId: parsed.requirementId,
          authorName: parsed.authorName || agreement.client.fullName,
          authorEmail: parsed.authorEmail || agreement.client.email,
          text: parsed.text,
        },
      });
      await prisma.agreement.update({ where: { id: agreement.id }, data: { status: "CHANGES_REQUESTED" } });
      await writeAudit({
        eventType: "CHANGE_REQUESTED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        versionId: agreement.currentVersionId,
        ipAddress: ip,
        metadata: { text: parsed.text },
      });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        await sendTemplatedEmail(admin.email, EMAIL_TEMPLATES.changesRequested(agreement.number));
      }
      await notifyAdmins({
        type: "CHANGES_REQUESTED",
        title: `Client has requested changes to Agreement #${agreement.number}`,
        message: parsed.text.slice(0, 180),
        link: `/agreements/${agreement.id}`,
        agreementId: agreement.id,
      });
      return jsonOk({ status: "CHANGES_REQUESTED" });
    }

    if (action === "approve") {
      if (agreement.status === "SIGNED") return jsonError("ALREADY_SIGNED", "Already signed.", 409);
      await prisma.agreement.update({ where: { id: agreement.id }, data: { status: "AWAITING_SIGNATURE" } });
      await writeAudit({
        eventType: "APPROVAL_SUBMITTED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        versionId: agreement.currentVersionId,
        ipAddress: ip,
      });
      return jsonOk({ status: "AWAITING_SIGNATURE" });
    }

    if (action === "sign") {
      const parsed = signSchema.parse(body);
      const result = await signCurrentVersion({
        agreementId: agreement.id,
        versionId: parsed.versionId,
        signerName: parsed.signerName,
        email: parsed.email,
        typedName: parsed.typedName,
        imageData: parsed.imageData,
        ipAddress: ip,
        userId: agreement.client.userId,
        isAnonymous: !agreement.client.userId,
        createAccount: parsed.createAccount,
        password: parsed.password,
      });
      if ("error" in result && result.error) return result.error;
      return jsonOk({
        signed: true,
        hash: result.hash,
        number: result.agreementNumber,
        canCreateAccount: !agreement.client.userId,
      });
    }

    if (action === "change_request") {
      if (agreement.status !== "SIGNED") {
        return jsonError("VALIDATION_ERROR", "Change requests are available after signing.", 400);
      }
      const number = await nextNumber("CR");
      const cr = await prisma.changeRequest.create({
        data: {
          number,
          agreementId: agreement.id,
          projectId: agreement.projectId,
          title: body.title,
          description: body.description,
          additionalCost: body.additionalCost ?? 0,
          additionalTimeDays: body.additionalTimeDays ?? 0,
          requesterName: body.requesterName || agreement.client.fullName,
          requesterEmail: body.requesterEmail || agreement.client.email,
        },
      });
      await writeAudit({
        eventType: "CHANGE_REQUEST_CREATED",
        clientId: agreement.clientId,
        agreementId: agreement.id,
        metadata: { number },
      });
      await notifyAdmins({
        type: "CHANGE_REQUEST",
        title: `Change request ${number} submitted`,
        message: cr.title,
        link: "/change-requests",
        agreementId: agreement.id,
      });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        await sendTemplatedEmail(admin.email, EMAIL_TEMPLATES.changeRequestSubmitted(number));
      }
      return jsonOk(cr, 201);
    }

    return jsonError("VALIDATION_ERROR", "Unknown action.", 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
