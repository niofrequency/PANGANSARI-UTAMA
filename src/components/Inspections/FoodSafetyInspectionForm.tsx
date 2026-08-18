import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { INSPECTION_SECTIONS } from '../../data/inspectionChecklistData';
import { ConformityCode, scoreItems, getPsuCategory } from '../../data/inspectionScoring';
import { Submission } from '../../types';

const CONFORMITY_CODES: ConformityCode[] = ['A', 'B', 'C', 'NA'];

const CONFORMITY_STYLE: Record<ConformityCode, string> = {
  A: 'bg-psu-green text-white border-psu-green',
  B: 'bg-psu-blue text-white border-psu-blue',
  C: 'bg-psu-rejected text-white border-psu-rejected',
  NA: 'bg-psu-gray/10 text-psu-gray/60 border-psu-gray/10',
};

interface Props {
  onSubmit: (payload: Omit<Submission, 'id' | 'userId' | 'userName' | 'role' | 'siteId' | 'siteName' | 'timestamp' | 'status'>) => void;
  onCancel: () => void;
  inspectorName: string;
}

export function FoodSafetyInspectionForm({ onSubmit, onCancel, inspectorName }: Props) {
  const { t, language } = useTranslation();
  const [areaAudited, setAreaAudited] = useState('');
  const [areaOwner, setAreaOwner] = useState('');
  const [answers, setAnswers] = useState<Record<string, ConformityCode>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [INSPECTION_SECTIONS[0].key]: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const allItems = useMemo(() => INSPECTION_SECTIONS.flatMap(s => s.items), []);
  const totalItems = allItems.length;

  const sectionStats = useMemo(() => {
    return INSPECTION_SECTIONS.map(section => {
      const codes = section.items.map(i => answers[i.id]);
      const { scorePct, answered } = scoreItems(codes);
      return { key: section.key, answered, total: section.items.length, scorePct };
    });
  }, [answers]);

  const overall = useMemo(() => scoreItems(allItems.map(i => answers[i.id])), [allItems, answers]);
  const category = getPsuCategory(overall.scorePct);
  const canSubmit = overall.answered === totalItems && areaAudited.trim().length > 0;

  const toggleSection = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const items = allItems.map(item => ({
      id: item.id,
      question: `${item.no ? item.no + ' — ' : ''}${item.labelEn || item.descEn}`,
      answer: answers[item.id],
      remarks: remarks[item.id]?.trim() || undefined,
    }));

    onSubmit({
      type: 'FOOD_SAFETY_INSPECTION',
      items,
      score: Math.round(overall.scorePct),
      meta: {
        areaAudited,
        areaOwner: areaOwner.trim() || undefined,
        inspectorName,
        category: category.category,
        categoryStatus: category.status,
        sectionScores: sectionStats.map(s => {
          const section = INSPECTION_SECTIONS.find(sec => sec.key === s.key)!;
          return { key: s.key, titleId: section.titleId, titleEn: section.titleEn, scorePct: Math.round(s.scorePct) };
        }),
      },
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-1">
        <h2 className="text-lg font-black text-psu-gray">{t('inspection.formTitle')}</h2>
        <p className="text-xs text-psu-gray/50 font-medium">{t('inspection.formSubtitle')}</p>
        <p className="text-[10px] text-psu-gray/30 font-black uppercase tracking-widest pt-1">{t('inspection.docRef')}</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('inspection.areaLabel')}</label>
          <input
            value={areaAudited}
            onChange={e => setAreaAudited(e.target.value)}
            placeholder={t('inspection.areaPlaceholder')}
            className="input-field"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('inspection.inspectorLabel')}</label>
            <div className="input-field bg-psu-gray/5 text-psu-gray/70">{inspectorName}</div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('inspection.dateLabel')}</label>
            <div className="input-field bg-psu-gray/5 text-psu-gray/70">{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('inspection.areaOwnerLabel')}</label>
          <input
            value={areaOwner}
            onChange={e => setAreaOwner(e.target.value)}
            placeholder={t('inspection.areaOwnerPlaceholder')}
            className="input-field"
          />
        </div>
        <p className="text-[11px] text-psu-gray/40 font-medium leading-relaxed border-t border-psu-gray/5 pt-4">{t('inspection.instructionNote')}</p>
      </div>

      {/* Sticky progress/score summary */}
      <div className="card flex items-center justify-between gap-4 sticky top-2 z-10 shadow-lg">
        <div>
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('inspection.overallProgress')}</p>
          <p className="text-sm font-black text-psu-gray">{overall.answered}/{totalItems}</p>
        </div>
        <div className="h-8 w-px bg-psu-gray/10" />
        <div>
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('inspection.overallScore')}</p>
          <p className="text-sm font-black text-psu-gray">{overall.scored > 0 ? `${Math.round(overall.scorePct)}%` : '—'}</p>
        </div>
        <div className="h-8 w-px bg-psu-gray/10" />
        <div className="text-right">
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('inspection.category')}</p>
          <p className={cn(
            "text-sm font-black",
            category.category === 'A' ? 'text-psu-green' : category.category === 'B' ? 'text-psu-blue' : category.category === 'C' ? 'text-psu-warning' : 'text-psu-rejected'
          )}>{overall.scored > 0 ? category.category : '—'}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {INSPECTION_SECTIONS.map((section, idx) => {
          const stats = sectionStats[idx];
          const isOpen = !!expanded[section.key];
          return (
            <div key={section.key} className="card p-0 overflow-hidden">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-psu-blue/10 text-psu-blue flex items-center justify-center text-[11px] font-black">
                    {section.no || (idx + 1)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-psu-gray truncate">{language === 'id' ? section.titleId : section.titleEn}</h3>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest">
                      {t('inspection.sectionProgress', { answered: stats.answered, total: stats.total })}
                      {stats.answered > 0 ? ` · ${Math.round(stats.scorePct)}%` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {stats.answered === stats.total && (
                    <span className="w-2 h-2 rounded-full bg-psu-green" />
                  )}
                  <ChevronDown size={18} className={cn("text-psu-gray/30 transition-transform", isOpen && "rotate-180")} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-psu-gray/5 divide-y divide-psu-gray/5">
                      {section.items.map(item => {
                        const code = answers[item.id];
                        const missing = showValidation && !code;
                        return (
                          <div key={item.id} className={cn("p-5 space-y-3", missing && "bg-psu-rejected/5")}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {item.no && <span className="text-[9px] font-black text-psu-blue/70 uppercase tracking-widest">{item.no}</span>}
                                {(item.labelId || item.labelEn) && (
                                  <p className="text-xs font-black text-psu-gray mt-0.5">
                                    {language === 'id' ? item.labelId : item.labelEn}
                                  </p>
                                )}
                                <p className="text-xs text-psu-gray/70 font-medium leading-relaxed mt-1">{item.descId}</p>
                                <p className="text-xs text-psu-gray/40 font-medium leading-relaxed italic mt-1">{item.descEn}</p>
                                {item.reference && (
                                  <p className="text-[9px] text-psu-gray/30 font-bold uppercase tracking-wide mt-2">{t('inspection.itemReference')}: {item.reference}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {CONFORMITY_CODES.map(c => (
                                <button
                                  key={c}
                                  onClick={() => setAnswers(p => ({ ...p, [item.id]: c }))}
                                  className={cn(
                                    "flex-1 py-2.5 rounded-xl text-[11px] font-black border-2 transition-all active:scale-95",
                                    code === c ? CONFORMITY_STYLE[c] : "bg-psu-bg border-psu-gray/10 text-psu-gray/40"
                                  )}
                                >
                                  {t(`inspection.conformityShort.${c}`)}
                                </button>
                              ))}
                            </div>

                            <input
                              value={remarks[item.id] || ''}
                              onChange={e => setRemarks(p => ({ ...p, [item.id]: e.target.value }))}
                              placeholder={t('inspection.remarksPlaceholder')}
                              className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {showValidation && !canSubmit && (
        <div className="bg-psu-rejected/10 border border-psu-rejected/20 text-psu-rejected text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {t('inspection.completeAllFirst')}
        </div>
      )}

      <div className="flex gap-4 pb-4">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/50 font-black text-xs uppercase tracking-widest">
          {t('inspection.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-4 bg-psu-blue rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-psu-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Clock className="animate-spin" size={16} /> : <ClipboardCheck size={16} />}
          {isSubmitting ? t('inspection.submitting') : t('inspection.submitButton')}
        </button>
      </div>
    </div>
  );
}
