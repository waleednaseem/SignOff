import { handleRouteError, jsonOk, requireAdmin } from "@/lib/api";
import { approveProposal, handleProposalError } from "@/lib/proposals";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id, versionId } = await params;
    const origin = new URL(request.url).origin;
    const result = await approveProposal(id, versionId, admin.id, origin);
    return jsonOk(result);
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}
