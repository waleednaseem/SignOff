"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";
import { CrBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function ChangeRequestsPage() {
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";
  const [items, setItems] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [form, setForm] = useState({
    agreementId: "",
    title: "",
    description: "",
    additionalCost: 0,
    additionalTimeDays: 0,
  });

  async function load() {
    setItems(await apiFetch("/api/change-requests"));
    const list = await apiFetch<any[]>("/api/agreements?status=SIGNED");
    setAgreements(list);
  }
  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);

  return (
    <div>
      <PageHeader title="Change requests" description="Additional work after a signed agreement. Original signed copy stays locked." />
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={async (e) => {
            e.preventDefault();
            await apiFetch("/api/change-requests", { method: "POST", body: JSON.stringify(form) });
            toast.success("Submitted");
            load().catch(() => undefined);
          }}>
            <div>
              <Label>Signed agreement</Label>
              <Select value={form.agreementId} onChange={(e) => setForm({ ...form, agreementId: e.target.value })} required>
                <option value="">Select</option>
                {agreements.map((item) => (
                  <option key={item.id} value={item.id}>{item.number}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <Label>Additional cost</Label>
              <Input type="number" value={form.additionalCost} onChange={(e) => setForm({ ...form, additionalCost: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Additional days</Label>
              <Input type="number" value={form.additionalTimeDays} onChange={(e) => setForm({ ...form, additionalTimeDays: Number(e.target.value) })} />
            </div>
            <Button>Submit change request</Button>
          </form>
        </CardBody>
      </Card>
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardBody className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{item.number} · {item.title}</p>
                <p className="text-sm text-slate-500">{item.description}</p>
                <p className="text-sm">{formatCurrency(item.additionalCost)} · {item.additionalTimeDays} days · {item.agreement?.number}</p>
                {item.proposalVersionId ? (
                  <Link href={`/agreements/${item.agreementId}`} className="text-sm text-teal-800 hover:underline">
                    Review full document
                  </Link>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <CrBadge status={item.status} />
                {isAdmin ? (
                  <Select value={item.status} onChange={async (e) => {
                    await apiFetch("/api/change-requests", { method: "PATCH", body: JSON.stringify({ id: item.id, status: e.target.value }) });
                    load().catch(() => undefined);
                  }}>
                    {["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "COMPLETED"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </Select>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
