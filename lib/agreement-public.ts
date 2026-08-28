import { PriceItemType, RequirementInclusion } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export function computePricing(items: { amount: unknown; type: PriceItemType }[], discountAmount: unknown = 0, taxPercent: unknown = 0) {
  const included = items
    .filter((item) => item.type === "INCLUDED" || item.type === "ADDITIONAL")
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const optional = items
    .filter((item) => item.type === "OPTIONAL")
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const itemDiscounts = items
    .filter((item) => item.type === "DISCOUNT")
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const discount = itemDiscounts + toNumber(discountAmount);
  const subtotal = Math.max(included - discount, 0);
  const tax = subtotal * (toNumber(taxPercent) / 100);
  const total = subtotal + tax;
  return { included, optional, discount, subtotal, tax, total };
}

export function publicAgreementPayload(agreement: {
  id: string;
  number: string;
  status: string;
  expiresAt: Date | null;
  client: { fullName: string; email: string; company: string | null };
  project: { name: string; description: string | null };
  currentVersion: {
    id: string;
    versionNumber: number;
    projectTitle: string;
    shortDescription: string | null;
    detailedDescription: string | null;
    objectives: string | null;
    startDate: Date | null;
    estimatedCompletion: Date | null;
    timelineDisclaimer: string | null;
    currency: string;
    discountAmount: unknown;
    taxPercent: unknown;
    requirements: Array<{
      id: string;
      order: number;
      title: string;
      description: string | null;
      category: string | null;
      inclusion: RequirementInclusion;
      estimatedEffort: string | null;
      notes: string | null;
    }>;
    priceItems: Array<{ id: string; order: number; label: string; amount: unknown; type: PriceItemType }>;
    milestones: Array<{
      id: string;
      order: number;
      name: string;
      description: string | null;
      dueDate: Date | null;
      amount: unknown;
      deliverables: string | null;
    }>;
    terms: Array<{ id: string; order: number; key: string; title: string; content: string }>;
    signatures: Array<{ signerName: string; signedAt: Date; email: string }>;
  } | null;
}) {
  const version = agreement.currentVersion;
  if (!version) return null;
  const pricing = computePricing(version.priceItems, version.discountAmount, version.taxPercent);
  return {
    number: agreement.number,
    status: agreement.status,
    expiresAt: agreement.expiresAt,
    client: {
      fullName: agreement.client.fullName,
      email: agreement.client.email,
      company: agreement.client.company,
    },
    project: {
      name: agreement.project.name,
      description: agreement.project.description,
    },
    version: {
      id: version.id,
      number: version.versionNumber,
      projectTitle: version.projectTitle,
      shortDescription: version.shortDescription,
      detailedDescription: version.detailedDescription,
      objectives: version.objectives,
      startDate: version.startDate,
      estimatedCompletion: version.estimatedCompletion,
      timelineDisclaimer: version.timelineDisclaimer,
      currency: version.currency,
      discountAmount: toNumber(version.discountAmount),
      taxPercent: toNumber(version.taxPercent),
      requirements: version.requirements,
      priceItems: version.priceItems.map((item) => ({
        ...item,
        amount: toNumber(item.amount),
      })),
      milestones: version.milestones.map((item) => ({
        ...item,
        amount: toNumber(item.amount),
      })),
      terms: version.terms,
      signed: version.signatures[0]
        ? {
            signerName: version.signatures[0].signerName,
            signedAt: version.signatures[0].signedAt,
            email: version.signatures[0].email,
          }
        : null,
      pricing,
    },
  };
}
