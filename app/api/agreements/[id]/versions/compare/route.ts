import { prisma } from "@/lib/db";
import { handleRouteError, jsonError, jsonOk, requireUser } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (!a || !b) return jsonError("VALIDATION_ERROR", "Query params a and b are required.", 400);

    const [left, right] = await Promise.all([
      prisma.agreementVersion.findFirst({
        where: { id: a, agreementId: id },
        include: {
          requirements: { orderBy: { order: "asc" } },
          priceItems: { orderBy: { order: "asc" } },
          terms: { orderBy: { order: "asc" } },
        },
      }),
      prisma.agreementVersion.findFirst({
        where: { id: b, agreementId: id },
        include: {
          requirements: { orderBy: { order: "asc" } },
          priceItems: { orderBy: { order: "asc" } },
          terms: { orderBy: { order: "asc" } },
        },
      }),
    ]);
    if (!left || !right) return jsonError("NOT_FOUND", "Version not found.", 404);

    const reqChanges = diffByTitle(left.requirements, right.requirements);
    const priceChanges = diffByTitle(
      left.priceItems.map((item) => ({ title: item.label, description: String(item.amount) })),
      right.priceItems.map((item) => ({ title: item.label, description: String(item.amount) })),
    );
    const termChanges = diffByTitle(left.terms, right.terms);

    return jsonOk({ left, right, reqChanges, priceChanges, termChanges });
  } catch (error) {
    return handleRouteError(error);
  }
}

function diffByTitle(left: Array<{ title: string; description?: string | null }>, right: Array<{ title: string; description?: string | null }>) {
  const leftMap = new Map(left.map((item) => [item.title, item]));
  const rightMap = new Map(right.map((item) => [item.title, item]));
  const added = right.filter((item) => !leftMap.has(item.title));
  const removed = left.filter((item) => !rightMap.has(item.title));
  const changed = right.filter((item) => {
    const prev = leftMap.get(item.title);
    return prev && prev.description !== item.description;
  });
  return { added, removed, changed };
}
