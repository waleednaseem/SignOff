import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, requireUser } from "@/lib/api";
import { generateAgreementPdfBuffer } from "@/lib/pdf/generate";
import { readFile } from "fs/promises";
import path from "path";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const agreement = await prisma.agreement.findFirst({
      where: { id, ...notDeleted },
      include: {
        client: true,
        project: true,
        currentVersion: {
          include: {
            requirements: { orderBy: { order: "asc" } },
            priceItems: { orderBy: { order: "asc" } },
            milestones: { orderBy: { order: "asc" } },
            terms: { orderBy: { order: "asc" } },
            signatures: true,
          },
        },
      },
    });
    if (!agreement?.currentVersion) return jsonError("NOT_FOUND", "Agreement not found.", 404);
    if (user.role === "CLIENT" && agreement.client.userId !== user.id) {
      return jsonError("FORBIDDEN", "You do not have access to this agreement.", 403);
    }

    const signature = agreement.currentVersion.signatures[0];
    if (signature?.pdfPath) {
      try {
        const file = await readFile(path.join(process.cwd(), signature.pdfPath));
        return new Response(file, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${agreement.number}-v${agreement.currentVersion.versionNumber}.pdf"`,
          },
        });
      } catch {
        // regenerate below
      }
    }

    const buffer = await generateAgreementPdfBuffer({
      agreement,
      version: agreement.currentVersion,
      client: agreement.client,
      project: agreement.project,
      signature,
    });
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${agreement.number}-v${agreement.currentVersion.versionNumber}.pdf"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
