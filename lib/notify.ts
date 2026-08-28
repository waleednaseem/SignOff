import { prisma } from "@/lib/db";
import { notDeleted } from "@/lib/soft-delete";

export async function notifyUsers(input: {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  link?: string;
  agreementId?: string;
}) {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      agreementId: input.agreementId,
    })),
  });
}

export async function notifyAdmins(input: {
  type: string;
  title: string;
  message: string;
  link?: string;
  agreementId?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", ...notDeleted },
    select: { id: true },
  });
  await notifyUsers({ ...input, userIds: admins.map((a) => a.id) });
}
