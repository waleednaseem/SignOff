import { prisma } from "@/lib/db";
import type { PriceItemType, RequirementInclusion } from "@prisma/client";

export async function attachVersionChildren(
  versionId: string,
  input: {
    requirements?: Array<{
      order: number;
      title: string;
      description?: string | null;
      category?: string | null;
      inclusion: RequirementInclusion;
      estimatedEffort?: string | null;
      notes?: string | null;
    }>;
    priceItems?: Array<{ order: number; label: string; amount: number; type: PriceItemType }>;
    milestones?: Array<{
      order: number;
      name: string;
      description?: string | null;
      dueDate?: Date | null;
      amount: number;
      deliverables?: string | null;
    }>;
    terms?: Array<{ order: number; key: string; title: string; content: string }>;
  },
) {
  if (input.requirements?.length) {
    await prisma.requirement.createMany({ data: input.requirements.map((item) => ({ ...item, versionId })) });
  }
  if (input.priceItems?.length) {
    await prisma.priceItem.createMany({ data: input.priceItems.map((item) => ({ ...item, versionId })) });
  }
  if (input.milestones?.length) {
    await prisma.milestone.createMany({ data: input.milestones.map((item) => ({ ...item, versionId })) });
  }
  if (input.terms?.length) {
    await prisma.term.createMany({ data: input.terms.map((item) => ({ ...item, versionId })) });
  }
}
