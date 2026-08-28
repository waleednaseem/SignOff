"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    apiFetch<any[]>(`/api/agreements/${id}/history`).then(setItems).catch((err) => toast.error(err.message));
  }, [id]);
  return (
    <div>
      <PageHeader title="Agreement history" description="Immutable audit trail." />
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border bg-white p-4">
            <p className="font-medium">{item.label ?? item.eventType.replaceAll("_", " ")}</p>
            <p className="text-sm text-slate-500">
              {item.user?.name ?? "System"} · {formatDateTime(item.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
