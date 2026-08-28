import { PageHeader } from "@/components/page-header";
import { AgreementBuilder } from "@/components/agreement/agreement-builder";

export default async function EditAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <PageHeader title="Edit agreement" description="Drafts save in place. Sent agreements create a new version." />
      <AgreementBuilder agreementId={id} />
    </div>
  );
}
