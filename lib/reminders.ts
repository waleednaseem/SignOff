import { EMAIL_TEMPLATES, sendTemplatedEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { withNotDeleted } from "@/lib/soft-delete";

function daysFromNow(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

export async function processAgreementReminders() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (settings && !settings.reminderEnabled) return { sent: 0 };

  const now = new Date();
  const agreements = await prisma.agreement.findMany({
    where: withNotDeleted({
      expiresAt: { not: null },
      status: { notIn: ["SIGNED", "CANCELLED", "REJECTED", "DRAFT"] },
    }),
    include: { client: true },
  });

  let sent = 0;
  for (const agreement of agreements) {
    if (!agreement.expiresAt) continue;
    const days = daysFromNow(agreement.expiresAt);
    const link = `${process.env.APP_URL ?? ""}/agreements/${agreement.id}`;

    if (days <= 0 && !agreement.reminderExpiredSentAt) {
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { status: "EXPIRED", reminderExpiredSentAt: now },
      });
      await sendTemplatedEmail(agreement.client.email, EMAIL_TEMPLATES.expired(agreement.number));
      await notifyAdmins({
        type: "AGREEMENT_EXPIRED",
        title: `Agreement ${agreement.number} expired`,
        message: `Agreement ${agreement.number} has expired.`,
        link,
        agreementId: agreement.id,
      });
      await writeAudit({
        eventType: "AGREEMENT_EXPIRED",
        agreementId: agreement.id,
        clientId: agreement.clientId,
      });
      sent += 1;
      continue;
    }

    if (days === 3 && !agreement.reminder3dSentAt) {
      await sendTemplatedEmail(
        agreement.client.email,
        EMAIL_TEMPLATES.expiryReminder(agreement.number, 3, link),
      );
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { reminder3dSentAt: now },
      });
      sent += 1;
    }

    if (days === 1 && !agreement.reminder1dSentAt) {
      await sendTemplatedEmail(
        agreement.client.email,
        EMAIL_TEMPLATES.expiryReminder(agreement.number, 1, link),
      );
      await prisma.agreement.update({
        where: { id: agreement.id },
        data: { reminder1dSentAt: now },
      });
      sent += 1;
    }
  }

  return { sent };
}
