import { getClientIp, handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { signSchema } from "@/lib/validators";
import { signCurrentVersion } from "@/lib/sign";
import { prisma } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!agreement) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You cannot sign this agreement.", 403);
    }
    const body = signSchema.parse(await request.json());
    const result = await signCurrentVersion({
      agreementId: id,
      versionId: body.versionId,
      signerName: body.signerName,
      email: body.email,
      typedName: body.typedName,
      imageData: body.imageData,
      ipAddress: getClientIp(request),
      userId: user.id,
      isAnonymous: false,
    });
    if ("error" in result && result.error) return result.error;
    return jsonOk({ signed: true, hash: result.hash, number: result.agreementNumber });
  } catch (error) {
    return handleRouteError(error);
  }
}
