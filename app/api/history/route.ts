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
      // #region agent log
      fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
        body: JSON.stringify({
          sessionId: "a2684c",
          runId: "client-portal",
          hypothesisId: "E",
          location: "api/history/route.ts",
          message: "no client record linked",
          data: { userIdPresent: true },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
      // #endregion
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

    // #region agent log
    fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
      body: JSON.stringify({
        sessionId: "a2684c",
        runId: "client-portal",
        hypothesisId: "C",
        location: "api/history/route.ts",
        message: "client history filtered",
        data: {
          count: logs.length,
          eventTypes: [...new Set(logs.map((row) => row.eventType))],
          hasInternal: logs.some((row) => row.eventType === "INTERNAL_NOTE"),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => undefined);
    // #endregion

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
