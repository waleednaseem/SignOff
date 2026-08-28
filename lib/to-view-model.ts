import type { AgreementViewModel } from "@/components/agreement/agreement-document";

export function toViewModel(data: any): AgreementViewModel {
  const v = data.currentVersion ?? data.version;
  return {
    number: data.number,
    status: data.status,
    expiresAt: data.expiresAt,
    client: data.client,
    project: data.project,
    version: {
      id: v.id,
      number: v.number ?? v.versionNumber,
      projectTitle: v.projectTitle,
      shortDescription: v.shortDescription,
      detailedDescription: v.detailedDescription,
      objectives: v.objectives,
      startDate: v.startDate,
      estimatedCompletion: v.estimatedCompletion,
      timelineDisclaimer: v.timelineDisclaimer,
      currency: v.currency,
      requirements: v.requirements ?? [],
      priceItems: v.priceItems ?? [],
      milestones: v.milestones ?? [],
      terms: v.terms ?? [],
      pricing: v.pricing ?? data.pricing,
      signed: v.signed ?? v.signatures?.[0] ?? null,
    },
  };
}
