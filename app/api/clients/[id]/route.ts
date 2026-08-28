import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { clientSchema } from "@/lib/validators";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const client = await prisma.client.findFirst({
      where: { id, ...notDeleted },
      include: {
        projects: { where: notDeleted, orderBy: { createdAt: "desc" } },
        agreements: { where: notDeleted, orderBy: { createdAt: "desc" }, take: 20 },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!client) return jsonError("NOT_FOUND", "Client not found.", 404);
    return jsonOk(client);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = clientSchema.partial().parse(await request.json());
    const client = await prisma.client.update({ where: { id }, data: body });
    return jsonOk(client);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return jsonError("NOT_FOUND", "Client not found.", 404);
    await prisma.client.update({ where: { id }, data: { deletedAt: new Date(), status: "DISABLED" } });
    return jsonOk({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
