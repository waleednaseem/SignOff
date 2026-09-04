import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import { proposalDraftSchema } from "@/lib/validators";
import {
  getProposal,
  handleProposalError,
  saveProposal,
  serializeProposal,
} from "@/lib/proposals";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const user = await requireUser();
    const { id, versionId } = await params;
    const proposal = await getProposal(id, versionId, user.id, user.role);
    if (!proposal) return jsonError("NOT_FOUND", "Proposal not found.", 404);
    return jsonOk(serializeProposal(proposal));
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") return jsonError("FORBIDDEN", "Only the client can edit a proposal.", 403);
    const { id, versionId } = await params;
    const body = proposalDraftSchema.parse(await request.json());
    const proposal = await saveProposal(id, versionId, user.id, body);
    return jsonOk(serializeProposal(proposal));
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}
