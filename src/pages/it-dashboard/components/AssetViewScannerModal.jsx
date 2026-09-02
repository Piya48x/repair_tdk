import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Keyboard, LoaderCircle, QrCode, RefreshCw, X } from "lucide-react";

export function extractAssetTagFromQr(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const routeText = `${url.pathname}${url.hash || ""}`;
    const match = routeText.match(/\/asset-qr\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  } catch {
    // Not a URL; continue with an Asset Code or ASSET: payload.
  }

  return text.replace(/^ASSET:/i, "").trim();
}

function isCameraAllowedOrigin() {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getCameraErrorMessage(error) {
  const errorName = String(error?.name || "");
  if (!isCameraAllowedOrigin()) {
    return "Camera access requires HTTPS. Use the HTTPS site URL, or open http://localhost:5173 on this computer.";
  }
  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
    return "Camera permission was blocked. Allow Camera in the browser site settings, then press Try camera again.";
  }
  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No camera was found on this device. You can still enter the Asset Code below.";
  }
  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return "The camera is being used by another app. Close that app and try again.";
  }
  return String(error?.message || "Unable to start the camera. Check browser permission and try again.");
}

export default function AssetViewScannerModal({
  onDetected,
  onClose,
  title = "Scan Asset QR",
  subtitle = "Open the asset detail without recording a Stock Audit result",
}) {
  const videoRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const detectedRef = useRef(false);
  const [cameraStatus, setCameraStatus] = useState("starting");
  const [cameraError, setCameraError] = useState("");
  const [scanAttempt, setScanAttempt] = useState(0);
  const [manualCode, setManualCode] = useState("");

  const submitDetectedValue = useCallback((value) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue || detectedRef.current) return;
    detectedRef.current = true;
    scannerControlsRef.current?.stop?.();
    onDetected(normalizedValue);
  }, [onDetected]);

  useEffect(() => {
    let disposed = false;

    const stopScanner = () => {
      scannerControlsRef.current?.stop?.();
      scannerControlsRef.current = null;
      const stream = videoRef.current?.srcObject;
      stream?.getTracks?.().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startScanner = async () => {
      stopScanner();
      detectedRef.current = false;
      setCameraError("");
      setCameraStatus("starting");

      try {
        if (!isCameraAllowedOrigin()) {
          throw new DOMException("Camera access requires HTTPS", "SecurityError");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new DOMException("Camera API is unavailable in this browser", "NotSupportedError");
        }

        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (disposed || !videoRef.current) return;

        const codeReader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 750,
        });
        const controls = await codeReader.decodeFromConstraints(
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
            submitDetectedValue(typeof result.getText === "function" ? result.getText() : result.text);
          },
        );

        if (disposed) {
          controls.stop();
          return;
        }

        scannerControlsRef.current = controls;
        setCameraStatus("scanning");
      } catch (error) {
        if (disposed) return;
        console.warn("Initialize asset QR scanner error:", error);
        stopScanner();
        setCameraStatus("error");
        setCameraError(getCameraErrorMessage(error));
      }
    };

    void startScanner();
    return () => {
      disposed = true;
      stopScanner();
    };
  }, [scanAttempt, submitDetectedValue]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    submitDetectedValue(manualCode);
  };

  const retryCamera = () => {
    setScanAttempt((value) => value + 1);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-qr-scanner-title"
        className="app-safe-bottom max-h-[96dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-[28px]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-5 sm:py-4">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <Camera size={20} className="shrink-0 text-blue-600" />
              <h2 id="asset-qr-scanner-title" className="truncate text-base font-black text-slate-950 sm:text-lg">{title}</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-square max-h-[52dvh] w-full object-cover sm:aspect-[4/3]"
            />
            {cameraStatus !== "error" ? (
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-blue-400 shadow-[0_0_0_999px_rgba(2,6,23,0.3)]" />
            ) : null}
            {cameraStatus === "starting" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/65 text-white">
                <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-bold">
                  <LoaderCircle size={16} className="animate-spin" />
                  Starting camera...
                </div>
              </div>
            ) : null}
          </div>

          {cameraError ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
              <p className="text-xs font-bold leading-5">{cameraError}</p>
              <button
                type="button"
                onClick={retryCamera}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black transition hover:bg-rose-100"
              >
                <RefreshCw size={14} />
                Try camera again
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <QrCode size={15} className="shrink-0" />
            Hold the QR code inside the frame. Asset details will open automatically.
          </div>

          <div className="my-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Or enter the code
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleManualSubmit} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
            <label htmlFor="asset-qr-manual-code" className="flex items-center gap-2 text-xs font-black text-slate-700">
              <Keyboard size={15} className="text-blue-600" />
              Asset Code / USB Scanner
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="asset-qr-manual-code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Example: CPUTDK0011"
                className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-bold uppercase text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Open asset detail"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
