"use client";

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
}) {
  return (
    <Card className="border-teal-200">
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Review and sign</h2>
          <p className="text-sm text-slate-500">
            Read the agreement, then draw your electronic signature with your mouse or finger.
          </p>
        </div>
        <Textarea
          className="min-h-20"
          placeholder="Need a change? Describe it here."
          value={changeText}
          onChange={(e) => onChangeText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onRequestChanges}>
            Request changes
          </Button>
          {onApprove ? (
            <Button type="button" variant="secondary" onClick={onApprove}>
              Approve
            </Button>
          ) : null}
        </div>
        <div className="space-y-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-4">
          <p className="text-sm font-medium text-teal-900">Electronic signature</p>
          <p className="text-xs text-slate-600">Use your mouse to draw in the box below.</p>
          <SignaturePad onChange={onSignature} />
          <div>
            <Label>Type your full name</Label>
            <Input value={typedName} onChange={(e) => onTypedName(e.target.value)} placeholder="Your legal name" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => onConfirmed(e.target.checked)} />
            I have reviewed this agreement and agree to the terms, scope, pricing and conditions.
          </label>
          <Button className="w-full" disabled={!canSign || signing} onClick={onSign}>
            {signing ? "Signing..." : "Sign with electronic signature"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
