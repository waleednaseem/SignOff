import type { AgreementStatus, ChangeRequestStatus, ProjectStatus } from "@prisma/client";
import {
  AGREEMENT_STATUS_LABEL,
  AGREEMENT_STATUS_TONE,
  CR_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
} from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: AgreementStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", AGREEMENT_STATUS_TONE[status])}>
      {AGREEMENT_STATUS_LABEL[status]}
    </span>
  );
}

export function ProjectBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

export function CrBadge({ status }: { status: ChangeRequestStatus }) {
  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      {CR_STATUS_LABEL[status]}
    </span>
  );
}
