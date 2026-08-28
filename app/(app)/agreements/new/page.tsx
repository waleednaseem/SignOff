import { PageHeader } from "@/components/page-header";
import { AgreementBuilder } from "@/components/agreement/agreement-builder";

export default function NewAgreementPage() {
  return (
    <div>
      <PageHeader title="New agreement" description="Multi-step builder with draft autosave and preview." />
      <AgreementBuilder />
    </div>
  );
}
