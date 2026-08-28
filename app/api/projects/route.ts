import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { projectSchema } from "@/lib/validators";
import { notDeleted, withNotDeleted } from "@/lib/soft-delete";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const client = user.role === "CLIENT"
      ? await prisma.client.findFirst({ where: { userId: user.id, ...notDeleted } })
      : null;

    const projects = await prisma.project.findMany({
      where: withNotDeleted({
        clientId: user.role === "CLIENT" ? client?.id : clientId || undefined,
        status: status && status !== "ALL" ? (status as never) : undefined,
        OR: q
          ? [
              { name: { contains: q } },
              { description: { contains: q } },
            ]
          : undefined,
      }),
      include: { client: true, _count: { select: { agreements: true } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(projects);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = projectSchema.parse(await request.json());
    const project = await prisma.project.create({
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : null,
        expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : null,
      },
    });
    return jsonOk(project, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
