export const CLIENT_HISTORY_EVENTS = [
  "AGREEMENT_SENT",
  "AGREEMENT_VIEWED",
  "CHANGE_REQUESTED",
  "COMMENT_ADDED",
  "APPROVAL_SUBMITTED",
  "AGREEMENT_SIGNED",
  "CHANGE_REQUEST_CREATED",
  "CHANGE_REQUEST_APPROVED",
  "CHANGE_REQUEST_REJECTED",
  "VERSION_CREATED",
  "PROPOSAL_SUBMITTED",
  "PROPOSAL_APPROVED",
  "PROPOSAL_REJECTED",
  "MILESTONE_COMPLETED",
  "DELIVERY_REVIEW_REQUESTED",
  "FINAL_SIGNOFF",
  "PROJECT_COMPLETED",
] as const;

export const CLIENT_HISTORY_LABEL: Record<string, string> = {
  AGREEMENT_SENT: "Agreement sent for review",
  AGREEMENT_VIEWED: "You opened this agreement",
  CHANGE_REQUESTED: "Changes requested",
  COMMENT_ADDED: "Comment added",
  APPROVAL_SUBMITTED: "Agreement approved",
  AGREEMENT_SIGNED: "Agreement signed",
  CHANGE_REQUEST_CREATED: "Change request submitted",
  CHANGE_REQUEST_APPROVED: "Change request approved",
  CHANGE_REQUEST_REJECTED: "Change request declined",
  VERSION_CREATED: "Updated version shared",
  PROPOSAL_SUBMITTED: "Full document proposal submitted",
  PROPOSAL_APPROVED: "Proposal accepted",
  PROPOSAL_REJECTED: "Proposal declined",
  MILESTONE_COMPLETED: "Milestone completed",
  DELIVERY_REVIEW_REQUESTED: "Delivery ready for your signoff",
  FINAL_SIGNOFF: "You accepted delivery and closed the project",
  PROJECT_COMPLETED: "Project completed",
};

export function isClientHistoryEvent(eventType: string) {
  return (CLIENT_HISTORY_EVENTS as readonly string[]).includes(eventType);
}

export function historyLabel(eventType: string) {
  return CLIENT_HISTORY_LABEL[eventType] ?? eventType.replaceAll("_", " ");
}
