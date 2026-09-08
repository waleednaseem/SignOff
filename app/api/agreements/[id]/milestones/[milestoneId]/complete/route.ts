import { handleRouteError, jsonOk, requireAdmin } from "@/lib/api";
import { completeMilestone, handleDeliveryError } from "@/lib/delivery";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id, milestoneId } = await params;
    const result = await completeMilestone({
      agreementId: id,
      milestoneId,
      adminId: admin.id,
    });
    return jsonOk(result);
  } catch (error) {
    return handleDeliveryError(error) ?? handleRouteError(error);
  }
}
