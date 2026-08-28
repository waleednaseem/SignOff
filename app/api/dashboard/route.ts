import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireUser } from "@/lib/api";
import { notDeleted, withNotDeleted } from "@/lib/soft-delete";
import { CLIENT_HISTORY_EVENTS } from "@/lib/client-visible";

export async function GET() {
  try {
    const user = await requireUser();
    // #region agent log
    fetch('http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a2684c'},body:JSON.stringify({sessionId:'a2684c',runId:'pre-fix',hypothesisId:'D',location:'dashboard/route.ts:GET',message:'dashboard start',data:{role:user.role},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (user.role === "ADMIN") {
      const [clients, projects, agreements, changeRequests, activity] = await Promise.all([
        prisma.client.count({ where: { ...notDeleted, status: "ACTIVE" } }),
        prisma.project.count({ where: { ...notDeleted, status: { in: ["PLANNING", "ACTIVE"] } } }),
        prisma.agreement.findMany({ where: notDeleted, select: { status: true } }),
        prisma.changeRequest.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
        prisma.auditLog.findMany({
          take: 12,
          orderBy: { createdAt: "desc" },
          include: { agreement: { select: { number: true } }, user: { select: { name: true } } },
        }),
      ]);
      const count = (status: string) => agreements.filter((row) => row.status === status).length;
      const expiring = await prisma.agreement.count({
        where: withNotDeleted({
          status: { notIn: ["SIGNED", "CANCELLED", "EXPIRED", "REJECTED"] },
          expiresAt: { lte: new Date(Date.now() + 7 * 86400000), gte: new Date() },
        }),
      });
      return jsonOk({
        totalClients: clients,
        activeProjects: projects,
        draftAgreements: count("DRAFT"),
        awaitingClient: count("SENT") + count("VIEWED") + count("CHANGES_REQUESTED"),
        awaitingSignature: count("AWAITING_SIGNATURE") + count("AWAITING_APPROVAL"),
        signedAgreements: count("SIGNED"),
        expiringAgreements: expiring,
        openChangeRequests: changeRequests,
        activity,
      });
    }

    const client = await prisma.client.findFirst({ where: { userId: user.id, ...notDeleted } });
    const clientId = client?.id;
    const [projects, agreements, changeRequests, activity] = await Promise.all([
      prisma.project.count({ where: { clientId, ...notDeleted, status: { in: ["PLANNING", "ACTIVE"] } } }),
      prisma.agreement.findMany({ where: { clientId, ...notDeleted }, select: { status: true } }),
      prisma.changeRequest.count({ where: { agreement: { clientId } } }),
      prisma.auditLog.findMany({
        where: {
          eventType: { in: [...CLIENT_HISTORY_EVENTS] },
          OR: [{ clientId }, { agreement: { clientId } }],
        },
        take: 12,
        orderBy: { createdAt: "desc" },
        include: { agreement: { select: { number: true } } },
      }),
    ]);
    const count = (status: string) => agreements.filter((row) => row.status === status).length;
    return jsonOk({
      activeProjects: projects,
      pendingAgreements: count("SENT") + count("VIEWED") + count("AWAITING_APPROVAL"),
      awaitingSignature: count("AWAITING_SIGNATURE") + count("AWAITING_APPROVAL"),
      signedAgreements: count("SIGNED"),
      changeRequests,
      activity,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
