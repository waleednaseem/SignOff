import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { clientSchema } from "@/lib/validators";
import { notDeleted, withNotDeleted } from "@/lib/soft-delete";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status");

    if (user.role === "CLIENT") {
      const client = await prisma.client.findFirst({
        where: { userId: user.id, ...notDeleted },
      });
      return jsonOk(client ? [client] : []);
    }

    const clients = await prisma.client.findMany({
      where: withNotDeleted({
        status: status === "ACTIVE" || status === "DISABLED" ? status : undefined,
        OR: q
          ? [
              { fullName: { contains: q } },
              { email: { contains: q } },
              { company: { contains: q } },
            ]
          : undefined,
      }),
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { projects: true, agreements: true } } },
    });
    return jsonOk(clients);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = clientSchema.parse(await request.json());
    const client = await prisma.client.create({ data: body });
    return jsonOk(client, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
