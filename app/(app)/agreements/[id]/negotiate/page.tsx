"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { AgreementBuilder } from "@/components/agreement/agreement-builder";
import { apiFetch } from "@/lib/api-client";

export default function NegotiatePage() {
  const { id } = useParams<{ id: string }>();
  const [proposalId, setProposalId] = useState("");
  const [proposalStatus, setProposalStatus] = useState("");
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<any>(`/api/agreements/${id}`)
      .then((agreement) => {
        if (!cancelled) setSigned(agreement.status === "SIGNED");
      })
      .catch(() => undefined);
    apiFetch<any>(`/api/agreements/${id}/proposals`, { method: "POST", body: "{}" })
      .then((proposal) => {
        if (cancelled) return;
        setProposalId(proposal.id);
        setProposalStatus(proposal.proposalStatus);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!proposalId) return <p>Preparing your document copy...</p>;

  if (proposalStatus && proposalStatus !== "DRAFT_PROPOSAL") {
    return (
      <div>
        <PageHeader title="Proposal already submitted" description="Wait for the service provider to approve or decline this document." />
        <a href={`/agreements/${id}`} className="text-sm text-teal-800 hover:underline">Back to agreement</a>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={signed ? "Request additional work" : "Negotiate agreement"}
        description={
          signed
            ? "Edit a full extra-work document. The signed original stays locked until this is approved as a new linked agreement."
            : "Edit the full agreement. Your proposal is reviewed before it becomes the version you sign."
        }
      />
      <AgreementBuilder agreementId={id} mode="negotiate" proposalId={proposalId} />
    </div>
  );
}
