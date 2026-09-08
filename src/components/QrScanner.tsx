import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Camera, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { useTranslation } from '../i18n/LanguageContext';

interface QrScannerProps {
  onDetected: (rawValue: string) => void;
  onClose: () => void;
}

// In-app "Scan job" camera (StaffIdGate.tsx, and a home-screen button on
// Technician/Housekeeper — see PRD section 6). Uses the native
// BarcodeDetector API where it exists (Chrome/Edge/Android WebView); falls
// back to decoding video frames with jsQR everywhere else (Firefox,
// Safari). If the camera itself is denied or unavailable, this just tells
// the person to use their phone's own camera app instead — scanning a QR
// with the OS camera and opening the resulting link is always the primary
// path this app supports (see App.tsx's parseDeepLink()), the in-app
// scanner is a convenience on top of it, not a replacement for it.
export function QrScanner({ onDetected, onClose }: QrScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [notRecognized, setNotRecognized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        scanLoop();
      } catch (err) {
        console.error('QrScanner: camera unavailable:', err);
        if (!cancelled) setCameraError(true);
      }
    }

    function reportDetected(rawValue: string) {
      setNotRecognized(false);
      onDetected(rawValue);
    }

    async function scanLoop() {
      const video = videoRef.current;
      if (!video || cancelled) return;

      if (window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const detect = async () => {
            if (cancelled) return;
            try {
              const results = await detector.detect(video);
              if (results.length > 0) {
                reportDetected(results[0].rawValue);
                return;
              }
            } catch {
              // transient decode error on this frame — keep trying
            }
            rafRef.current = requestAnimationFrame(detect);
          };
          detect();
          return;
        } catch (err) {
          console.error('QrScanner: BarcodeDetector failed, falling back to jsQR:', err);
        }
      }

      // jsQR fallback: draw each video frame onto an offscreen canvas and
      // decode the raw pixel buffer.
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const tick = () => {
        if (cancelled || !video.videoWidth) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (result?.data) {
          reportDetected(result.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur-sm"
        aria-label={t('common.close')}
      >
        <X size={22} />
      </button>

      {cameraError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-xs text-center p-8 text-white"
        >
          <AlertCircle size={40} className="mx-auto mb-4 text-psu-warning" />
          <p className="text-sm font-bold mb-2">{t('qrScanner.cameraUnavailableTitle')}</p>
          <p className="text-xs text-white/70 leading-relaxed">{t('qrScanner.cameraUnavailableBody')}</p>
          <button
            onClick={onClose}
            className="mt-8 w-full py-4 bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest"
          >
            {t('common.close')}
          </button>
        </motion.div>
      ) : (
        <>
          <div className="relative w-full max-w-sm aspect-square mx-6 rounded-[32px] overflow-hidden border-2 border-white/20">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-8 border-2 border-psu-green rounded-3xl pointer-events-none" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-8">{t('qrScanner.instruction')}</p>
          {notRecognized && (
            <p className="text-psu-warning text-xs font-bold mt-3">{t('qrScanner.notRecognized')}</p>
          )}
        </>
      )}
    </div>
  );
}

// A small reusable trigger button ("Scan job") that opens the scanner
// modal and forwards a successfully-parsed job. Kept here alongside
// QrScanner so every "Scan job" entry point (StaffIdGate, Technician home,
// Housekeeper home) looks and behaves identically.
export function ScanJobButton({
  onScanned,
  label,
  className,
  iconOnly,
}: {
  onScanned: (rawValue: string) => void;
  label: string;
  className?: string;
  // Icon-only variant for tight header spots — the label is still there
  // for screen readers (aria-label), just not printed next to the icon.
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={className || 'flex items-center justify-center gap-2 py-4 px-5 rounded-2xl border border-psu-gray/10 bg-white text-psu-gray font-bold text-xs active:scale-95 transition-all'}
      >
        <Camera size={16} />
        {!iconOnly && label}
      </button>
      {open && (
        <QrScanner
          onDetected={(raw) => {
            setOpen(false);
            onScanned(raw);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
