import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  GEMBA_SECTIONS,
  GembaEvaluation,
  GEMBA_EVALUATION_OPTIONS,
  THREE_IN_A_ROW_TITLE,
  THREE_IN_A_ROW_ROLES,
  THREE_IN_A_ROW_PROMPTS,
} from '../../data/gembaWalkData';
import { scoreGembaEvaluations } from '../../data/gembaWalkScoring';
import { Submission } from '../../types';

const EVAL_KEY: Record<GembaEvaluation, string> = {
  Conform: 'evalConform',
  'Not Conform': 'evalNotConform',
  'Non Observed': 'evalNonObserved',
  'N/A': 'evalNA',
};

const EVAL_STYLE: Record<GembaEvaluation, string> = {
  Conform: 'bg-psu-green text-white border-psu-green',
  'Not Conform': 'bg-psu-rejected text-white border-psu-rejected',
  'Non Observed': 'bg-psu-warning text-white border-psu-warning',
  'N/A': 'bg-psu-gray/10 text-psu-gray/60 border-psu-gray/10',
};

interface Props {
  onSubmit: (payload: Omit<Submission, 'id' | 'userId' | 'userName' | 'role' | 'siteId' | 'siteName' | 'timestamp' | 'status'>) => void;
  onCancel: () => void;
  inspectorName: string;
}

export function GembaWalkForm({ onSubmit, onCancel, inspectorName }: Props) {
  const { t, language } = useTranslation();
  const [project, setProject] = useState('');
  const [unit, setUnit] = useState('');
  const [areaAudited, setAreaAudited] = useState('');
  const [auditors, setAuditors] = useState(inspectorName);
  const [answers, setAnswers] = useState<Record<string, GembaEvaluation>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [correctiveActions, setCorrectiveActions] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [positives, setPositives] = useState('');
  const [improvements, setImprovements] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'A-1': true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const allItems = useMemo(() => GEMBA_SECTIONS.flatMap(s => s.categories.flatMap(c => c.items)), []);
  const totalItems = allItems.length;

  const categoryStats = useMemo(() => {
    const map: Record<string, { answered: number; total: number }> = {};
    for (const section of GEMBA_SECTIONS) {
      for (const cat of section.categories) {
        const codes = cat.items.map(i => answers[i.id]);
        map[cat.key] = { answered: codes.filter(Boolean).length, total: cat.items.length };
      }
    }
    return map;
  }, [answers]);

  const overall = scoreGembaEvaluations(allItems.map(i => answers[i.id]));
  const canSubmit = overall.answered === totalItems && areaAudited.trim().length > 0;

  const toggleCategory = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const items = allItems.map(item => ({
      id: item.id,
      question: item.descEn,
      answer: answers[item.id],
      remarks: observations[item.id]?.trim() || undefined,
      correctiveAction: correctiveActions[item.id]?.trim() || undefined,
      comment: comments[item.id]?.trim() || undefined,
    }));

    onSubmit({
      type: 'GEMBA_WALK',
      items,
      score: overall.compliancePct !== null ? Math.round(overall.compliancePct) : undefined,
      meta: {
        areaAudited,
        inspectorName: auditors,
        project: project.trim() || undefined,
        unit: unit.trim() || undefined,
        evaluationCounts: {
          conform: overall.conform,
          notConform: overall.notConform,
          nonObserved: overall.nonObserved,
          na: overall.na,
        },
        threeInARowNotes: {
          positives: positives.trim() || undefined,
          improvements: improvements.trim() || undefined,
        },
      },
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-1">
        <h2 className="text-lg font-black text-psu-gray">{t('gemba.formTitle')}</h2>
        <p className="text-xs text-psu-gray/50 font-medium">{t('gemba.formSubtitle')}</p>
        <p className="text-[10px] text-psu-gray/30 font-black uppercase tracking-widest pt-1">{t('gemba.docRef')}</p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.projectLabel')}</label>
            <input value={project} onChange={e => setProject(e.target.value)} placeholder={t('gemba.projectPlaceholder')} className="input-field" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.unitLabel')}</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder={t('gemba.unitPlaceholder')} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.areaLabel')}</label>
          <input value={areaAudited} onChange={e => setAreaAudited(e.target.value)} placeholder={t('gemba.areaPlaceholder')} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.auditorsLabel')}</label>
            <input value={auditors} onChange={e => setAuditors(e.target.value)} placeholder={t('gemba.auditorsPlaceholder')} className="input-field" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.dateLabel')}</label>
            <div className="input-field bg-psu-gray/5 text-psu-gray/70">{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <p className="text-[11px] text-psu-gray/40 font-medium leading-relaxed border-t border-psu-gray/5 pt-4">{t('gemba.instructionNote')}</p>
      </div>

      {/* Sticky progress/score summary */}
      <div className="card flex items-center justify-between gap-4 sticky top-2 z-10 shadow-lg">
        <div>
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('gemba.overallProgress')}</p>
          <p className="text-sm font-black text-psu-gray">{overall.answered}/{totalItems}</p>
        </div>
        <div className="h-8 w-px bg-psu-gray/10" />
        <div className="text-right">
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('gemba.complianceScore')}</p>
          <p className="text-sm font-black text-psu-gray">{overall.compliancePct !== null ? `${Math.round(overall.compliancePct)}%` : '—'}</p>
        </div>
      </div>

      {GEMBA_SECTIONS.map(section => (
        <div key={section.key} className="space-y-3">
          <h3 className="text-[11px] font-black text-psu-gray/50 uppercase tracking-[0.15em] px-2">
            {t(`gemba.section${section.key}`)}
          </h3>
          {section.categories.map(cat => {
            const stats = categoryStats[cat.key];
            const isOpen = !!expanded[cat.key];
            return (
              <div key={cat.key} className="card p-0 overflow-hidden">
                <button onClick={() => toggleCategory(cat.key)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-psu-blue/10 text-psu-blue flex items-center justify-center text-[11px] font-black">
                      {cat.num}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-psu-gray truncate">{language === 'id' ? cat.titleId : cat.titleEn}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest">
                        {t('gemba.sectionProgress', { answered: stats.answered, total: stats.total })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stats.answered === stats.total && <span className="w-2 h-2 rounded-full bg-psu-green" />}
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
                        {cat.items.map(item => {
                          const code = answers[item.id];
                          const missing = showValidation && !code;
                          return (
                            <div key={item.id} className={cn("p-5 space-y-3", missing && "bg-psu-rejected/5")}>
                              <div>
                                <p className="text-xs text-psu-gray/70 font-medium leading-relaxed">{item.descEn}</p>
                                <p className="text-xs text-psu-gray/40 font-medium leading-relaxed italic mt-1">{item.descId}</p>
                              </div>

                              <div className="flex gap-2 flex-wrap">
                                {GEMBA_EVALUATION_OPTIONS.map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => setAnswers(p => ({ ...p, [item.id]: opt }))}
                                    className={cn(
                                      "flex-1 min-w-[70px] py-2.5 rounded-xl text-[10px] font-black border-2 transition-all active:scale-95",
                                      code === opt ? EVAL_STYLE[opt] : "bg-psu-bg border-psu-gray/10 text-psu-gray/40"
                                    )}
                                  >
                                    {t(`gemba.${EVAL_KEY[opt]}`)}
                                  </button>
                                ))}
                              </div>

                              {code === 'Not Conform' && (
                                <div className="space-y-2 pt-1">
                                  <input
                                    value={observations[item.id] || ''}
                                    onChange={e => setObservations(p => ({ ...p, [item.id]: e.target.value }))}
                                    placeholder={t('gemba.observationPlaceholder')}
                                    className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                                  />
                                  <input
                                    value={correctiveActions[item.id] || ''}
                                    onChange={e => setCorrectiveActions(p => ({ ...p, [item.id]: e.target.value }))}
                                    placeholder={t('gemba.correctiveActionPlaceholder')}
                                    className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                                  />
                                </div>
                              )}
                              <input
                                value={comments[item.id] || ''}
                                onChange={e => setComments(p => ({ ...p, [item.id]: e.target.value }))}
                                placeholder={t('gemba.commentPlaceholder')}
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
      ))}

      {/* Section C — reference / discussion guide, not scored */}
      <div className="card space-y-5">
        <h3 className="text-[11px] font-black text-psu-gray/50 uppercase tracking-[0.15em]">{t('gemba.threeInARowTitle')}</h3>
        <p className="text-xs text-psu-gray/60 font-medium">{language === 'id' ? THREE_IN_A_ROW_TITLE.id : THREE_IN_A_ROW_TITLE.en}</p>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest text-left">
                <th className="p-2">{t('gemba.levelHeader')}</th>
                <th className="p-2">{t('gemba.positionHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {THREE_IN_A_ROW_ROLES.map(role => (
                <tr key={role.level} className="border-t border-psu-gray/5">
                  <td className="p-2 font-bold text-psu-gray">{role.level}</td>
                  <td className="p-2 text-psu-gray/60">{role.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 border-t border-psu-gray/5 pt-4">
          <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-widest">{t('gemba.pointsToLookOutTitle')}</h4>
          {THREE_IN_A_ROW_PROMPTS.map((p, i) => (
            <p key={i} className="text-[11px] text-psu-gray/50 font-medium leading-relaxed">
              • {language === 'id' ? p.id : p.en}
            </p>
          ))}
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.positivesLabel')}</label>
          <textarea value={positives} onChange={e => setPositives(e.target.value)} placeholder={t('gemba.positivesPlaceholder')} className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 h-20" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('gemba.improvementsLabel')}</label>
          <textarea value={improvements} onChange={e => setImprovements(e.target.value)} placeholder={t('gemba.improvementsPlaceholder')} className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 h-20" />
        </div>
      </div>

      {showValidation && !canSubmit && (
        <div className="bg-psu-rejected/10 border border-psu-rejected/20 text-psu-rejected text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {t('gemba.completeAllFirst')}
        </div>
      )}

      <div className="flex gap-4 pb-4">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/50 font-black text-xs uppercase tracking-widest">
          {t('gemba.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-4 bg-psu-blue rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-psu-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Clock className="animate-spin" size={16} /> : <ClipboardCheck size={16} />}
          {isSubmitting ? t('gemba.submitting') : t('gemba.submitButton')}
        </button>
      </div>
    </div>
  );
}
