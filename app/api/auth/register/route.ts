import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { notDeleted } from "@/lib/soft-delete";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return jsonError("DUPLICATE", "An account with this email already exists.", 409);

    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: "CLIENT",
      },
    });

    const client = await prisma.client.findFirst({
      where: {
        AND: [
          { email },
          notDeleted,
          { OR: [{ userId: { isSet: false } }, { userId: null }] },
        ],
      },
    });
    if (client) {
      await prisma.client.update({ where: { id: client.id }, data: { userId: user.id, fullName: body.name } });
    } else {
      await prisma.client.create({
        data: {
          userId: user.id,
          fullName: body.name,
          email,
          company: body.company,
        },
      });
    }

    return jsonOk({ id: user.id, email: user.email }, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError("VALIDATION_ERROR", "Invalid registration details.", 400, error);
    }
    return handleRouteError(error);
  }
}
