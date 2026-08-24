import React, { useRef, useState } from 'react';
import { Camera, Clock, AlertCircle, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18n/LanguageContext';
import { isFirebaseConfigured } from '../lib/firebase';
import { uploadSubmissionPhoto } from '../services/storageService';

interface PhotoCaptureProps {
  onCapture: (url: string) => void;
  // The uploader's Firebase Auth uid. Only used in Firebase mode — pass it
  // whenever one's available (every portal that renders this already has
  // currentUser in scope) so the photo uploads to Storage instead of
  // sitting in localStorage as base64. Omit it (or run in demo mode) and
  // this behaves exactly as before: the local data URL is the final value.
  uid?: string;
}

// A modern phone camera easily produces a 4000x3000+ original — several MB
// once base64-encoded, and this app stores photos inline in each
// submission (in localStorage in demo mode, always; see useAppStore.ts).
// A handful of full-resolution photos is enough to exhaust the browser's
// storage quota outright. There's nothing here that needs more detail
// than fits on a phone screen, so every photo is downscaled to this before
// it's ever stored — still plenty for the timestamp/GPS stamp and for a
// supervisor reviewing it, at a fraction of the size.
const MAX_DIMENSION = 1280;

// Draws the captured photo onto a canvas with a real timestamp (and GPS
// coordinates, when the browser grants location permission) burned into the
// image itself, then returns a data URL. This runs entirely on-device.
function stampPhoto(file: File, coords: GeolocationCoordinates | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const barHeight = Math.max(28, Math.round(canvas.height * 0.06));
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        const fontSize = Math.max(12, Math.round(barHeight * 0.42));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';

        const timestamp = new Date().toLocaleString();
        ctx.textAlign = 'left';
        ctx.fillText(timestamp, 12, canvas.height - barHeight / 2);

        if (coords) {
          const gps = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
          ctx.textAlign = 'right';
          ctx.fillText(gps, canvas.width - 12, canvas.height - barHeight / 2);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoCapture({ onCapture, uid }: PhotoCaptureProps) {
  const { t } = useTranslation();
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsCapturing(true);
    setError(null);
    try {
      // Best-effort location tag; proceeds without it if denied/unavailable.
      const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null),
          { timeout: 4000 }
        );
      });
      const stamped = await stampPhoto(file, coords);
      setPreview(stamped);
      // Local data URL first, always — instant preview, and the value
      // used as-is in demo mode. In Firebase mode this is upgraded below
      // once the upload finishes; if that fails (offline, etc.) this
      // local copy is what ends up submitted, not nothing.
      onCapture(stamped);

      if (isFirebaseConfigured && uid) {
        try {
          const remoteUrl = await uploadSubmissionPhoto(uid, stamped);
          onCapture(remoteUrl);
        } catch (uploadErr) {
          console.error('Photo upload to Storage failed, keeping local copy:', uploadErr);
        }
      }
    } catch (e) {
      setError(t('photoCapture.errorGeneric'));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="mt-2">
      {/* capture="environment" opens the rear camera directly on phones;
          on desktop this just falls back to a normal file picker. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {preview ? (
        <div className="relative rounded-[20px] overflow-hidden border-2 border-psu-green/30 shadow-lg shadow-psu-green/5">
          <img src={preview} alt="Captured" className="w-full h-40 object-cover" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-3 right-3 bg-white/90 p-2 rounded-xl text-psu-rejected shadow-sm hover:bg-white transition-colors"
          >
            <AlertCircle size={18} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-psu-gray/80 backdrop-blur-sm text-white text-[9px] px-3 py-2 flex justify-between font-black uppercase tracking-widest">
            <span className="flex items-center gap-1 opacity-70"><MapPin size={8} /> Stamped on capture</span>
            <span className="opacity-70">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isCapturing}
          className="w-full h-32 border-2 border-dashed border-psu-gray/10 rounded-2xl flex flex-col items-center justify-center text-psu-gray/30 hover:border-psu-green hover:text-psu-green transition-all bg-psu-bg group"
        >
          {isCapturing ? (
            <div className="flex flex-col items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Clock size={28} />
              </motion.div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t('photoCapture.stamping')}</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-psu-green group-hover:text-white transition-all mb-3 border border-psu-gray/5">
                <Camera size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t('photoCapture.takePhoto')}</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-[10px] text-psu-rejected mt-2 font-medium">{error}</p>}
    </div>
  );
}
