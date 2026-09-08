"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { AgreementDocument } from "@/components/agreement/agreement-document";
import { ClientSignPanel } from "@/components/agreement/client-sign-panel";
import { apiFetch } from "@/lib/api-client";
import { toViewModel } from "@/lib/to-view-model";
import { formatDateTime } from "@/lib/utils";

const SIGNABLE = new Set(["SENT", "VIEWED", "AWAITING_APPROVAL", "AWAITING_SIGNATURE"]);

export default function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [data, setData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [diff, setDiff] = useState<any>(null);
  const [link, setLink] = useState("");
  const [changeText, setChangeText] = useState("");
  const [signature, setSignature] = useState("");
  const [typedName, setTypedName] = useState(session?.user?.name ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);

  async function load() {
    const agreement = await apiFetch<any>(`/api/agreements/${id}`);
    setData(agreement);
    setProposals(agreement.proposals ?? []);
    const list = await apiFetch<any[]>(`/api/agreements/${id}/comments`).catch(() => []);
    setComments(list.flatMap((item) => [item, ...(item.replies ?? [])]));
    const trail = await apiFetch<any[]>(`/api/agreements/${id}/history`).catch(() => []);
    setHistory(trail);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, [id]);

  if (!data?.currentVersion) return <p>Loading...</p>;
  const view = toViewModel(data);
  const canSign = SIGNABLE.has(data.status);

  async function send() {
    const result = await apiFetch<{ link: string }>(`/api/agreements/${id}/send`, { method: "POST" });
    setLink(result.link);
    toast.success("Sent");
    load().catch(() => undefined);
  }

  const documentBlock = (
    <AgreementDocument
      agreement={view}
      comments={comments}
      onComment={async (requirementId, text) => {
        await apiFetch(`/api/agreements/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ requirementId, text }),
        });
        toast.success("Comment added");
        load().catch(() => undefined);
      }}
    />
  );

  if (!isAdmin) {
    return (
      <div>
        <PageHeader
          title={data.number}
          description={data.currentVersion.projectTitle}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href={`/agreements/${id}/negotiate`}>
                <Button>{data.status === "SIGNED" ? "Request additional work" : "Negotiate"}</Button>
              </Link>
              <Link href={`/agreements/${id}/versions`}><Button variant="ghost">Updates</Button></Link>
              <a href={`/api/agreements/${id}/pdf`}><Button variant="secondary">Download PDF</Button></a>
            </div>
          }
        />
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="min-w-0">{documentBlock}</div>
          <div className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            {canSign ? (
              <ClientSignPanel
                changeText={changeText}
                onChangeText={setChangeText}
                typedName={typedName}
                onTypedName={setTypedName}
                confirmed={confirmed}
                onConfirmed={setConfirmed}
                onSignature={setSignature}
                signing={signing}
                canSign={confirmed && Boolean(signature) && Boolean(typedName)}
                negotiateHref={`/agreements/${id}/negotiate`}
                onRequestChanges={async () => {
                  await apiFetch(`/api/agreements/${id}/request-changes`, {
                    method: "POST",
                    body: JSON.stringify({ text: changeText || "Please revise this agreement." }),
                  });
                  toast.success("Change request sent");
                  load().catch(() => undefined);
                }}
                onApprove={async () => {
                  await apiFetch(`/api/agreements/${id}/approve`, { method: "POST" });
                  toast.success("Approved. You can sign below.");
                  load().catch(() => undefined);
                }}
                onSign={async () => {
                  setSigning(true);
                  try {
                    await apiFetch(`/api/agreements/${id}/sign`, {
                      method: "POST",
                      body: JSON.stringify({
                        versionId: data.currentVersion.id,
                        signerName: typedName,
                        email: session?.user?.email,
                        typedName,
                        imageData: signature,
                        confirmed: true,
                      }),
                    });
                    toast.success("Agreement signed");
                    router.refresh();
                    await load();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not sign");
                  } finally {
                    setSigning(false);
                  }
                }}
              />
            ) : data.status === "DELIVERY_REVIEW" ? (
              <Card className="border-cyan-200">
                <CardBody className="space-y-3">
                  <h3 className="font-semibold">Final delivery signoff</h3>
                  <p className="text-sm text-slate-500">
                    All milestones are complete. Accept delivery to close this project.
                  </p>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await apiFetch(`/api/agreements/${id}/delivery/accept`, { method: "POST" });
                      toast.success("Project closed. Thank you.");
                      load().catch(() => undefined);
                    }}
                  >
                    Accept delivery & close project
                  </Button>
                </CardBody>
              </Card>
            ) : data.status === "COMPLETED" ? (
              <Card>
                <CardBody className="space-y-2">
                  <h3 className="font-semibold">Project completed</h3>
                  <p className="text-sm text-slate-500">You accepted delivery. This agreement is closed.</p>
                </CardBody>
              </Card>
            ) : data.status === "SIGNED" ? (
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="font-semibold">This agreement is signed</h3>
                  <p className="text-sm text-slate-500">The signed version is locked. Extra work is a new linked agreement after review.</p>
                  <div className="space-y-2">
                    {(data.currentVersion.milestones ?? []).map((m: any) => (
                      <div key={m.id} className="flex justify-between gap-2 text-sm">
                        <span>{m.name}</span>
                        <span className={m.status === "COMPLETED" ? "text-emerald-700" : "text-slate-500"}>
                          {m.status === "COMPLETED" ? "Completed" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link href={`/agreements/${id}/negotiate`}><Button className="w-full">Request additional work</Button></Link>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="font-semibold">Waiting on an update</h3>
                  <p className="mt-1 text-sm text-slate-500">You will be able to sign again when a new version is sent.</p>
                  <Link href={`/agreements/${id}/negotiate`}><Button variant="outline" className="w-full">Negotiate</Button></Link>
                </CardBody>
              </Card>
            )}
            {proposals.length ? (
              <Card>
                <CardBody>
                  <h3 className="mb-3 font-semibold">Your proposals</h3>
                  <ul className="space-y-2 text-sm">
                    {proposals.map((item: any) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span>v{item.versionNumber}</span>
                        <span className="text-slate-500">{item.proposalStatus?.replaceAll("_", " ")}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : null}
            <Card>
              <CardBody>
                <h3 className="mb-3 font-semibold">History</h3>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <ol className="space-y-3">
                    {history.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        <p className="text-sm font-medium">{item.label ?? item.eventType.replaceAll("_", " ")}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <Link href="/history" className="mt-3 inline-block text-sm text-teal-800 hover:underline">
                  View all history
                </Link>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={data.number}
        description={data.currentVersion.projectTitle}
        actions={
          <div className="flex flex-wrap gap-2">
            {!["SIGNED", "DELIVERY_REVIEW", "COMPLETED"].includes(data.status) ? (
              <>
                <Link href={`/agreements/${id}/edit`}><Button variant="outline">Edit</Button></Link>
                <Link href={`/agreements/${id}/preview`}><Button variant="outline">Preview</Button></Link>
                <Button onClick={send}>Send / generate link</Button>
                <Button variant="outline" onClick={async () => {
                  await fetch(`/api/agreements/${id}/link`, { method: "DELETE" });
                  toast.success("Link revoked");
                }}>Revoke link</Button>
                <Button variant="outline" onClick={async () => {
                  const next = prompt("New expiry date (YYYY-MM-DD)");
                  if (!next) return;
                  await apiFetch(`/api/agreements/${id}/extend`, { method: "POST", body: JSON.stringify({ expiresAt: next }) });
                  toast.success("Expiry updated");
                  load().catch(() => undefined);
                }}>Extend expiry</Button>
                <Button variant="ghost" onClick={async () => {
                  const copy = await apiFetch<{ id: string }>(`/api/agreements/${id}/duplicate`, { method: "POST" });
                  toast.success("Duplicated");
                  router.push(`/agreements/${copy.id}/edit`);
                }}>Duplicate</Button>
              </>
            ) : null}
            <Link href={`/agreements/${id}/history`}><Button variant="ghost">History</Button></Link>
            <Link href={`/agreements/${id}/versions`}><Button variant="ghost">Versions</Button></Link>
            <a href={`/api/agreements/${id}/pdf`}><Button variant="secondary">Download PDF</Button></a>
          </div>
        }
      />
      {link ? <p className="mb-4 break-all rounded-lg bg-teal-50 p-3 text-sm">{link}</p> : null}
      {data.internalNotes ? (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardBody>
            <p className="text-xs uppercase text-amber-800">Admin notes (never shown to client)</p>
            <p>{data.internalNotes}</p>
          </CardBody>
        </Card>
      ) : null}
      {data.parentAgreement ? (
        <p className="mb-4 text-sm text-slate-600">
          Extra work linked to{" "}
          <Link className="text-teal-800 hover:underline" href={`/agreements/${data.parentAgreement.id}`}>
            {data.parentAgreement.number}
          </Link>
        </p>
      ) : null}
      {data.childAgreements?.length ? (
        <p className="mb-4 text-sm text-slate-600">
          Linked agreements:{" "}
          {data.childAgreements.map((child: any) => (
            <Link key={child.id} className="mr-2 text-teal-800 hover:underline" href={`/agreements/${child.id}`}>
              {child.number}
            </Link>
          ))}
        </p>
      ) : null}
      {proposals.length ? (
        <Card className="mb-4">
          <CardBody className="space-y-3">
            <h3 className="font-semibold">Negotiations</h3>
            {proposals.map((item: any) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <div>
                  <p className="font-medium">Proposal v{item.versionNumber}</p>
                  <p className="text-slate-500">{item.proposalStatus?.replaceAll("_", " ")} · {item.createdBy?.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    if (!data.currentVersion?.id) return;
                    setDiff(await apiFetch(`/api/agreements/${id}/versions/compare?a=${data.currentVersion.id}&b=${item.id}`));
                  }}>Compare</Button>
                  {item.proposalStatus === "SUBMITTED" ? (
                    <>
                      <Button size="sm" onClick={async () => {
                        const result = await apiFetch<{ link?: string; childAgreement?: { number: string } }>(
                          `/api/agreements/${id}/proposals/${item.id}/approve`,
                          { method: "POST" },
                        );
                        toast.success(result.childAgreement ? `Created ${result.childAgreement.number}` : "Proposal accepted");
                        if (result.link) setLink(result.link);
                        load().catch(() => undefined);
                      }}>Approve</Button>
                      <Button variant="outline" size="sm" onClick={async () => {
                        const note = prompt("Rejection note (optional)") ?? "";
                        await apiFetch(`/api/agreements/${id}/proposals/${item.id}/reject`, {
                          method: "POST",
                          body: JSON.stringify({ note }),
                        });
                        toast.success("Proposal declined");
                        load().catch(() => undefined);
                      }}>Reject</Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {diff ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="font-semibold">Added</p>
                  {diff.reqChanges.added.map((row: any) => <p key={row.title} className="text-sm">{row.title}</p>)}
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="font-semibold">Removed</p>
                  {diff.reqChanges.removed.map((row: any) => <p key={row.title} className="text-sm">{row.title}</p>)}
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold">Changed</p>
                  {diff.reqChanges.changed.map((row: any) => <p key={row.title} className="text-sm">{row.title}</p>)}
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
      {data.status === "SIGNED" || data.status === "DELIVERY_REVIEW" || data.status === "COMPLETED" ? (
        <Card className="mb-4">
          <CardBody className="space-y-3">
            <h3 className="font-semibold">Delivery milestones</h3>
            {(data.currentVersion.milestones ?? []).map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-slate-500">{m.status === "COMPLETED" ? "Completed" : "Pending"}</p>
                </div>
                {data.status === "SIGNED" && m.status !== "COMPLETED" ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      const result = await apiFetch<{ allComplete: boolean }>(
                        `/api/agreements/${id}/milestones/${m.id}/complete`,
                        { method: "POST" },
                      );
                      toast.success(result.allComplete ? "All milestones done" : "Milestone completed");
                      load().catch(() => undefined);
                    }}
                  >
                    Mark complete
                  </Button>
                ) : null}
              </div>
            ))}
            {data.status === "SIGNED" &&
            (data.currentVersion.milestones ?? []).length > 0 &&
            (data.currentVersion.milestones ?? []).every((m: any) => m.status === "COMPLETED") ? (
              <Button
                onClick={async () => {
                  await apiFetch(`/api/agreements/${id}/delivery/request`, { method: "POST" });
                  toast.success("Client notified for final signoff");
                  load().catch(() => undefined);
                }}
              >
                Request client final signoff
              </Button>
            ) : null}
            {data.status === "DELIVERY_REVIEW" ? (
              <p className="text-sm text-cyan-800">Waiting for the client to accept delivery.</p>
            ) : null}
            {data.status === "COMPLETED" ? (
              <p className="text-sm text-emerald-800">Project closed after client signoff.</p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
      {documentBlock}
    </div>
  );
}
