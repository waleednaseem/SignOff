import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireUser } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return jsonOk(items);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    if (body.id) {
      const item = await prisma.notification.update({
        where: { id: body.id },
        data: { readAt: new Date() },
      });
      return jsonOk(item);
    }
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return jsonOk({ read: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
