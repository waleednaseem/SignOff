import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { notDeleted } from "@/lib/soft-delete";
import { historyLabel, isClientHistoryEvent } from "@/lib/client-visible";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const agreement = await prisma.agreement.findFirst({
      where: { id, ...notDeleted },
      include: { client: true },
    });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You do not have access to this agreement.", 403);
    }

    const logs = await prisma.auditLog.findMany({
      where: { agreementId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, role: true } } },
    });
    const filtered =
      user.role === "ADMIN"
        ? logs
        : logs.filter((item) => isClientHistoryEvent(item.eventType));

    return jsonOk(
      filtered.map((item) => ({
        ...item,
        label: historyLabel(item.eventType),
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
