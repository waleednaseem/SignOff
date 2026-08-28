"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  async function load() {
    setItems(await apiFetch("/api/notifications"));
  }
  useEffect(() => {
    load().catch((err) => toast.error(err.message));
  }, []);
  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={<Button variant="outline" onClick={async () => {
          await apiFetch("/api/notifications", { method: "POST", body: "{}" });
          load().catch(() => undefined);
        }}>Mark all as read</Button>}
      />
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            className={`block w-full rounded-2xl border p-4 text-left ${item.readAt ? "bg-white" : "bg-teal-50"}`}
            onClick={async () => {
              await apiFetch("/api/notifications", { method: "POST", body: JSON.stringify({ id: item.id }) });
              load().catch(() => undefined);
            }}
          >
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-slate-600">{item.message}</p>
            <p className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
