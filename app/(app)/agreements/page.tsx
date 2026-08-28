"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

const SIGNABLE = new Set(["SENT", "VIEWED", "AWAITING_APPROVAL", "AWAITING_SIGNATURE"]);

export default function AgreementsPage() {
  const { data } = useSession();
  const isAdmin = data?.user?.role === "ADMIN";
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    apiFetch<any[]>(`/api/agreements?q=${encodeURIComponent(q)}&status=${status}`)
      .then(setItems)
      .catch((err) => toast.error(err.message));
  }, [q, status]);

  const statuses = isAdmin
    ? ["DRAFT", "SENT", "VIEWED", "CHANGES_REQUESTED", "REVISION_IN_PROGRESS", "AWAITING_APPROVAL", "AWAITING_SIGNATURE", "SIGNED", "REJECTED", "EXPIRED", "CANCELLED"]
    : ["SENT", "VIEWED", "CHANGES_REQUESTED", "REVISION_IN_PROGRESS", "AWAITING_APPROVAL", "AWAITING_SIGNATURE", "SIGNED", "REJECTED", "EXPIRED"];

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="My agreements" description="Review, sign, and track every agreement sent to you." />
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row">
          <Input className="min-w-0" placeholder="Search by number or project" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select className="w-full min-w-0 sm:max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All</option>
            {statuses.map((item) => (
              <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
            ))}
          </Select>
        </div>
        {items.length === 0 ? (
          <EmptyState title="No agreements yet" description="When an agreement is sent to you, it will appear here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => {
              const needsSign = SIGNABLE.has(item.status);
              return (
                <Card key={item.id} className={needsSign ? "border-teal-300" : undefined}>
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">{item.number}</p>
                        <p className="text-sm text-slate-500">{item.currentVersion?.projectTitle ?? item.project?.name}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {item.pricing ? formatCurrency(item.pricing.total, item.currentVersion?.currency) : "—"}
                      {item.expiresAt ? ` · Expires ${formatDate(item.expiresAt)}` : ""}
                    </p>
                    <Link href={`/agreements/${item.id}`}>
                      <Button className="w-full" variant={needsSign ? "default" : "outline"}>
                        {needsSign ? "Review & sign" : item.status === "SIGNED" ? "View signed agreement" : "View agreement"}
                      </Button>
                    </Link>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Agreements"
        description="Search by client, project, number or status."
        actions={
          <Link href="/agreements/new">
            <Button>New agreement</Button>
          </Link>
        }
      />
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row">
        <Input className="min-w-0" placeholder="Search agreements" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-full min-w-0 sm:max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </Select>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No agreements" description="Create a draft and send a secure client link." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-800 hover:underline" href={`/agreements/${item.id}`}>
                      {item.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.client?.fullName}</td>
                  <td className="px-4 py-3">{item.project?.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3">{formatDate(item.expiresAt)}</td>
                  <td className="px-4 py-3">{item.pricing ? formatCurrency(item.pricing.total, item.currentVersion?.currency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
