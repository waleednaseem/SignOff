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

  function logScale(message: string, extra: Record<string, unknown> = {}) {
    const canvas = padRef.current?.getCanvas();
    const rect = canvas?.getBoundingClientRect();
    // #region agent log
    fetch("http://127.0.0.1:7255/ingest/dd658d58-f456-46a2-a370-6fd4e08e4ef8", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a2684c" },
      body: JSON.stringify({
        sessionId: "a2684c",
        runId: "post-fix",
        hypothesisId: "D",
        location: "signature-pad.tsx",
        message,
        data: {
          cssW: rect?.width ?? null,
          cssH: rect?.height ?? null,
          attrW: canvas?.width ?? null,
          attrH: canvas?.height ?? null,
          scaleX: canvas && rect?.width ? canvas.width / rect.width : null,
          wrapW: wrapRef.current?.clientWidth ?? null,
          vw: typeof window !== "undefined" ? window.innerWidth : null,
          sw: typeof document !== "undefined" ? document.documentElement.scrollWidth : null,
          ...extra,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => undefined);
    // #endregion
  }

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
            onBegin={() => logScale("signature stroke begin")}
            onEnd={() => {
              const dataUrl = padRef.current?.isEmpty() ? "" : (padRef.current?.toDataURL("image/png") ?? "");
              logScale("signature stroke ended", {
                hasSignature: Boolean(dataUrl),
                empty: padRef.current?.isEmpty() ?? true,
              });
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
