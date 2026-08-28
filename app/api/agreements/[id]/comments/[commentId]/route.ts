import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireUser } from "@/lib/api";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    await requireUser();
    const { commentId } = await params;
    const comment = await prisma.agreementComment.update({
      where: { id: commentId },
      data: { status: "RESOLVED" },
    });
    return jsonOk(comment);
  } catch (error) {
    return handleRouteError(error);
  }
}
