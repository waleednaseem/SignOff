import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";
import {
  createOrResumeProposal,
  handleProposalError,
  listProposals,
  serializeProposal,
} from "@/lib/proposals";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const items = await listProposals(id, user.id, user.role);
    return jsonOk(items);
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (user.role !== "CLIENT") return jsonError("FORBIDDEN", "Only the client can start a negotiation.", 403);
    const { id } = await params;
    const proposal = await createOrResumeProposal(id, user.id);
    return jsonOk(serializeProposal(proposal), 201);
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}
