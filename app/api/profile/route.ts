import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireUser } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });
    return jsonOk({
      id: dbUser?.id,
      name: dbUser?.name,
      email: dbUser?.email,
      role: dbUser?.role,
      client: dbUser?.client,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: body.name },
    });
    if (body.client && user.role === "CLIENT") {
      await prisma.client.updateMany({
        where: { userId: user.id },
        data: {
          fullName: body.client.fullName ?? body.name,
          phone: body.client.phone,
          company: body.client.company,
          address: body.client.address,
          country: body.client.country,
        },
      });
    }
    return jsonOk({ id: updated.id, name: updated.name });
  } catch (error) {
    return handleRouteError(error);
  }
}
