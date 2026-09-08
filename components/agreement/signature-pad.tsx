"use client";

import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignatureCanvas | null>(null);
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setBoxW(Math.max(1, Math.round(el.clientWidth)));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="min-w-0 max-w-full">
      <p className="mb-2 text-xs text-slate-500">Draw with your mouse or finger in the box.</p>
      <div ref={wrapRef} className="min-w-0 max-w-full overflow-hidden rounded-xl border-2 border-dashed border-teal-300 bg-white">
        {boxW > 0 ? (
          <SignatureCanvas
            key={boxW}
            ref={(instance) => {
              padRef.current = instance;
            }}
            penColor="#0f172a"
            minWidth={1.5}
            maxWidth={2.8}
            canvasProps={{
              className: "block h-52 w-full max-w-full cursor-crosshair touch-none sm:h-44",
            }}
            onEnd={() => {
              const dataUrl = padRef.current?.isEmpty() ? "" : (padRef.current?.toDataURL("image/png") ?? "");
              onChange(dataUrl);
            }}
          />
        ) : (
          <div className="h-44" />
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-2"
        onClick={() => {
          padRef.current?.clear();
          onChange("");
        }}
      >
        Clear signature
      </Button>
    </div>
  );
}
