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
  const [link, setLink] = useState("");
  const [changeText, setChangeText] = useState("");
  const [signature, setSignature] = useState("");
  const [typedName, setTypedName] = useState(session?.user?.name ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);

  async function load() {
    const agreement = await apiFetch<any>(`/api/agreements/${id}`);
    setData(agreement);
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
            ) : data.status === "SIGNED" ? (
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="font-semibold">This agreement is signed</h3>
                  <p className="text-sm text-slate-500">The signed version is locked. Extra work goes through a change request.</p>
                  <Link href="/change-requests"><Button className="w-full">Request additional work</Button></Link>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <h3 className="font-semibold">Waiting on an update</h3>
                  <p className="mt-1 text-sm text-slate-500">You will be able to sign again when a new version is sent.</p>
                </CardBody>
              </Card>
            )}
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
            {data.status !== "SIGNED" ? (
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
      {documentBlock}
    </div>
  );
}
