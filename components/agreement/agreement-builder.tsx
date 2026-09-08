"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_TERMS } from "@/lib/terms";
import { computePricing } from "@/lib/agreement-public";
import { formatCurrency } from "@/lib/utils";

const ADMIN_STEPS = [
  "Client & project",
  "Description",
  "Scope",
  "Timeline",
  "Milestones",
  "Pricing",
  "Terms",
  "Review",
  "Send",
];

const NEGOTIATE_STEPS = [
  "Description",
  "Scope",
  "Timeline",
  "Milestones",
  "Pricing",
  "Terms",
  "Review",
];

type BuilderProps = { agreementId?: string; mode?: "admin" | "negotiate"; proposalId?: string };

export function AgreementBuilder({ agreementId, mode = "admin", proposalId }: BuilderProps) {
  const router = useRouter();
  const isNegotiate = mode === "negotiate";
  const STEPS = isNegotiate ? NEGOTIATE_STEPS : ADMIN_STEPS;
  const lastStep = STEPS.length - 1;
  const [step, setStep] = useState(agreementId && !isNegotiate ? 1 : 0);
  const pane = isNegotiate ? step + 1 : step;
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [id, setId] = useState(agreementId ?? "");
  const [saving, setSaving] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    // #region agent log
    const measure = () => {
      const footer = document.querySelector("[data-mobile-builder-footer]");
      const nav = document.querySelector("nav.fixed.inset-x-0.bottom-0");
      fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
        body: JSON.stringify({
          sessionId: "a2684c",
          runId: "mobile",
          hypothesisId: "M2",
          location: "agreement-builder.tsx:measure",
          message: "builder mobile layout",
          data: {
            mode,
            step,
            vw: window.innerWidth,
            vh: window.innerHeight,
            sw: document.documentElement.scrollWidth,
            overflowing: document.documentElement.scrollWidth > window.innerWidth + 1,
            footerBottom: footer ? getComputedStyle(footer as Element).bottom : null,
            footerVisible: footer ? getComputedStyle(footer as Element).display !== "none" : false,
            hasBottomNav: Boolean(nav),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => undefined);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // #endregion
  }, [mode, step]);
  const [form, setForm] = useState<any>({
    clientId: "",
    projectId: "",
    templateId: "",
    expiresAt: "",
    internalNotes: "",
    projectTitle: "",
    shortDescription: "",
    detailedDescription: "",
    objectives: "",
    startDate: "",
    estimatedCompletion: "",
    timelineDisclaimer:
      "Timeline estimates assume timely client approvals, content, and access. Delays on the client side may extend delivery dates.",
    currency: "USD",
    discountAmount: 0,
    taxPercent: 0,
    requirements: [] as any[],
    priceItems: [] as any[],
    milestones: [] as any[],
    terms: DEFAULT_TERMS,
    reasonForChange: "",
    changesSummary: "",
  });

  useEffect(() => {
    if (isNegotiate) return;
    apiFetch<any[]>("/api/clients").then(setClients).catch((err) => toast.error(err.message));
    apiFetch<any[]>("/api/templates").then(setTemplates).catch(() => undefined);
  }, [isNegotiate]);

  useEffect(() => {
    if (isNegotiate) return;
    if (!form.clientId) return;
    apiFetch<any[]>(`/api/projects?clientId=${form.clientId}`).then(setProjects).catch(() => undefined);
  }, [form.clientId, isNegotiate]);

  useEffect(() => {
    if (!agreementId) return;
    if (isNegotiate && proposalId) {
      apiFetch<any>(`/api/agreements/${agreementId}/proposals/${proposalId}`).then((v) => {
        setForm((prev: any) => ({
          ...prev,
          projectTitle: v?.projectTitle ?? "",
          shortDescription: v?.shortDescription ?? "",
          detailedDescription: v?.detailedDescription ?? "",
          objectives: v?.objectives ?? "",
          startDate: v?.startDate ? String(v.startDate).slice(0, 10) : "",
          estimatedCompletion: v?.estimatedCompletion ? String(v.estimatedCompletion).slice(0, 10) : "",
          timelineDisclaimer: v?.timelineDisclaimer ?? prev.timelineDisclaimer,
          currency: v?.currency ?? "USD",
          discountAmount: v?.discountAmount ?? 0,
          taxPercent: v?.taxPercent ?? 0,
          requirements: v?.requirements ?? [],
          priceItems: v?.priceItems ?? [],
          milestones: v?.milestones ?? [],
          terms: v?.terms?.length ? v.terms : DEFAULT_TERMS,
          reasonForChange: v?.reasonForChange ?? prev.reasonForChange,
          changesSummary: v?.changesSummary ?? "",
        }));
      }).catch((err) => toast.error(err.message));
      return;
    }
    apiFetch<any>(`/api/agreements/${agreementId}`).then((data) => {
      const v = data.currentVersion;
      setForm((prev: any) => ({
        ...prev,
        clientId: data.clientId,
        projectId: data.projectId,
        expiresAt: data.expiresAt ? String(data.expiresAt).slice(0, 10) : "",
        internalNotes: data.internalNotes ?? "",
        projectTitle: v?.projectTitle ?? "",
        shortDescription: v?.shortDescription ?? "",
        detailedDescription: v?.detailedDescription ?? "",
        objectives: v?.objectives ?? "",
        startDate: v?.startDate ? String(v.startDate).slice(0, 10) : "",
        estimatedCompletion: v?.estimatedCompletion ? String(v.estimatedCompletion).slice(0, 10) : "",
        timelineDisclaimer: v?.timelineDisclaimer ?? prev.timelineDisclaimer,
        currency: v?.currency ?? "USD",
        discountAmount: v?.discountAmount ?? 0,
        taxPercent: v?.taxPercent ?? 0,
        requirements: v?.requirements ?? [],
        priceItems: v?.priceItems ?? [],
        milestones: v?.milestones ?? [],
        terms: v?.terms?.length ? v.terms : DEFAULT_TERMS,
      }));
    });
  }, [agreementId, isNegotiate, proposalId]);

  const pricing = useMemo(
    () => computePricing(form.priceItems, form.discountAmount, form.taxPercent),
    [form.priceItems, form.discountAmount, form.taxPercent],
  );

  async function persist() {
    setSaving(true);
    try {
      if (!id) {
        const created = await apiFetch<any>("/api/agreements", {
          method: "POST",
          body: JSON.stringify({
            clientId: form.clientId,
            projectId: form.projectId,
            templateId: form.templateId || null,
            expiresAt: form.expiresAt || null,
          }),
        });
        setId(created.id);
        router.replace(`/agreements/${created.id}/edit`);
        return created.id;
      }
      if (isNegotiate && proposalId) {
        const { internalNotes: _notes, clientId: _c, projectId: _p, templateId: _t, expiresAt: _e, ...draft } = form;
        await apiFetch(`/api/agreements/${id}/proposals/${proposalId}`, { method: "PATCH", body: JSON.stringify(draft) });
        return id;
      }
      await apiFetch(`/api/agreements/${id}`, { method: "PATCH", body: JSON.stringify(form) });
      return id;
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (step === 0 && (!form.clientId || !form.projectId)) {
      toast.error("Select a client and project");
      return;
    }
    const currentId = await persist();
    if (currentId) setStep((s) => Math.min(s + 1, lastStep));
  }

  async function submitProposal() {
    const currentId = await persist();
    if (!currentId || !proposalId) return;
    await apiFetch(`/api/agreements/${currentId}/proposals/${proposalId}/submit`, { method: "POST" });
    toast.success("Proposal submitted for review");
    router.push(`/agreements/${currentId}`);
  }

  async function send() {
    const currentId = await persist();
    const result = await apiFetch<{ link: string }>(`/api/agreements/${currentId}/send`, { method: "POST" });
    setLink(result.link);
    toast.success("Agreement sent");
  }

  return (
    <div className="min-w-0 pb-36 md:pb-0">
      <div className="sticky top-14 z-10 -mx-1 mb-4 bg-[#f4f1ea]/95 px-1 py-2 backdrop-blur sm:static sm:bg-transparent sm:backdrop-blur-none lg:top-0">
        <p className="mb-2 text-xs font-medium text-slate-500 sm:hidden">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium touch-manipulation ${
                index === step ? "bg-teal-700 text-white" : "bg-white text-slate-600 shadow-sm"
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="space-y-4">
          {pane === 0 && (
            <>
              <div>
                <Label>Client</Label>
                <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, projectId: "" })}>
                  <option value="">Select</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.fullName}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Project</Label>
                <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">Select</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                  <option value="">Blank</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Expiry date</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <div>
                <Label>Internal notes</Label>
                <Textarea value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
              </div>
            </>
          )}

          {pane === 1 && (
            <>
              <Input placeholder="Project title" value={form.projectTitle} onChange={(e) => setForm({ ...form, projectTitle: e.target.value })} />
              <Input placeholder="Short description" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              <Textarea placeholder="Detailed description" value={form.detailedDescription} onChange={(e) => setForm({ ...form, detailedDescription: e.target.value })} />
              <Textarea placeholder="Objectives" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
            </>
          )}

          {pane === 2 && (
            <div className="space-y-3">
              {form.requirements.map((item: any, index: number) => (
                <div key={index} className="rounded-xl border p-3">
                  <div className="mb-2 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      if (index === 0) return;
                      const requirements = [...form.requirements];
                      [requirements[index - 1], requirements[index]] = [requirements[index], requirements[index - 1]];
                      setForm({ ...form, requirements });
                    }}>Up</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      if (index === form.requirements.length - 1) return;
                      const requirements = [...form.requirements];
                      [requirements[index + 1], requirements[index]] = [requirements[index], requirements[index + 1]];
                      setForm({ ...form, requirements });
                    }}>Down</Button>
                  </div>
                  <Input className="mb-2" value={item.title} placeholder="Feature title" onChange={(e) => {
                    const requirements = [...form.requirements];
                    requirements[index] = { ...item, title: e.target.value };
                    setForm({ ...form, requirements });
                  }} />
                  <Textarea className="mb-2" value={item.description ?? ""} placeholder="Description" onChange={(e) => {
                    const requirements = [...form.requirements];
                    requirements[index] = { ...item, description: e.target.value };
                    setForm({ ...form, requirements });
                  }} />
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input value={item.category ?? ""} placeholder="Category" onChange={(e) => {
                      const requirements = [...form.requirements];
                      requirements[index] = { ...item, category: e.target.value };
                      setForm({ ...form, requirements });
                    }} />
                    <Select value={item.inclusion} onChange={(e) => {
                      const requirements = [...form.requirements];
                      requirements[index] = { ...item, inclusion: e.target.value };
                      setForm({ ...form, requirements });
                    }}>
                      <option>INCLUDED</option>
                      <option>EXCLUDED</option>
                      <option>OPTIONAL</option>
                    </Select>
                    <Input value={item.estimatedEffort ?? ""} placeholder="Effort" onChange={(e) => {
                      const requirements = [...form.requirements];
                      requirements[index] = { ...item, estimatedEffort: e.target.value };
                      setForm({ ...form, requirements });
                    }} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({
                ...form,
                requirements: [...form.requirements, { title: "", description: "", category: "", inclusion: "INCLUDED", estimatedEffort: "", notes: "" }],
              })}>
                Add feature
              </Button>
            </div>
          )}

          {pane === 3 && (
            <>
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              <Label>Estimated completion</Label>
              <Input type="date" value={form.estimatedCompletion} onChange={(e) => setForm({ ...form, estimatedCompletion: e.target.value })} />
              <Textarea value={form.timelineDisclaimer} onChange={(e) => setForm({ ...form, timelineDisclaimer: e.target.value })} />
            </>
          )}

          {pane === 4 && (
            <div className="space-y-3">
              {form.milestones.map((item: any, index: number) => (
                <div key={index} className="grid gap-2 rounded-xl border p-3 md:grid-cols-2">
                  <Input value={item.name} placeholder="Milestone name" onChange={(e) => {
                    const milestones = [...form.milestones];
                    milestones[index] = { ...item, name: e.target.value };
                    setForm({ ...form, milestones });
                  }} />
                  <Input type="number" value={item.amount} placeholder="Amount" onChange={(e) => {
                    const milestones = [...form.milestones];
                    milestones[index] = { ...item, amount: Number(e.target.value) };
                    setForm({ ...form, milestones });
                  }} />
                  <Input type="date" value={item.dueDate ? String(item.dueDate).slice(0, 10) : ""} onChange={(e) => {
                    const milestones = [...form.milestones];
                    milestones[index] = { ...item, dueDate: e.target.value };
                    setForm({ ...form, milestones });
                  }} />
                  <Input value={item.deliverables ?? ""} placeholder="Deliverables" onChange={(e) => {
                    const milestones = [...form.milestones];
                    milestones[index] = { ...item, deliverables: e.target.value };
                    setForm({ ...form, milestones });
                  }} />
                  <Textarea className="md:col-span-2" value={item.description ?? ""} placeholder="Description" onChange={(e) => {
                    const milestones = [...form.milestones];
                    milestones[index] = { ...item, description: e.target.value };
                    setForm({ ...form, milestones });
                  }} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({
                ...form,
                milestones: [...form.milestones, { name: "", description: "", dueDate: "", amount: 0, deliverables: "" }],
              })}>
                Add milestone
              </Button>
            </div>
          )}

          {pane === 5 && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
                <div>
                  <Label>Discount</Label>
                  <Input type="number" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input type="number" value={form.taxPercent} onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) })} />
                </div>
              </div>
              {form.priceItems.map((item: any, index: number) => (
                <div key={index} className="grid gap-2 md:grid-cols-3">
                  <Input value={item.label} placeholder="Label" onChange={(e) => {
                    const priceItems = [...form.priceItems];
                    priceItems[index] = { ...item, label: e.target.value };
                    setForm({ ...form, priceItems });
                  }} />
                  <Input type="number" value={item.amount} onChange={(e) => {
                    const priceItems = [...form.priceItems];
                    priceItems[index] = { ...item, amount: Number(e.target.value) };
                    setForm({ ...form, priceItems });
                  }} />
                  <Select value={item.type} onChange={(e) => {
                    const priceItems = [...form.priceItems];
                    priceItems[index] = { ...item, type: e.target.value };
                    setForm({ ...form, priceItems });
                  }}>
                    <option>INCLUDED</option>
                    <option>OPTIONAL</option>
                    <option>ADDITIONAL</option>
                    <option>DISCOUNT</option>
                  </Select>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({
                ...form,
                priceItems: [...form.priceItems, { label: "", amount: 0, type: "INCLUDED" }],
              })}>
                Add line
              </Button>
              <p className="text-lg font-semibold">Total {formatCurrency(pricing.total, form.currency)}</p>
            </div>
          )}

          {pane === 6 && (
            <div className="space-y-4">
              {form.terms.map((term: any, index: number) => (
                <div key={term.key ?? index}>
                  <Label>{term.title}</Label>
                  <Textarea value={term.content} onChange={(e) => {
                    const terms = [...form.terms];
                    terms[index] = { ...term, content: e.target.value };
                    setForm({ ...form, terms });
                  }} />
                </div>
              ))}
            </div>
          )}

          {pane === 7 && (
            <div className="space-y-2 text-sm">
              <p><strong>Title:</strong> {form.projectTitle}</p>
              <p><strong>Features:</strong> {form.requirements.length}</p>
              <p><strong>Milestones:</strong> {form.milestones.length}</p>
              <p><strong>Total:</strong> {formatCurrency(pricing.total, form.currency)}</p>
              {!isNegotiate ? (
                <p className="text-slate-500">Use Preview to see the client-facing document before sending.</p>
              ) : (
                <p className="text-slate-500">Submit this document for review. It does not change the current agreement until approved.</p>
              )}
              {id && !isNegotiate ? (
                <Button type="button" variant="outline" onClick={() => router.push(`/agreements/${id}/preview`)}>
                  Preview
                </Button>
              ) : null}
            </div>
          )}

          {pane === 8 && (
            <div className="space-y-3">
              <p>Sending generates a secure client link, records an audit event, and emails the client (stubbed to logs).</p>
              <Button type="button" onClick={send} disabled={saving}>Send agreement</Button>
              {link ? (
                <p className="break-all rounded-lg bg-teal-50 p-3 text-sm">{link}</p>
              ) : null}
            </div>
          )}

          <div className={`hidden justify-between gap-2 pt-4 ${isNegotiate ? "md:flex" : "lg:flex"}`}>
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => persist()} disabled={saving}>
                {saving ? "Saving..." : "Save draft"}
              </Button>
              {step < lastStep ? (
                <Button type="button" onClick={next}>
                  Next
                </Button>
              ) : isNegotiate ? (
                <Button type="button" onClick={submitProposal} disabled={saving}>
                  Submit proposal
                </Button>
              ) : pane === 8 ? (
                <Button type="button" onClick={send} disabled={saving}>
                  Send to client
                </Button>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <div
        data-mobile-builder-footer
        className={`fixed inset-x-0 bottom-[4.25rem] z-30 border-t border-stone-200 bg-white/95 pb-safe backdrop-blur ${
          isNegotiate ? "md:hidden" : "lg:hidden"
        }`}
      >
        <div className="mx-auto flex max-w-6xl gap-2 px-3 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 touch-manipulation"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
          >
            Back
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="touch-manipulation"
            onClick={() => persist()}
            disabled={saving}
          >
            {saving ? "..." : "Save"}
          </Button>
          {step < lastStep ? (
            <Button type="button" size="lg" className="flex-[1.4] touch-manipulation" onClick={next}>
              Next
            </Button>
          ) : isNegotiate ? (
            <Button
              type="button"
              size="lg"
              className="flex-[1.4] touch-manipulation"
              onClick={submitProposal}
              disabled={saving}
            >
              Submit
            </Button>
          ) : pane === 8 ? (
            <Button type="button" size="lg" className="flex-[1.4] touch-manipulation" onClick={send} disabled={saving}>
              Send
            </Button>
          ) : (
            <Button type="button" size="lg" className="flex-[1.4] touch-manipulation" onClick={next}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
