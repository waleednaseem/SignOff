import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { acceptDelivery, handleDeliveryError } from "@/lib/delivery";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") return jsonError("FORBIDDEN", "Only the client can accept delivery.", 403);
    const { id } = await params;
    const result = await acceptDelivery({ agreementId: id, userId: user.id });
    return jsonOk(result);
  } catch (error) {
    return handleDeliveryError(error) ?? handleRouteError(error);
  }
}
