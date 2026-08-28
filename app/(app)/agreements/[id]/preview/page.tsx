"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AgreementDocument } from "@/components/agreement/agreement-document";
import { apiFetch } from "@/lib/api-client";
import { toViewModel } from "@/lib/to-view-model";
import { toast } from "sonner";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    apiFetch(`/api/agreements/${id}`).then(setData).catch((err) => toast.error(err.message));
  }, [id]);
  if (!data?.currentVersion) return <p>Loading preview...</p>;
  return (
    <div>
      <PageHeader
        title="Client preview"
        description="This is exactly what the client will see, minus admin notes."
        actions={
          <div className="flex gap-2">
            <Link href={`/agreements/${id}/edit`}><Button variant="outline">Edit</Button></Link>
            <Link href={`/agreements/${id}`}><Button>Back</Button></Link>
          </div>
        }
      />
      <AgreementDocument agreement={toViewModel(data)} />
    </div>
  );
}
