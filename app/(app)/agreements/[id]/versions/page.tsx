"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function VersionsPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useSession();
  const [versions, setVersions] = useState<any[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [diff, setDiff] = useState<any>(null);

  useEffect(() => {
    apiFetch<any[]>(`/api/agreements/${id}/versions`).then((items) => {
      setVersions(items);
      if (items[1] && items[0]) {
        setA(items[1].id);
        setB(items[0].id);
      }
    });
  }, [id]);

  return (
    <div>
      <PageHeader
        title="Versions"
        description="Previous versions stay preserved. Signed versions cannot be overwritten."
        actions={
          data?.user?.role === "ADMIN" ? (
            <Button onClick={async () => {
              await apiFetch(`/api/agreements/${id}/versions`, { method: "POST", body: JSON.stringify({ reasonForChange: "Manual revision" }) });
              toast.success("New version created");
              location.reload();
            }}>Create version</Button>
          ) : null
        }
      />
      <div className="mb-6 space-y-2">
        {versions.map((item) => (
          <div key={item.id} className="rounded-xl border bg-white p-4 text-sm">
            <strong>Version {item.versionNumber}</strong> · {item.status} · {formatDateTime(item.createdAt)}
            <p className="text-slate-500">{item.reasonForChange}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Select value={a} onChange={(e) => setA(e.target.value)}>
          {versions.map((item) => <option key={item.id} value={item.id}>v{item.versionNumber}</option>)}
        </Select>
        <Select value={b} onChange={(e) => setB(e.target.value)}>
          {versions.map((item) => <option key={item.id} value={item.id}>v{item.versionNumber}</option>)}
        </Select>
        <Button onClick={async () => {
          setDiff(await apiFetch(`/api/agreements/${id}/versions/compare?a=${a}&b=${b}`));
        }}>Compare</Button>
      </div>
      {diff ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <DiffList title="Added" items={diff.reqChanges.added} className="border-emerald-200 bg-emerald-50" />
          <DiffList title="Removed" items={diff.reqChanges.removed} className="border-rose-200 bg-rose-50" />
          <DiffList title="Changed" items={diff.reqChanges.changed} className="border-amber-200 bg-amber-50" />
        </div>
      ) : null}
    </div>
  );
}

function DiffList({ title, items, className }: { title: string; items: any[]; className: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      {items.map((item: any) => (
        <p key={item.title} className="text-sm">{item.title}</p>
      ))}
    </div>
  );
}
