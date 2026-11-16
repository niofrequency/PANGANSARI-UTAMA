import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, RotateCw, Scan, X } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';

// Shows a PSU paper sheet on screen for reviewers (Supervisor and up),
// readable on a phone as well as a desktop:
//   • starts "fit to width" so the whole form is visible at a glance
//   • − / + buttons and a % readout, plus "Fit"
//   • pinch to zoom (phone / tablet), Ctrl/⌘ + scroll or trackpad pinch
//     (desktop), double-tap / double-click to jump between fit and 100%
//   • Full screen: the sheet fills the whole screen, pans in both
//     directions, and the phone's Back button closes it
// The sheet itself is rendered at its real paper width (780px portrait,
// 1100px landscape) and scaled, so what you see is exactly what prints.
const MIN = 0.2;
const MAX = 3;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

function useSheetZoom(paperWidth: number, active: boolean, rotated = false) {
  const box = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [natH, setNatH] = useState(0);
  // null = follow "fit to width" (re-fits on rotate / resize).
  const [custom, setCustom] = useState<number | null>(null);
  const scale = custom ?? fit;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      if (!box.current || !sheet.current) return;
      const cs = getComputedStyle(box.current);
      const avail = box.current.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
      const h = sheet.current.offsetHeight;
      // Turned sideways, the sheet's height runs across the screen.
      const across = rotated ? h : paperWidth;
      setFit(clamp(Math.min(1, avail / Math.max(1, across))));
      setNatH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (sheet.current) ro.observe(sheet.current);
    return () => ro.disconnect();
  }, [paperWidth, active, rotated]);

  // Zoom to `next`, keeping the point (cx, cy) — in box coordinates —
  // under the finger / cursor.
  const zoomTo = useCallback((next: number, cx?: number, cy?: number) => {
    const el = box.current;
    const prev = scaleRef.current;
    next = clamp(next);
    if (!el || Math.abs(next - prev) < 0.001) { setCustom(next); return; }
    const px = cx ?? el.clientWidth / 2;
    const py = cy ?? el.clientHeight / 2;
    const ratio = next / prev;
    const left = (el.scrollLeft + px) * ratio - px;
    const top = (el.scrollTop + py) * ratio - py;
    scaleRef.current = next;
    setCustom(next);
    requestAnimationFrame(() => { el.scrollLeft = left; el.scrollTop = top; });
  }, []);

  // Pinch + ctrl/⌘-wheel. Native listeners so we can preventDefault
  // (stops the browser zooming the whole app instead of the sheet).
  useEffect(() => {
    const el = box.current;
    if (!el || !active) return;
    let start: { d: number; s: number } | null = null;
    let lastTap = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => {
      const r = el.getBoundingClientRect();
      return [(t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top];
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) { start = { d: dist(e.touches), s: scaleRef.current }; e.preventDefault(); }
      else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          const r = el.getBoundingClientRect();
          const t = e.touches[0];
          toggleRef.current(t.clientX - r.left, t.clientY - r.top);
          e.preventDefault();
          lastTap = 0;
        } else lastTap = now;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !start) return;
      e.preventDefault();
      const [cx, cy] = mid(e.touches);
      zoomTo(start.s * (dist(e.touches) / start.d), cx, cy);
    };
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) start = null; };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomTo(scaleRef.current * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [active, zoomTo]);

  const toggle = (cx?: number, cy?: number) => {
    if (custom === null || Math.abs(scaleRef.current - fit) < 0.01) zoomTo(Math.max(1, fit * 2), cx, cy);
    else setCustom(null);
  };
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  // A rotate change re-fits.
  useEffect(() => { setCustom(null); }, [rotated]);

  return { box, sheet, scale, fit, natH, setCustom, zoomTo, toggle, isFit: custom === null, rotated };
}

function Toolbar({ z, onFull, full, onRotate }: { z: ReturnType<typeof useSheetZoom>; onFull: () => void; full: boolean; onRotate?: () => void }) {
  const { t } = useTranslation();
  const btn = 'flex items-center justify-center h-9 min-w-9 px-2 rounded-xl bg-psu-gray/5 text-psu-gray active:scale-95 transition-all disabled:opacity-30';
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => z.zoomTo(z.scale / 1.25)} aria-label={t('ops.paper.zoomOut')}><Minus size={16} /></button>
      <span className="w-12 text-center text-[11px] font-black text-psu-gray tabular-nums">{Math.round(z.scale * 100)}%</span>
      <button type="button" className={btn} onClick={() => z.zoomTo(z.scale * 1.25)} aria-label={t('ops.paper.zoomIn')}><Plus size={16} /></button>
      <button type="button" className={cn(btn, 'gap-1 text-[10px] font-black uppercase tracking-widest')} disabled={z.isFit} onClick={() => z.setCustom(null)}>
        <Scan size={14} /> {t('ops.paper.fit')}
      </button>
      {onRotate && (
        <button type="button" className={cn(btn, z.rotated ? 'bg-psu-gray/15' : '')} onClick={onRotate} aria-label={t('ops.paper.rotate')} title={t('ops.paper.rotate')}>
          <RotateCw size={15} />
        </button>
      )}
      <button type="button" className={cn(btn, 'gap-1 text-[10px] font-black uppercase tracking-widest', full ? 'bg-psu-gray text-white' : '')} onClick={onFull}
        aria-label={full ? t('ops.paper.close') : t('ops.paper.fullScreen')}>
        {full ? <X size={16} /> : <><Maximize2 size={14} /> <span className="hidden sm:inline">{t('ops.paper.fullScreen')}</span></>}
      </button>
    </div>
  );
}

function Stage({ z, paperWidth, children, className }: { z: ReturnType<typeof useSheetZoom>; paperWidth: number; children: ReactNode; className?: string }) {
  return (
    <div ref={z.box} className={cn('overflow-auto overscroll-contain', className)} style={{ touchAction: 'pan-x pan-y' }}
      onDoubleClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); z.toggle(e.clientX - r.left, e.clientY - r.top); }}>
      {/* Sized wrapper = the scaled sheet's real footprint, so scrollbars match. */}
      <div style={{
        width: (z.rotated ? z.natH : paperWidth) * z.scale,
        height: z.natH ? (z.rotated ? paperWidth : z.natH) * z.scale : undefined,
        margin: z.scale < z.fit + 0.001 ? '0 auto' : undefined,
      }}>
        <div ref={z.sheet} className="bg-white shadow-sm" style={{
          width: paperWidth,
          transform: z.rotated ? `translateX(${z.natH * z.scale}px) rotate(90deg) scale(${z.scale})` : `scale(${z.scale})`,
          transformOrigin: 'top left',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PaperViewer({ landscape, children }: { landscape: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  const paperWidth = landscape ? 1100 : 780;
  const [full, setFull] = useState(false);
  const inline = useSheetZoom(paperWidth, !full);
  // Full screen on a portrait phone turns a landscape form sideways so it
  // fills the screen (toggle with the rotate button).
  const [rotated, setRotated] = useState(false);
  useEffect(() => {
    if (full) setRotated(landscape && window.innerHeight > window.innerWidth && window.innerWidth < 768);
  }, [full, landscape]);
  const big = useSheetZoom(paperWidth, full, rotated);

  // Phone Back closes full screen instead of leaving the log.
  useEffect(() => {
    if (!full) return;
    const marker = `psu-paper-${Date.now()}`;
    window.history.pushState({ psuDetail: marker }, '');
    const onPop = () => { if (window.history.state?.psuDetail !== marker) setFull(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (window.history.state?.psuDetail === marker) window.history.back();
    };
  }, [full]);

  return (
    <div className="card !p-3 md:!p-4 space-y-2 print:hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] font-bold text-psu-gray/40 hidden md:block">{t('ops.paper.hintDesktop')}</p>
        <p className="text-[10px] font-bold text-psu-gray/40 md:hidden">{t('ops.paper.hintPhone')}</p>
        <Toolbar z={inline} full={false} onFull={() => setFull(true)} />
      </div>
      {!full && (
        <Stage z={inline} paperWidth={paperWidth} className="rounded-xl border border-psu-gray/10 bg-psu-gray/[0.03] max-h-[80vh]">
          {children}
        </Stage>
      )}
      {full && createPortal(
        <div className="fixed inset-0 z-[100] bg-neutral-200 flex flex-col print:hidden" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white shadow-sm" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-psu-gray/50 truncate">{t('ops.paper.fullScreen')}</p>
            <Toolbar z={big} full onFull={() => setFull(false)} onRotate={() => setRotated(r => !r)} />
          </div>
          <Stage z={big} paperWidth={paperWidth} className="flex-1 p-2">
            {children}
          </Stage>
        </div>,
        document.body,
      )}
    </div>
  );
}
