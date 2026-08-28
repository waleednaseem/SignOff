"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

type HistoryItem = {
  id: string;
  label: string;
  createdAt: string;
  agreement?: { id: string; number: string } | null;
};

export default function ClientHistoryPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    if (!session?.user || session.user.role === "ADMIN") return;
    apiFetch<HistoryItem[]>("/api/history")
      .then(setItems)
      .catch((err) => toast.error(err.message));
  }, [session?.user]);

  if (session?.user?.role === "ADMIN") {
    return (
      <div>
        <PageHeader title="History" description="Open an agreement to see its full audit trail." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="History" description="Activity on your agreements only." />
      {!items ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState title="No history yet" description="When you review or sign an agreement, it will appear here." />
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-white p-4">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-slate-500">
                {item.agreement ? (
                  <Link className="text-teal-800 hover:underline" href={`/agreements/${item.agreement.id}`}>
                    {item.agreement.number}
                  </Link>
                ) : (
                  "Agreement"
                )}{" "}
                · {formatDateTime(item.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
