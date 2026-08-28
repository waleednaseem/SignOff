import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Times-Roman", color: "#0f172a" },
  h1: { fontSize: 20, marginBottom: 4, fontFamily: "Times-Bold" },
  h2: { fontSize: 13, marginTop: 16, marginBottom: 6, fontFamily: "Times-Bold", color: "#0f766e" },
  muted: { color: "#64748b", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  box: { borderWidth: 1, borderColor: "#e2e8f0", padding: 8, marginBottom: 6 },
  sig: { width: 180, height: 70, marginTop: 8 },
  small: { fontSize: 8, color: "#64748b", marginTop: 12 },
});

type PdfProps = {
  number: string;
  version: number;
  status: string;
  clientName: string;
  clientEmail: string;
  company?: string | null;
  projectName: string;
  title: string;
  shortDescription?: string | null;
  detailedDescription?: string | null;
  objectives?: string | null;
  currency: string;
  requirements: Array<{ title: string; description?: string | null; inclusion: string }>;
  priceItems: Array<{ label: string; amount: unknown; type: string }>;
  milestones: Array<{ name: string; description?: string | null; amount: unknown; dueDate?: Date | string | null }>;
  terms: Array<{ title: string; content: string }>;
  pricing: { subtotal: number; tax: number; total: number; discount: number };
  signature?: { signerName: string; email: string; signedAt: Date | string; imageData?: string; ipAddress?: string | null; hash?: string | null };
};

export function AgreementPdf(props: PdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Project Agreement</Text>
        <Text style={styles.muted}>
          {props.number} · Version {props.version} · {props.status}
        </Text>
        <View style={styles.row}>
          <Text>Client: {props.clientName} ({props.clientEmail})</Text>
          <Text>{props.company ?? ""}</Text>
        </View>
        <Text>Project: {props.projectName}</Text>

        <Text style={styles.h2}>Overview</Text>
        <Text>{props.title}</Text>
        {props.shortDescription ? <Text>{props.shortDescription}</Text> : null}
        {props.detailedDescription ? <Text>{props.detailedDescription}</Text> : null}
        {props.objectives ? <Text>Objectives: {props.objectives}</Text> : null}

        <Text style={styles.h2}>Scope</Text>
        {props.requirements.map((item, index) => (
          <View key={index} style={styles.box}>
            <Text>
              Feature #{index + 1}: {item.title} ({item.inclusion})
            </Text>
            {item.description ? <Text>{item.description}</Text> : null}
          </View>
        ))}

        <Text style={styles.h2}>Pricing</Text>
        {props.priceItems.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text>
              {item.label} ({item.type})
            </Text>
            <Text>{formatCurrency(toNumber(item.amount), props.currency)}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <Text>Discount</Text>
          <Text>{formatCurrency(props.pricing.discount, props.currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Tax</Text>
          <Text>{formatCurrency(props.pricing.tax, props.currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Total</Text>
          <Text>{formatCurrency(props.pricing.total, props.currency)}</Text>
        </View>

        <Text style={styles.h2}>Milestones</Text>
        {props.milestones.map((item, index) => (
          <View key={index} style={styles.box}>
            <Text>
              {item.name} — {formatCurrency(toNumber(item.amount), props.currency)}
            </Text>
            {item.description ? <Text>{item.description}</Text> : null}
          </View>
        ))}

        <Text style={styles.h2}>Terms</Text>
        {props.terms.map((item, index) => (
          <View key={index} wrap={false} style={{ marginBottom: 8 }}>
            <Text>{item.title}</Text>
            <Text>{item.content}</Text>
          </View>
        ))}

        {props.signature ? (
          <View>
            <Text style={styles.h2}>Signature</Text>
            <Text>
              Signed by {props.signature.signerName} ({props.signature.email}) on{" "}
              {formatDateTime(props.signature.signedAt)}
            </Text>
            {props.signature.imageData ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={props.signature.imageData} style={styles.sig} />
            ) : null}
            <Text style={styles.small}>
              IP: {props.signature.ipAddress ?? "n/a"} · Document hash: {props.signature.hash ?? "pending"}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
