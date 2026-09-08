"use client";

import Link from "next/link";
import { SignaturePad } from "@/components/agreement/signature-pad";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";
import { Card, CardBody } from "@/components/ui/card";

export function ClientSignPanel({
  changeText,
  onChangeText,
  typedName,
  onTypedName,
  confirmed,
  onConfirmed,
  onSignature,
  onRequestChanges,
  onApprove,
  onSign,
  signing,
  canSign,
  negotiateHref,
}: {
  changeText: string;
  onChangeText: (value: string) => void;
  typedName: string;
  onTypedName: (value: string) => void;
  confirmed: boolean;
  onConfirmed: (value: boolean) => void;
  onSignature: (dataUrl: string) => void;
  onRequestChanges: () => void;
  onApprove?: () => void;
  onSign: () => void;
  signing?: boolean;
  canSign: boolean;
  negotiateHref?: string;
}) {
  return (
    <Card className="border-teal-200">
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Review and sign</h2>
          <p className="text-sm text-slate-500">
            Read the agreement, then draw your electronic signature with your finger or mouse.
          </p>
        </div>
        {negotiateHref ? (
          <Link href={negotiateHref} className="block">
            <Button type="button" className="min-h-11 w-full touch-manipulation">
              Negotiate full document
            </Button>
          </Link>
        ) : null}
        <Textarea
          className="min-h-20"
          placeholder="Optional comment for the provider"
          value={changeText}
          onChange={(e) => onChangeText(e.target.value)}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" className="min-h-11 touch-manipulation" onClick={onRequestChanges}>
            Comment
          </Button>
          {onApprove ? (
            <Button type="button" variant="secondary" className="min-h-11 touch-manipulation" onClick={onApprove}>
              Approve
            </Button>
          ) : null}
        </div>
        <div className="space-y-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-3 sm:p-4">
          <p className="text-sm font-medium text-teal-900">Electronic signature</p>
          <p className="text-xs text-slate-600">Draw in the box below with your finger.</p>
          <SignaturePad onChange={onSignature} />
          <div>
            <Label>Type your full name</Label>
            <Input value={typedName} onChange={(e) => onTypedName(e.target.value)} placeholder="Your legal name" />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
              checked={confirmed}
              onChange={(e) => onConfirmed(e.target.checked)}
            />
            I have reviewed this agreement and agree to the terms, scope, pricing and conditions.
          </label>
          <Button className="min-h-12 w-full touch-manipulation" disabled={!canSign || signing} onClick={onSign}>
            {signing ? "Signing..." : "Sign with electronic signature"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
