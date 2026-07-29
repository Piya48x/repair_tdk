import React, { useEffect, useRef, useState } from "react";
import { Camera, QrCode, X } from "lucide-react";
import Webcam from "react-webcam";

export function extractAssetTagFromQr(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/asset-qr\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL; continue with the compact ASSET: payload format.
  }
  return text.replace(/^ASSET:/i, "").trim();
}

export default function AssetViewScannerModal({ onDetected, onClose }) {
  const webcamRef = useRef(null);
  const detectorRef = useRef(null);
  const detectedRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (!("BarcodeDetector" in window)) {
      setSupported(false);
      return undefined;
    }

    let active = true;
    let timer;

    const initialize = async () => {
      try {
        const requestedFormats = ["qr_code", "code_128", "code_39", "ean_13", "ean_8"];
        const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === "function"
          ? await window.BarcodeDetector.getSupportedFormats()
          : requestedFormats;
        const formats = requestedFormats.filter((format) => supportedFormats.includes(format));
        detectorRef.current = new window.BarcodeDetector(formats.length ? { formats } : undefined);

        timer = window.setInterval(async () => {
          if (!active || detectedRef.current || !detectorRef.current) return;
          const video = webcamRef.current?.video;
          if (!video || video.readyState < 2) return;
          try {
            const codes = await detectorRef.current.detect(video);
            const value = codes?.[0]?.rawValue;
            if (value) {
              detectedRef.current = true;
              onDetected(value);
            }
          } catch {
            // A frame can fail while the camera is focusing; retry the next frame.
          }
        }, 500);
      } catch (error) {
        console.warn("Initialize asset QR scanner error:", error);
        setSupported(false);
      }
    };

    void initialize();
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2"><Camera size={20} className="text-blue-600" /><h2 className="text-lg font-black text-slate-950">สแกนเพื่อดูข้อมูล Asset</h2></div>
            <p className="mt-1 text-sm text-slate-500">โหมดนี้เปิดหน้ารายละเอียด ไม่บันทึกผล Stock Audit</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="ปิด"><X size={20} /></button>
        </header>
        <div className="p-5">
          {supported ? (
            <div className="relative overflow-hidden rounded-2xl border-4 border-slate-900 bg-slate-950">
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={{ facingMode: { ideal: "environment" } }}
                onUserMediaError={(error) => setCameraError(error?.message || "ไม่สามารถเปิดกล้องได้")}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-blue-400 shadow-[0_0_0_999px_rgba(2,6,23,0.3)]" />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              เบราว์เซอร์นี้ยังไม่รองรับการอ่าน QR จากกล้อง กรุณาใช้ Chrome/Edge รุ่นล่าสุด หรือใช้ช่อง Asset Tag กับเครื่องสแกน USB
            </div>
          )}
          {cameraError ? <p className="mt-3 text-sm font-bold text-rose-600">{cameraError}</p> : null}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><QrCode size={15} />เล็ง QR ให้อยู่ในกรอบ ระบบจะเปิดข้อมูลให้อัตโนมัติ</div>
        </div>
      </div>
    </div>
  );
}
