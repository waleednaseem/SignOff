import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireAdmin, requireUser } from "@/lib/api";
import { projectSchema } from "@/lib/validators";
import { notDeleted } from "@/lib/soft-delete";

async function canAccessProject(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...notDeleted },
    include: {
      client: true,
      agreements: { where: notDeleted, orderBy: { createdAt: "desc" } },
      changeRequests: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!project) return { error: jsonError("NOT_FOUND", "Project not found.", 404) };
  if (user.role === "CLIENT" && project.client.userId !== user.id) {
    return { error: jsonError("FORBIDDEN", "You do not have access to this project.", 403) };
  }
  return { user, project };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await canAccessProject(id);
    if ("error" in result && result.error) return result.error;
    const project = result.project!;
    if (result.user?.role === "CLIENT") {
      const { internalNotes: _hidden, ...safe } = project;
      return jsonOk({ ...safe, client: { ...project.client, notes: undefined } });
    }
    return jsonOk(project);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = projectSchema.partial().parse(await request.json());
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        expectedCompletion: body.expectedCompletion ? new Date(body.expectedCompletion) : undefined,
      },
    });
    return jsonOk(project);
  } catch (error) {
    return handleRouteError(error);
  }
}
