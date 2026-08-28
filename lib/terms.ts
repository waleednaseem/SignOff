export type TermDraft = {
  key: string;
  title: string;
  content: string;
};

export const DEFAULT_TERMS: TermDraft[] = [
  {
    key: "payment_terms",
    title: "Payment terms",
    content:
      "An invoice is issued per the pricing schedule in this agreement. Unless otherwise stated, 50% is due to commence work and the remaining balance is due on delivery or per milestone. Overdue invoices may pause delivery.",
  },
  {
    key: "revision_policy",
    title: "Revision policy",
    content:
      "The quoted scope includes two rounds of reasonable revisions per deliverable. Additional revisions may be billed as additional work.",
  },
  {
    key: "cancellation_policy",
    title: "Cancellation policy",
    content:
      "Either party may cancel with written notice. Work completed up to the cancellation date is payable. Prepaid unused fees may be handled under the refund policy.",
  },
  {
    key: "refund_policy",
    title: "Refund policy",
    content:
      "Fees for work already performed are non-refundable. Unused prepaid amounts for work not started may be refunded at the provider's discretion.",
  },
  {
    key: "maintenance_support",
    title: "Maintenance and support",
    content:
      "Post-launch support is limited to defect fixes for 14 days after delivery unless a maintenance plan is purchased separately.",
  },
  {
    key: "hosting_domain",
    title: "Hosting and domain responsibility",
    content:
      "The client is responsible for domain registration, DNS, and hosting accounts unless explicitly included in this agreement.",
  },
  {
    key: "third_party_services",
    title: "Third-party services",
    content:
      "Third-party tools, plugins, licenses, and subscriptions are billed to the client at cost unless listed as included.",
  },
  {
    key: "api_costs",
    title: "API costs",
    content:
      "Usage-based API, SMS, email, or AI costs are the client's responsibility and are not included in the project fee unless specified.",
  },
  {
    key: "client_responsibilities",
    title: "Client responsibilities",
    content:
      "The client will provide timely content, access, approvals, and feedback. Delays in client input may shift the timeline.",
  },
  {
    key: "delivery_conditions",
    title: "Delivery conditions",
    content:
      "Delivery occurs when the agreed scope is made available for review in staging or the agreed environment.",
  },
  {
    key: "acceptance_criteria",
    title: "Acceptance criteria",
    content:
      "Deliverables are accepted if they match the agreed scope. Silence for 5 business days after delivery notice constitutes acceptance.",
  },
  {
    key: "intellectual_property",
    title: "Intellectual property",
    content:
      "Upon full payment, the client receives a license to use the delivered work for the intended project. Pre-existing tools, libraries, and know-how remain the provider's property.",
  },
  {
    key: "confidentiality",
    title: "Confidentiality",
    content:
      "Both parties will keep confidential information private and use it only to perform this agreement.",
  },
  {
    key: "additional_work",
    title: "Additional work",
    content:
      "Work outside the documented scope requires a written change request and may affect cost and timeline.",
  },
  {
    key: "change_request_policy",
    title: "Change request policy",
    content:
      "After signing, additional work is handled as a change request. Approved change requests do not alter the original signed agreement.",
  },
  {
    key: "delays",
    title: "Delays",
    content:
      "The timeline may change if the client delays approvals, content, access, or payments. The provider is not liable for delays caused by third parties.",
  },
  {
    key: "agreement_validity",
    title: "Agreement validity",
    content:
      "This agreement is valid until the stated expiry date. After expiry it cannot be approved or signed unless the provider extends it in writing.",
  },
];

export const DEFAULT_TIMELINE_DISCLAIMER =
  "Timeline estimates assume timely client approvals, content, and access. Delays on the client side may extend delivery dates.";
