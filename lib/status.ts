import type { AgreementStatus, ChangeRequestStatus, ProjectStatus } from "@prisma/client";

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  CHANGES_REQUESTED: "Changes Requested",
  REVISION_IN_PROGRESS: "Revision In Progress",
  AWAITING_APPROVAL: "Awaiting Approval",
  AWAITING_SIGNATURE: "Awaiting Signature",
  SIGNED: "Signed",
  DELIVERY_REVIEW: "Delivery Review",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const AGREEMENT_STATUS_TONE: Record<AgreementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-sky-100 text-sky-800",
  VIEWED: "bg-indigo-100 text-indigo-800",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-800",
  REVISION_IN_PROGRESS: "bg-orange-100 text-orange-800",
  AWAITING_APPROVAL: "bg-violet-100 text-violet-800",
  AWAITING_SIGNATURE: "bg-teal-100 text-teal-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  DELIVERY_REVIEW: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-emerald-200 text-emerald-900",
  REJECTED: "bg-rose-100 text-rose-800",
  EXPIRED: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CR_STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export const SIGNABLE_STATUSES: AgreementStatus[] = [
  "SENT",
  "VIEWED",
  "AWAITING_APPROVAL",
  "AWAITING_SIGNATURE",
];

export const EDITABLE_IN_PLACE: AgreementStatus[] = ["DRAFT"];

export const LOCKED_STATUSES: AgreementStatus[] = ["SIGNED", "DELIVERY_REVIEW", "COMPLETED", "CANCELLED"];
