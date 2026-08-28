import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { pdf } from "@react-pdf/renderer";
import { AgreementPdf } from "@/lib/pdf/agreement-pdf";
import { computePricing } from "@/lib/agreement-public";
import type { Agreement, AgreementVersion, Client, Milestone, PriceItem, Project, Requirement, Signature, Term } from "@prisma/client";

type VersionBundle = AgreementVersion & {
  requirements: Requirement[];
  priceItems: PriceItem[];
  milestones: Milestone[];
  terms: Term[];
};

export async function generateAgreementPdfBuffer(input: {
  agreement: Agreement;
  version: VersionBundle;
  client: Client;
  project: Project;
  signature?: Signature | null;
}) {
  const pricing = computePricing(
    input.version.priceItems,
    input.version.discountAmount,
    input.version.taxPercent,
  );
  const element = AgreementPdf({
    number: input.agreement.number,
    version: input.version.versionNumber,
    status: input.agreement.status,
    clientName: input.client.fullName,
    clientEmail: input.client.email,
    company: input.client.company,
    projectName: input.project.name,
    title: input.version.projectTitle,
    shortDescription: input.version.shortDescription,
    detailedDescription: input.version.detailedDescription,
    objectives: input.version.objectives,
    currency: input.version.currency,
    requirements: input.version.requirements,
    priceItems: input.version.priceItems,
    milestones: input.version.milestones,
    terms: input.version.terms,
    pricing,
    signature: input.signature
      ? {
          signerName: input.signature.signerName,
          email: input.signature.email,
          signedAt: input.signature.signedAt,
          imageData: input.signature.imageData,
          ipAddress: input.signature.ipAddress,
          hash: input.signature.pdfHash,
        }
      : undefined,
  });
  const instance = pdf(element);
  const output = await instance.toBuffer();
  if (Buffer.isBuffer(output)) return output;
  const chunks: Buffer[] = [];
  for await (const chunk of output as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function persistSignedPdf(agreementNumber: string, versionNumber: number, buffer: Buffer) {
  const dir = path.join(process.cwd(), "storage", "signed");
  await mkdir(dir, { recursive: true });
  const filename = `${agreementNumber}-v${versionNumber}.pdf`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  const hash = createHash("sha256").update(buffer).digest("hex");
  return { filePath: path.posix.join("storage", "signed", filename), hash };
}
