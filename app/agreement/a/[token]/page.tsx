"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileSignature } from "lucide-react";
import { toast } from "sonner";
import { AgreementDocument } from "@/components/agreement/agreement-document";
import { SignaturePad } from "@/components/agreement/signature-pad";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { toViewModel } from "@/lib/to-view-model";

export default function PublicAgreementPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [guest, setGuest] = useState({ name: "", email: "" });
  const [changeText, setChangeText] = useState("");
  const [signature, setSignature] = useState("");
  const [typedName, setTypedName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");

  async function load() {
    const payload = await apiFetch<any>(`/api/public/agreements/${token}`);
    setData(payload);
    setGuest({ name: payload.client.fullName, email: payload.client.email });
  }

  useEffect(() => {
    load()
      .then(async () => {
        await fetch(`/api/public/agreements/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "view" }),
        });
      })
      .catch(async (err) => {
        setError({ message: err.message });
      });
  }, [token]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const result = await apiFetch<any>(`/api/public/agreements/${token}`, {
      method: "POST",
      body: JSON.stringify({
        action,
        authorName: guest.name,
        authorEmail: guest.email,
        ...extra,
      }),
    });
    return result;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="max-w-lg">
          <CardBody className="space-y-3 p-8 text-center">
            <h1 className="text-2xl font-semibold">Agreement unavailable</h1>
            <p className="text-slate-600">{error.message}</p>
            <p className="text-sm text-slate-500">If you believe this is a mistake, ask the sender to generate a new secure link.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <p className="p-10 text-center text-slate-500">Loading agreement...</p>;
  }

  const view = toViewModel(data);

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f4f1ea] pb-28">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white">
            <FileSignature className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Signoff</p>
            <p className="text-xs text-slate-500">Secure agreement review</p>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-4xl px-4 py-8">
        <Card className="mb-6">
          <CardBody className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Your name</Label>
              <Input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
            </div>
          </CardBody>
        </Card>

        <AgreementDocument
          agreement={view}
          onComment={async (requirementId, text) => {
            await act("comment", { requirementId, text });
            toast.success("Comment added");
          }}
        />

        {data.status !== "SIGNED" ? (
          <p className="mt-4 text-center text-sm text-slate-600">
            To edit the full document,{" "}
            <a className="text-teal-800 underline" href={`/login?callbackUrl=/agreements/${data.id}/negotiate`}>
              sign in to your client portal
            </a>
            .
          </p>
        ) : null}

        {signed ? (
          <Card className="mt-6">
            <CardBody className="space-y-3">
              <h2 className="text-xl font-semibold">Agreement signed</h2>
              <p>Thank you. A signed copy has been recorded{hash ? ` (hash ${hash.slice(0, 12)}…)` : ""}.</p>
              <p>Would you like to create a client account to manage your agreements?</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} />
                Create an account
              </label>
              {createAccount ? (
                <>
                  <Input type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <Button onClick={async () => {
                    await fetch("/api/auth/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: guest.name, email: guest.email, password }),
                    });
                    toast.success("Account linked. You can sign in now.");
                  }}>
                    Create and link account
                  </Button>
                </>
              ) : null}
            </CardBody>
          </Card>
        ) : data.status !== "SIGNED" ? (
          <div className="fixed inset-x-0 bottom-0 border-t bg-white/95 p-4 backdrop-blur">
            <div className="mx-auto flex max-w-4xl flex-col gap-3 md:flex-row md:items-end">
              <Textarea className="min-h-16 flex-1" placeholder="Request changes" value={changeText} onChange={(e) => setChangeText(e.target.value)} />
              <Button variant="outline" onClick={async () => {
                await act("request_changes", { text: changeText || "Please revise this agreement." });
                toast.success("Changes requested");
                load().catch(() => undefined);
              }}>
                Request changes
              </Button>
              <Button variant="secondary" onClick={async () => {
                await act("approve");
                toast.success("Approved. Please sign below.");
                load().catch(() => undefined);
              }}>
                Approve
              </Button>
            </div>
            <div className="mx-auto mt-4 max-w-4xl space-y-3">
              <p className="text-sm font-medium">Electronic signature</p>
              <p className="text-xs text-slate-500">Draw your signature with your mouse or finger, then type your name.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I confirm that I have reviewed and agree to the terms, scope, pricing and conditions of this agreement.
              </label>
              <SignaturePad onChange={setSignature} />
              <Input placeholder="Type your full name" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
              <Button
                disabled={!confirmed || !signature || !typedName || !guest.email}
                onClick={async () => {
                  const result = await act("sign", {
                    versionId: data.version.id,
                    signerName: typedName,
                    email: guest.email,
                    typedName,
                    imageData: signature,
                    confirmed: true,
                  });
                  setHash(result.hash ?? "");
                  setSigned(true);
                  toast.success("Signed");
                }}
              >
                Sign with electronic signature
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-center text-emerald-700">This agreement is signed and locked.</p>
        )}
      </div>
    </div>
  );
}
