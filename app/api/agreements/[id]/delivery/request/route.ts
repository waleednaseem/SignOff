import { handleRouteError, jsonOk, requireAdmin } from "@/lib/api";
import { handleDeliveryError, requestDeliveryReview } from "@/lib/delivery";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const result = await requestDeliveryReview({ agreementId: id, adminId: admin.id });
    return jsonOk(result);
  } catch (error) {
    return handleDeliveryError(error) ?? handleRouteError(error);
  }
}
