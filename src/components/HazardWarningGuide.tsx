// Safety Reference's second set: the yellow-triangle general hazard
// warning signs (site/facilities hazards — electricity, vehicles, falls,
// drowning, etc.), as opposed to HazmatGuide.tsx's red-diamond GHS
// chemical pictograms. Same accordion pattern, rendered right below it
// in TrainingsTab.tsx — see hazardWarningData.ts for content and why
// this is static reference content, not a completable module.
//
// Each pictogram is a hand-drawn, simplified stand-in for the real
// yellow-triangle warning sign — recognizable alongside its name and
// explanation, not a pixel-exact reproduction (nobody's certifying signage
// against this screen, they're learning to recognize a shape on a wall).

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n/LanguageContext';
import { HAZARD_WARNING_SIGNS, HazardWarningId } from '../data/hazardWarningData';

// The shared yellow-triangle frame every general warning sign uses — a
// black-bordered triangle, yellow fill, with the glyph drawn in black
// inside it, roughly centered in the lower two-thirds (the apex is too
// narrow to draw into).
function WarningTriangle({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 shrink-0" role="img" aria-hidden="true">
      <polygon points="50,8 94,88 6,88" fill="#FBBF24" stroke="black" strokeWidth="6" strokeLinejoin="round" />
      {children}
    </svg>
  );
}

// Simple reusable stick-figure pieces so the 19 glyphs below don't each
// hand-roll their own person shape.
function StickFigure({ x, y, scale = 1, rotate = 0 }: { x: number; y: number; scale?: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <circle cx="0" cy="-10" r="4" fill="black" />
      <line x1="0" y1="-6" x2="0" y2="8" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="0" y1="0" x2="-7" y2="-4" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="0" y1="0" x2="7" y2="-4" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="0" y1="8" x2="-6" y2="18" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="0" y1="8" x2="6" y2="18" stroke="black" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

const GLYPHS: Record<HazardWarningId, React.ReactNode> = {
  ELECTRIC_SHOCK: (
    <path d="M55 35 L38 60 L48 60 L42 78 L64 52 L52 52 Z" fill="black" />
  ),
  FLAMMABLE: (
    <path
      d="M50 32 C58 43 62 51 57 61 C54 68 45 68 42 61 C39 54 42 51 45 54 C43 45 46 38 50 32 Z"
      fill="black"
    />
  ),
  VEHICLE: (
    <>
      <rect x="18" y="52" width="34" height="14" rx="2" fill="black" />
      <rect x="44" y="42" width="14" height="12" fill="black" />
      <circle cx="26" cy="68" r="4" fill="black" />
      <circle cx="46" cy="68" r="4" fill="black" />
      <StickFigure x={72} y={58} scale={0.85} rotate={35} />
    </>
  ),
  FORKLIFT: (
    <>
      <rect x="16" y="56" width="22" height="16" rx="2" fill="black" />
      <circle cx="22" cy="74" r="4" fill="black" />
      <circle cx="32" cy="74" r="4" fill="black" />
      <line x1="38" y1="70" x2="38" y2="36" stroke="black" strokeWidth="4" />
      <line x1="38" y1="42" x2="58" y2="42" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="38" y1="48" x2="58" y2="48" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <rect x="58" y="34" width="12" height="10" fill="black" />
      <StickFigure x={80} y={62} scale={0.75} rotate={-20} />
    </>
  ),
  MECHANICAL: (
    <>
      <circle cx="40" cy="55" r="11" fill="none" stroke="black" strokeWidth="4" />
      <circle cx="62" cy="60" r="7" fill="none" stroke="black" strokeWidth="4" />
      <line x1="40" y1="41" x2="40" y2="46" stroke="black" strokeWidth="3" />
      <line x1="40" y1="64" x2="40" y2="69" stroke="black" strokeWidth="3" />
      <line x1="26" y1="55" x2="31" y2="55" stroke="black" strokeWidth="3" />
      <line x1="49" y1="55" x2="54" y2="55" stroke="black" strokeWidth="3" />
      <line x1="30" y1="45" x2="33.5" y2="48.5" stroke="black" strokeWidth="3" />
      <line x1="46.5" y1="61.5" x2="50" y2="65" stroke="black" strokeWidth="3" />
      <line x1="30" y1="65" x2="33.5" y2="61.5" stroke="black" strokeWidth="3" />
      <line x1="46.5" y1="48.5" x2="50" y2="45" stroke="black" strokeWidth="3" />
    </>
  ),
  OVERHEAD_CRANE: (
    <>
      <line x1="15" y1="34" x2="85" y2="34" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <rect x="44" y="34" width="12" height="6" fill="black" />
      <line x1="50" y1="40" x2="50" y2="58" stroke="black" strokeWidth="3" />
      <rect x="41" y="58" width="18" height="12" fill="black" />
      <StickFigure x={20} y={70} scale={0.7} />
    </>
  ),
  SUSPENDED_LOAD: (
    <>
      <line x1="30" y1="35" x2="42" y2="55" stroke="black" strokeWidth="3" />
      <line x1="70" y1="35" x2="58" y2="55" stroke="black" strokeWidth="3" />
      <polygon points="38,55 62,55 68,75 32,75" fill="black" />
    </>
  ),
  SUSPENDED_LOAD_HOOK: (
    <>
      <path d="M50 32 v14 a7 7 0 1 0 -7 7" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="43" y1="53" x2="43" y2="60" stroke="black" strokeWidth="3" />
      <rect x="34" y="60" width="18" height="16" fill="black" />
    </>
  ),
  FALLING_OBJECT: (
    <>
      <rect x="40" y="28" width="20" height="14" rx="2" fill="black" />
      <line x1="50" y1="44" x2="50" y2="58" stroke="black" strokeWidth="3" strokeDasharray="4 4" />
      <StickFigure x={50} y={75} scale={0.9} />
    </>
  ),
  SLIPPERY_GROUND: (
    <>
      <StickFigure x={45} y={45} scale={0.9} rotate={20} />
      <path d="M20 78 q7 -6 14 0 q7 -6 14 0 q7 -6 14 0 q7 -6 14 0" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  FALL_FROM_HEIGHT: (
    <>
      <line x1="20" y1="45" x2="55" y2="45" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <StickFigure x={68} y={62} scale={0.9} rotate={55} />
    </>
  ),
  FALL_BACKWARD: (
    <>
      <line x1="30" y1="70" x2="70" y2="70" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <StickFigure x={50} y={50} scale={0.95} rotate={-35} />
    </>
  ),
  DROWNING: (
    <>
      <circle cx="34" cy="42" r="5" fill="black" />
      <path d="M39 44 q10 5 21 1" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M45 42 q3 -11 13 -9" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M20 72 q7 -6 14 0 q7 -6 14 0 q7 -6 14 0 q7 -6 14 0" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  MARSHY_GROUND: (
    <>
      <StickFigure x={38} y={48} scale={0.75} />
      <StickFigure x={60} y={50} scale={0.75} />
      <path d="M18 76 q8 -6 16 0 q8 -6 16 0 q8 -6 16 0 q8 -6 16 0" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  DROWNING_BOAT: (
    <>
      <path d="M28 68 q22 10 44 0 l-6 10 l-32 0 Z" fill="black" />
      <line x1="50" y1="68" x2="50" y2="45" stroke="black" strokeWidth="3" />
      <path d="M50 47 l14 6 l-14 6 Z" fill="black" />
      <path d="M20 80 q8 -6 16 0 q8 -6 16 0 q8 -6 16 0" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  CONFINED_SPACE: (
    <>
      <rect x="34" y="32" width="24" height="44" fill="none" stroke="black" strokeWidth="4" />
      <line x1="40" y1="40" x2="52" y2="40" stroke="black" strokeWidth="3" />
      <line x1="40" y1="50" x2="52" y2="50" stroke="black" strokeWidth="3" />
      <line x1="40" y1="60" x2="52" y2="60" stroke="black" strokeWidth="3" />
      <line x1="40" y1="70" x2="52" y2="70" stroke="black" strokeWidth="3" />
      <StickFigure x={72} y={62} scale={0.75} />
    </>
  ),
  LANDSLIDE: (
    <>
      <line x1="20" y1="42" x2="55" y2="72" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <circle cx="55" cy="55" r="4" fill="black" />
      <circle cx="64" cy="64" r="5" fill="black" />
      <circle cx="70" cy="50" r="3.5" fill="black" />
      <circle cx="72" cy="76" r="4" fill="black" />
    </>
  ),
  EXPLOSION: (
    <>
      <circle cx="48" cy="62" r="10" fill="black" />
      <line x1="50" y1="48" x2="46" y2="35" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="58" y1="50" x2="66" y2="38" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="50" x2="30" y2="42" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <path d="M58 55 q5 -8 13 -8" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="73" cy="45" r="2" fill="black" />
    </>
  ),
  TOXIC: (
    <>
      <circle cx="50" cy="52" r="13" fill="black" />
      <circle cx="45" cy="49" r="2.8" fill="#FBBF24" />
      <circle cx="55" cy="49" r="2.8" fill="#FBBF24" />
      <path d="M44 59 q6 4 12 0" stroke="#FBBF24" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="34" y1="70" x2="66" y2="82" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="66" y1="70" x2="34" y2="82" stroke="black" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
};

export function HazardWarningGuide() {
  const { t, language } = useTranslation();
  const [openId, setOpenId] = useState<HazardWarningId | null>(null);

  const ordered = [...HAZARD_WARNING_SIGNS].sort((a, b) => Number(b.common) - Number(a.common));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest flex items-center gap-2 px-1 mb-1">
          <TriangleAlert size={16} className="text-psu-warning" />
          {t('hazardWarning.sectionTitle')}
        </h3>
        <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('hazardWarning.sectionSubtitle')}</p>
      </div>

      <div className="grid gap-3">
        {ordered.map((sign) => {
          const open = openId === sign.id;
          return (
            <div key={sign.id} className="card">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : sign.id)}
                className="w-full flex items-center gap-4 text-left"
              >
                <WarningTriangle>{GLYPHS[sign.id]}</WarningTriangle>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-psu-gray">{language === 'id' ? sign.nameId : sign.nameEn}</h4>
                  <p className="text-[10px] text-psu-gray/40 font-medium mt-0.5 leading-relaxed">
                    {language === 'id' ? sign.meaningId : sign.meaningEn}
                  </p>
                </div>
                {open ? <ChevronUp size={18} className="text-psu-gray/30 shrink-0" /> : <ChevronDown size={18} className="text-psu-gray/30 shrink-0" />}
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 mt-4 border-t border-psu-gray/5 space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{t('hazmat.whatToDoLabel')}</p>
                        <p className="text-xs text-psu-gray/70 font-medium leading-relaxed">
                          {language === 'id' ? sign.whatToDoId : sign.whatToDoEn}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
