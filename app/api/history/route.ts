import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { notDeleted } from "@/lib/soft-delete";
import { CLIENT_HISTORY_EVENTS, historyLabel } from "@/lib/client-visible";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") {
      return jsonError("FORBIDDEN", "History in this view is for client accounts.", 403);
    }

    const client = await prisma.client.findFirst({
      where: { userId: user.id, ...notDeleted },
    });
    if (!client) {
      return jsonOk([]);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        eventType: { in: [...CLIENT_HISTORY_EVENTS] },
        OR: [{ clientId: client.id }, { agreement: { clientId: client.id } }],
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { agreement: { select: { id: true, number: true } } },
    });

    return jsonOk(
      logs.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        label: historyLabel(row.eventType),
        createdAt: row.createdAt,
        agreement: row.agreement,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
