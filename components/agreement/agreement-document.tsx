import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import type { AgreementStatus } from "@prisma/client";

export type AgreementViewModel = {
  number: string;
  status: AgreementStatus;
  expiresAt?: string | Date | null;
  client: { fullName: string; email: string; company?: string | null };
  project: { name: string };
  version: {
    id: string;
    number: number;
    projectTitle: string;
    shortDescription?: string | null;
    detailedDescription?: string | null;
    objectives?: string | null;
    startDate?: string | Date | null;
    estimatedCompletion?: string | Date | null;
    timelineDisclaimer?: string | null;
    currency: string;
    requirements: Array<{
      id: string;
      title: string;
      description?: string | null;
      category?: string | null;
      inclusion: string;
      estimatedEffort?: string | null;
      notes?: string | null;
    }>;
    priceItems: Array<{ id: string; label: string; amount: number; type: string }>;
    milestones: Array<{
      id: string;
      name: string;
      description?: string | null;
      dueDate?: string | Date | null;
      amount: number;
      deliverables?: string | null;
    }>;
    terms: Array<{ id: string; title: string; content: string }>;
    pricing: { included: number; optional: number; discount: number; subtotal: number; tax: number; total: number };
    signed?: { signerName: string; signedAt: string | Date; email: string } | null;
  };
};

const STEPS = ["Review", "Changes", "Approval", "Signature", "Completed"];

export function progressIndex(status: AgreementStatus) {
  if (status === "SIGNED") return 4;
  if (status === "AWAITING_SIGNATURE") return 3;
  if (status === "AWAITING_APPROVAL") return 2;
  if (status === "CHANGES_REQUESTED" || status === "REVISION_IN_PROGRESS") return 1;
  return 0;
}

export function AgreementDocument({
  agreement,
  comments,
  onComment,
}: {
  agreement: AgreementViewModel;
  comments?: Array<{ id: string; requirementId?: string | null; authorName: string; text: string; createdAt: string }>;
  onComment?: (requirementId: string, text: string) => void;
}) {
  const { version } = agreement;
  const step = progressIndex(agreement.status);

  return (
    <article className="agreement-serif mx-auto w-full min-w-0 max-w-4xl overflow-hidden rounded-3xl border bg-white p-4 shadow-sm sm:p-6 md:p-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-700">Project agreement</p>
          <h1 className="mt-1 break-words text-2xl font-semibold sm:text-3xl">{version.projectTitle || agreement.project.name}</h1>
          <p className="mt-2 text-slate-500">
            {agreement.number} · Version {version.number}
          </p>
        </div>
        <StatusBadge status={agreement.status} />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1 text-xs ${index <= step ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}
          >
            {label}
          </span>
        ))}
      </div>

      <section className="mb-8 space-y-2">
        <h2 className="text-xl font-semibold text-teal-900">1. Project overview</h2>
        <p><strong>Client:</strong> {agreement.client.fullName} · {agreement.client.email}</p>
        {agreement.client.company ? <p><strong>Company:</strong> {agreement.client.company}</p> : null}
        <p><strong>Project:</strong> {agreement.project.name}</p>
        {agreement.expiresAt ? <p><strong>Valid until:</strong> {formatDate(agreement.expiresAt)}</p> : null}
        {version.shortDescription ? <p>{version.shortDescription}</p> : null}
        {version.detailedDescription ? <p className="whitespace-pre-wrap text-slate-700">{version.detailedDescription}</p> : null}
        {version.objectives ? <p><strong>Objectives:</strong> {version.objectives}</p> : null}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-teal-900">2. Scope and features</h2>
        <div className="mt-4 space-y-3">
          {version.requirements.map((item, index) => (
            <div key={item.id} className="rounded-2xl border p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <h3 className="min-w-0 break-words font-semibold">
                  Feature #{index + 1}: {item.title}
                </h3>
                <span className="text-xs uppercase text-slate-500">{item.inclusion}</span>
              </div>
              {item.category ? <p className="text-xs text-slate-500">{item.category}</p> : null}
              {item.description ? <p className="mt-2 text-slate-700">{item.description}</p> : null}
              {item.estimatedEffort ? <p className="text-sm">Effort: {item.estimatedEffort}</p> : null}
              {onComment ? (
                <CommentBox
                  onSubmit={(text) => onComment(item.id, text)}
                  existing={comments?.filter((c) => c.requirementId === item.id)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-teal-900">3. Timeline</h2>
        <p>Start: {formatDate(version.startDate)}</p>
        <p>Estimated completion: {formatDate(version.estimatedCompletion)}</p>
        <p className="mt-2 text-sm italic text-slate-600">{version.timelineDisclaimer}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-teal-900">4. Milestones</h2>
        <div className="mt-4 space-y-3">
          {version.milestones.map((item, index) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex min-w-0 justify-between gap-3">
                <strong className="min-w-0 break-words">
                  Milestone {index + 1}: {item.name}
                </strong>
                <span>{formatCurrency(item.amount, version.currency)}</span>
              </div>
              <p className="text-sm text-slate-600">Due {formatDate(item.dueDate)}</p>
              {item.description ? <p className="mt-1">{item.description}</p> : null}
              {item.deliverables ? <p className="text-sm">Deliverables: {item.deliverables}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-teal-900">5. Pricing</h2>
        <div className="mt-3 space-y-2">
          {version.priceItems.map((item) => (
            <div key={item.id} className="flex min-w-0 justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">
                {item.label} <span className="text-slate-400">({item.type})</span>
              </span>
              <span>{formatCurrency(toNumber(item.amount), version.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-teal-50 p-4">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(version.pricing.subtotal, version.currency)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(version.pricing.discount, version.currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(version.pricing.tax, version.currency)}</span></div>
          <div className="mt-2 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(version.pricing.total, version.currency)}</span>
          </div>
          {version.pricing.optional > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Optional items not included: {formatCurrency(version.pricing.optional, version.currency)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-teal-900">6. Terms and additional conditions</h2>
        <div className="mt-4 space-y-4">
          {version.terms.map((term) => (
            <div key={term.id}>
              <h3 className="font-semibold">{term.title}</h3>
              <p className="whitespace-pre-wrap text-slate-700">{term.content}</p>
            </div>
          ))}
        </div>
      </section>

      {version.signed ? (
        <section>
          <h2 className="text-xl font-semibold text-teal-900">Signature</h2>
          <p>
            Signed by {version.signed.signerName} ({version.signed.email}) on {formatDate(version.signed.signedAt)}
          </p>
        </section>
      ) : null}
    </article>
  );
}

function CommentBox({
  onSubmit,
  existing,
}: {
  onSubmit: (text: string) => void;
  existing?: Array<{ id: string; authorName: string; text: string }>;
}) {
  return (
    <div className="mt-3 border-t pt-3 font-sans text-sm">
      {existing?.map((item) => (
        <p key={item.id} className="text-slate-600">
          <strong>{item.authorName}:</strong> {item.text}
        </p>
      ))}
      <form
        className="mt-2 flex min-w-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const value = String(new FormData(form).get("text") ?? "");
          if (value.trim()) onSubmit(value);
          form.reset();
        }}
      >
        <input name="text" className="h-9 min-w-0 flex-1 rounded-lg border px-3" placeholder="Comment on this feature" />
        <button className="rounded-lg bg-slate-900 px-3 text-white">Add</button>
      </form>
    </div>
  );
}
