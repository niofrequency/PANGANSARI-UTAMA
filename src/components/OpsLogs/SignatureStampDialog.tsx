import { PointerEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, PenLine, Stamp, X } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';

// Optional e-signature when a reviewer stamps a log. They can draw it
// with a finger / stylus / mouse, reuse the one they saved on this device,
// or stamp without signing. The signature is saved on the stamp itself
// (meta.signoff.<step>.signature, a small PNG data URL) and printed inside
// the stamp on the paper form.
const W = 600;
const H = 200;
const savedKey = (uid: string) => `psu_signature_${uid}`;

export function loadSavedSignature(uid?: string): string | null {
  if (!uid) return null;
  try { return localStorage.getItem(savedKey(uid)); } catch { return null; }
}

// Shrinks the drawing to the ink's bounding box, then to at most 300×100,
// so the saved PNG stays a few KB.
function exportSignature(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(canvas.width - 1, x1 + pad); y1 = Math.min(canvas.height - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const k = Math.min(1, 300 / w, 100 / h);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * k));
  out.height = Math.max(1, Math.round(h * k));
  out.getContext('2d')?.drawImage(canvas, x0, y0, w, h, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export function SignatureStampDialog({ open, userId, stepLabel, onCancel, onConfirm }: {
  open: boolean;
  userId?: string;
  stepLabel: string;
  onCancel: () => void;
  onConfirm: (signature?: string) => void;
}) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<[number, number] | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!open) return;
    const s = loadSavedSignature(userId);
    setSaved(s);
    setUseSaved(!!s);
    setHasInk(false);
  }, [open, userId]);

  useEffect(() => {
    if (!open || useSaved) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#0b2a6b';
  }, [open, useSaved]);

  if (!open) return null;

  const pos = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvas.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.arc(last.current[0], last.current[1], 1.4, 0, Math.PI * 2); ctx.fillStyle = '#0b2a6b'; ctx.fill(); }
    setHasInk(true);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e);
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(last.current[0], last.current[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    last.current = p;
  };
  const up = () => { drawing.current = false; last.current = null; };
  const clear = () => { canvas.current?.getContext('2d')?.clearRect(0, 0, W, H); setHasInk(false); };

  const confirmSigned = () => {
    if (useSaved && saved) { onConfirm(saved); return; }
    const sig = canvas.current ? exportSignature(canvas.current) : null;
    if (!sig) return;
    if (remember && userId) { try { localStorage.setItem(savedKey(userId), sig); } catch { /* storage full — still stamp */ } }
    onConfirm(sig);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center print:hidden" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-psu-gray flex items-center gap-2"><PenLine size={18} /> {t('ops.sign.title')}</h3>
            <p className="text-xs font-bold text-psu-gray/50 mt-1">{t('ops.sign.hint')}</p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 -m-2 text-psu-gray/40" aria-label={t('ops.paper.close')}><X size={20} /></button>
        </div>

        {saved && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setUseSaved(true)}
              className={cn('flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest', useSaved ? 'bg-psu-gray text-white' : 'bg-psu-gray/5 text-psu-gray')}>{t('ops.sign.useSaved')}</button>
            <button type="button" onClick={() => setUseSaved(false)}
              className={cn('flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest', !useSaved ? 'bg-psu-gray text-white' : 'bg-psu-gray/5 text-psu-gray')}>{t('ops.sign.drawNew')}</button>
          </div>
        )}

        {useSaved && saved ? (
          <div className="h-32 rounded-2xl border-2 border-psu-gray/10 flex items-center justify-center bg-psu-gray/[0.02]">
            <img src={saved} alt="" className="max-h-24 max-w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative rounded-2xl border-2 border-dashed border-psu-gray/20 bg-psu-gray/[0.02] overflow-hidden">
              <canvas ref={canvas} width={W} height={H} className="w-full block touch-none cursor-crosshair" style={{ aspectRatio: `${W} / ${H}` }}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
              {!hasInk && <p className="absolute inset-0 flex items-center justify-center text-sm font-bold text-psu-gray/25 pointer-events-none">{t('ops.sign.placeholder')}</p>}
              <div className="absolute left-6 right-6 bottom-8 border-b border-psu-gray/20 pointer-events-none" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[11px] font-bold text-psu-gray/60">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t('ops.sign.remember')}
              </label>
              <button type="button" onClick={clear} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-psu-gray/50"><Eraser size={13} /> {t('ops.sign.clear')}</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button type="button" onClick={confirmSigned} disabled={!(useSaved && saved) && !hasInk}
            className="w-full flex items-center justify-center gap-2 py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all disabled:opacity-40">
            <Stamp size={16} /> {t('ops.sign.stampSigned', { step: stepLabel })}
          </button>
          <button type="button" onClick={() => onConfirm(undefined)}
            className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-psu-gray/60 bg-psu-gray/5 active:scale-95 transition-all">
            {t('ops.sign.stampNoSignature')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
