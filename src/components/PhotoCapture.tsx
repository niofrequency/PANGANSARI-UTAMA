import React, { useRef, useState } from 'react';
import { Camera, Clock, AlertCircle, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '../i18n/LanguageContext';

interface PhotoCaptureProps {
  onCapture: (url: string) => void;
}

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
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0);

        const barHeight = Math.max(28, Math.round(img.height * 0.06));
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

        const fontSize = Math.max(12, Math.round(barHeight * 0.42));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';

        const timestamp = new Date().toLocaleString();
        ctx.textAlign = 'left';
        ctx.fillText(timestamp, 12, img.height - barHeight / 2);

        if (coords) {
          const gps = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
          ctx.textAlign = 'right';
          ctx.fillText(gps, img.width - 12, img.height - barHeight / 2);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoCapture({ onCapture }: PhotoCaptureProps) {
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
      onCapture(stamped);
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
