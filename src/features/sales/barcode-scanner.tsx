"use client";

import { AlertCircle, Camera, CheckCircle2, ScanBarcode, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type BarcodeFeedback = {
  kind: "success" | "error";
  message: string;
};

export function BarcodeScanner({
  feedback,
  onScan,
}: {
  feedback: BarcodeFeedback | null;
  onScan: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<import("@zxing/browser").IScannerControls | null>(null);
  const onScanRef = useRef(onScan);
  const lastAcceptedRef = useRef("");
  const rearmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (rearmTimerRef.current !== null) window.clearTimeout(rearmTimerRef.current);
    rearmTimerRef.current = null;
    lastAcceptedRef.current = "";
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;

    async function startCamera() {
      setCameraError("");
      setCameraStarting(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("La cámara requiere HTTPS, localhost y un navegador compatible.");
        }

        const { BarcodeFormat, BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;

        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 120,
          delayBetweenScanSuccess: 700,
        });
        reader.possibleFormats = [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE,
        ];

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result) return;
            const scanned = result.getText().trim();
            if (!scanned) return;

            if (rearmTimerRef.current !== null) window.clearTimeout(rearmTimerRef.current);
            rearmTimerRef.current = window.setTimeout(() => {
              lastAcceptedRef.current = "";
            }, 1100);

            if (lastAcceptedRef.current === scanned) return;
            lastAcceptedRef.current = scanned;
            onScanRef.current(scanned);
            navigator.vibrate?.(70);
          },
        );

        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError") {
          setCameraError("No se concedió permiso para usar la cámara.");
        } else if (name === "NotFoundError") {
          setCameraError("No se encontró una cámara disponible.");
        } else {
          setCameraError(error instanceof Error ? error.message : "No se pudo iniciar la cámara.");
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, stopCamera]);

  function submitCode() {
    const value = code.trim();
    if (!value) return;
    onScan(value);
    setCode("");
  }

  return (
    <div className="mt-3 rounded-2xl border bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-muted">Lector o código de producto</span>
          <input
            autoComplete="off"
            className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3"
            inputMode="text"
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCode();
              }
            }}
            placeholder="Escanea o escribe el SKU y presiona Enter"
            value={code}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold" onClick={submitCode} type="button">
            <ScanBarcode className="size-4" /> Agregar
          </button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white" onClick={() => setCameraOpen(true)} type="button">
            <Camera className="size-4" /> Usar cámara
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">En computadora, conecta un lector USB o Bluetooth y mantén este campo seleccionado.</p>
      {feedback && (
        <p aria-live="polite" className={cn("mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm", feedback.kind === "success" ? "bg-accent text-brand-strong" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300")}>
          {feedback.kind === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
          {feedback.message}
        </p>
      )}

      {cameraOpen && (
        <div aria-labelledby="barcode-camera-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3 backdrop-blur-sm" role="dialog">
          <section className="w-full max-w-xl overflow-hidden rounded-3xl border bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-brand">Escaneo continuo</p>
                <h2 className="text-xl font-bold" id="barcode-camera-title">Apunta al código de barras</h2>
                <p className="mt-1 text-sm text-muted">Cada código reconocido agrega una unidad al carrito.</p>
              </div>
              <button aria-label="Cerrar cámara" className="grid size-10 shrink-0 place-items-center rounded-xl border" onClick={() => setCameraOpen(false)} type="button"><X className="size-5" /></button>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              <video className="size-full object-cover" muted playsInline ref={videoRef} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] top-1/2 h-28 -translate-y-1/2 rounded-2xl border-2 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
              {cameraStarting && <p className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold text-white">Iniciando cámara...</p>}
            </div>
            <div className="p-5">
              {cameraError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{cameraError}</p> : feedback ? <p aria-live="polite" className={cn("flex items-center gap-2 rounded-xl p-3 text-sm", feedback.kind === "success" ? "bg-accent text-brand-strong" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300")}>{feedback.kind === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}{feedback.message}</p> : <p className="text-center text-sm text-muted">Mantén el código dentro del recuadro.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
