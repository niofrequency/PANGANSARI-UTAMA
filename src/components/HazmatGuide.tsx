// Safety Reference: the 9 standard GHS hazard pictograms, with a
// plain-language meaning, what to actually do, and where staff will
// really see each one. Lives inside TrainingsTab.tsx — see hazmatData.ts
// for why this is static content, not a completable module.
//
// Each pictogram is a hand-drawn, simplified stand-in for the real
// red-diamond GHS symbol — recognizable alongside its name and
// explanation, not a pixel-exact reproduction of the official artwork
// (which isn't needed here: nobody's certifying labels against this
// screen, they're learning to recognize a shape on a bottle).

import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useTranslation } from '../i18n/LanguageContext';
import { HAZMAT_SIGNS, NEVER_MIX_WARNING, HazmatSignId } from '../data/hazmatData';

// The shared red-diamond frame every GHS pictogram uses — a white
// rotated square with a red border. Each sign's glyph is drawn inside it
// in black, centered on the same 0–100 canvas.
function GhsDiamond({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14 shrink-0" role="img" aria-hidden="true">
      <rect
        x="20" y="20" width="60" height="60" rx="5"
        transform="rotate(45 50 50)"
        fill="white" stroke="#dc2626" strokeWidth="7"
      />
      {children}
    </svg>
  );
}

const GLYPHS: Record<HazmatSignId, React.ReactNode> = {
  CORROSIVE: (
    <>
      <line x1="34" y1="30" x2="43" y2="45" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="50" r="2.5" fill="black" />
      <rect x="28" y="55" width="20" height="4" fill="black" />
      <line x1="64" y1="30" x2="57" y2="46" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <circle cx="56" cy="51" r="2.5" fill="black" />
      <path d="M60 60 q7 6 0 13" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  IRRITANT: (
    <>
      <line x1="50" y1="30" x2="50" y2="55" stroke="black" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="65" r="4" fill="black" />
    </>
  ),
  FLAMMABLE: (
    <path
      d="M50 27 C58 38 62 46 57 56 C54 63 45 63 42 56 C39 49 42 46 45 49 C43 40 46 33 50 27 Z"
      fill="black"
    />
  ),
  OXIDIZING: (
    <>
      <circle cx="50" cy="62" r="8" fill="black" />
      <path
        d="M50 32 C56 41 58 47 54 53 C52 56 48 56 46 53 C43 48 46 45 48 48 C47 41 48 36 50 32 Z"
        fill="black"
      />
    </>
  ),
  TOXIC: (
    <>
      <circle cx="50" cy="42" r="12" fill="black" />
      <circle cx="45" cy="40" r="2.5" fill="white" />
      <circle cx="55" cy="40" r="2.5" fill="white" />
      <path d="M45 49 q5 4 10 0" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="35" y1="58" x2="65" y2="70" stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="65" y1="58" x2="35" y2="70" stroke="black" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  HEALTH_HAZARD: (
    <>
      <circle cx="50" cy="33" r="6" fill="black" />
      <path d="M39 44 Q50 38 61 44 L59 63 Q50 67 41 63 Z" fill="black" />
      <path d="M50 41 l3 6 l6.5 1 l-5 4.5 l1.3 6.5 l-5.8 -3.4 l-5.8 3.4 l1.3 -6.5 l-5 -4.5 l6.5 -1 Z" fill="white" />
    </>
  ),
  COMPRESSED_GAS: (
    <>
      <rect x="42" y="32" width="16" height="38" rx="6" fill="none" stroke="black" strokeWidth="4" />
      <rect x="46" y="25" width="8" height="8" fill="black" />
    </>
  ),
  EXPLOSIVE: (
    <>
      <circle cx="47" cy="58" r="11" fill="black" />
      <line x1="49" y1="45" x2="45" y2="34" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="55" y1="47" x2="61" y2="37" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <line x1="41" y1="47" x2="33" y2="41" stroke="black" strokeWidth="3" strokeLinecap="round" />
      <path d="M56 47 q4 -7 11 -7" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="68" cy="38" r="2" fill="black" />
    </>
  ),
  ENVIRONMENT: (
    <>
      <path
        d="M36 30 L36 52 M36 36 L30 30 M36 41 L42 35 M36 46 L30 41"
        stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
      />
      <path d="M54 44 q10 -5 17 0 q-5 6 -8.5 6 q-3.5 0 -8.5 -6 Z" fill="black" />
      <circle cx="68" cy="44" r="1.6" fill="white" />
      <path
        d="M27 63 q6 -5 12 0 q6 -5 12 0 q6 -5 12 0 q6 -5 12 0"
        stroke="black" strokeWidth="3" fill="none" strokeLinecap="round"
      />
    </>
  ),
};

export function HazmatGuide() {
  const { t, language } = useTranslation();
  const [openId, setOpenId] = useState<HazmatSignId | null>(null);

  // Common ones first — what staff will actually see on bleach,
  // disinfectants, and descalers — then the rest for completeness.
  const ordered = [...HAZMAT_SIGNS].sort((a, b) => Number(b.common) - Number(a.common));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-psu-gray uppercase tracking-widest flex items-center gap-2 px-1 mb-1">
          <ShieldAlert size={16} className="text-psu-rejected" />
          {t('hazmat.sectionTitle')}
        </h3>
        <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('hazmat.sectionSubtitle')}</p>
      </div>

      <div className="bg-psu-rejected/5 border-2 border-psu-rejected/20 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-psu-rejected shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-psu-rejected">{language === 'id' ? NEVER_MIX_WARNING.titleId : NEVER_MIX_WARNING.titleEn}</p>
          <p className="text-[11px] text-psu-gray/60 font-medium mt-1 leading-relaxed">
            {language === 'id' ? NEVER_MIX_WARNING.bodyId : NEVER_MIX_WARNING.bodyEn}
          </p>
        </div>
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
                <GhsDiamond>{GLYPHS[sign.id]}</GhsDiamond>
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
                      <div>
                        <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{t('hazmat.foundOnLabel')}</p>
                        <p className="text-xs text-psu-gray/70 font-medium leading-relaxed italic">
                          {language === 'id' ? sign.examplesId : sign.examplesEn}
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
