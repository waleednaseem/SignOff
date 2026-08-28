import { computePricing } from "@/lib/agreement-public";
import { toNumber } from "@/lib/utils";

export function serialize(agreement: any, isAdmin: boolean) {
  if (!agreement) return null;
  const version = agreement.currentVersion;
  return {
    ...agreement,
    internalNotes: isAdmin ? agreement.internalNotes : undefined,
    client: isAdmin ? agreement.client : { ...agreement.client, notes: undefined },
    project: isAdmin ? agreement.project : { ...agreement.project, internalNotes: undefined },
    pricing: version
      ? computePricing(version.priceItems ?? [], version.discountAmount, version.taxPercent)
      : null,
    currentVersion: version
      ? {
          ...version,
          discountAmount: toNumber(version.discountAmount),
          taxPercent: toNumber(version.taxPercent),
          priceItems: version.priceItems?.map((item: any) => ({ ...item, amount: toNumber(item.amount) })),
          milestones: version.milestones?.map((item: any) => ({ ...item, amount: toNumber(item.amount) })),
        }
      : null,
  };
}
