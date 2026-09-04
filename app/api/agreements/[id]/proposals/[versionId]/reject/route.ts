import { handleRouteError, jsonOk, requireAdmin } from "@/lib/api";
import { handleProposalError, rejectProposal } from "@/lib/proposals";
import { z } from "zod";

const schema = z.object({ note: z.string().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id, versionId } = await params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const result = await rejectProposal(id, versionId, admin.id, body.note);
    return jsonOk(result);
  } catch (error) {
    return handleProposalError(error) ?? handleRouteError(error);
  }
}
