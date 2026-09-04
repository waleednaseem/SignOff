import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { handleProposalError, serializeProposal, submitProposal } from "@/lib/proposals";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") return jsonError("FORBIDDEN", "Only the client can submit a proposal.", 403);
    const { id, versionId } = await params;
    const proposal = await submitProposal(id, versionId, user.id);
    return jsonOk(serializeProposal(proposal));
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}
