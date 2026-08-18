import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ClipboardCheck, Clock, Plus, Trash2, XCircle, User } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { DAILY_FOOD_HANDLER_GROUPS, DAILY_FOOD_HANDLER_ALL_CRITERIA } from '../../data/dailyFoodHandlerData';
import { computeReadyToWork, countMarked, isGoodMark, scoreRoster } from '../../data/dailyFoodHandlerScoring';
import { DailyFoodHandlerRosterEntry, Submission } from '../../types';

interface RowState {
  key: string;
  name: string;
  position: string;
  marks: Record<string, string>;
  remark: string;
}

function newRow(key: string): RowState {
  return { key, name: '', position: '', marks: {}, remark: '' };
}

interface Props {
  onSubmit: (payload: Omit<Submission, 'id' | 'userId' | 'userName' | 'role' | 'siteId' | 'siteName' | 'timestamp' | 'status'>) => void;
  onCancel: () => void;
  siteName: string;
}

export function DailyFoodHandlerForm({ onSubmit, onCancel, siteName }: Props) {
  const { t, language } = useTranslation();
  const rowCounter = useRef(1);
  const [rows, setRows] = useState<RowState[]>([newRow('row-0')]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'row-0': true });
  const [checkedBy, setCheckedBy] = useState('');
  const [acknowledgedBy, setAcknowledgedBy] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const totalCriteria = DAILY_FOOD_HANDLER_ALL_CRITERIA.length;

  const rowsMarkedComplete = useMemo(
    () => rows.filter(r => r.name.trim().length > 0 && countMarked(r.marks) === totalCriteria).length,
    [rows, totalCriteria]
  );
  const canSubmit = rows.length > 0 && rowsMarkedComplete === rows.length;

  const addRow = () => {
    const key = `row-${rowCounter.current++}`;
    setRows(p => [...p, newRow(key)]);
    setExpanded(p => ({ ...p, [key]: true }));
  };

  const removeRow = (key: string) => {
    setRows(p => p.filter(r => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<RowState>) => {
    setRows(p => p.map(r => (r.key === key ? { ...r, ...patch } : r)));
  };

  const setMark = (key: string, criterionId: string, mark: string) => {
    setRows(p => p.map(r => (r.key === key ? { ...r, marks: { ...r.marks, [criterionId]: mark } } : r)));
  };

  const toggleExpanded = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));

    const roster: DailyFoodHandlerRosterEntry[] = rows.map((r, idx) => ({
      no: idx + 1,
      name: r.name.trim(),
      position: r.position.trim(),
      marks: r.marks,
      readyToWork: computeReadyToWork(r.marks),
      remark: r.remark.trim() || undefined,
    }));

    onSubmit({
      type: 'DAILY_FOOD_HANDLER',
      items: [],
      score: scoreRoster(roster.map(r => r.readyToWork)),
      meta: {
        areaAudited: siteName,
        roster,
        checkedBy: checkedBy.trim() || undefined,
        acknowledgedBy: acknowledgedBy.trim() || undefined,
        verifiedBy: verifiedBy.trim() || undefined,
      },
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-1">
        <h2 className="text-lg font-black text-psu-gray">{t('dfh.formTitle')}</h2>
        <p className="text-xs text-psu-gray/50 font-medium">{t('dfh.formSubtitle')}</p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('dfh.locationLabel')}</label>
            <div className="input-field bg-psu-gray/5 text-psu-gray/70">{siteName}</div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('dfh.dateLabel')}</label>
            <div className="input-field bg-psu-gray/5 text-psu-gray/70">{new Date().toLocaleDateString(language === 'id' ? 'id-ID' : undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <p className="text-[11px] text-psu-gray/40 font-medium leading-relaxed border-t border-psu-gray/5 pt-4">{t('dfh.instructionNote')}</p>
      </div>

      {/* Sticky progress summary */}
      <div className="card flex items-center justify-between gap-4 sticky top-2 z-10 shadow-lg">
        <div>
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('dfh.overallProgress')}</p>
          <p className="text-sm font-black text-psu-gray">{rowsMarkedComplete}/{rows.length}</p>
        </div>
        <div className="h-8 w-px bg-psu-gray/10" />
        <div className="text-right">
          <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('dfh.readyToWork')}</p>
          <p className="text-sm font-black text-psu-gray">
            {t('dfh.readyCount', { ready: rows.filter(r => computeReadyToWork(r.marks)).length, total: rows.length })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-black text-psu-gray/50 uppercase tracking-[0.15em] px-2">{t('dfh.rosterTitle')}</h3>

        {rows.map((row, idx) => {
          const isOpen = !!expanded[row.key];
          const markedCount = countMarked(row.marks);
          const rowComplete = row.name.trim().length > 0 && markedCount === totalCriteria;
          const ready = computeReadyToWork(row.marks);
          const missing = showValidation && !rowComplete;
          return (
            <div key={row.key} className={cn("card p-0 overflow-hidden", missing && "ring-2 ring-psu-rejected/30")}>
              <button onClick={() => toggleExpanded(row.key)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-psu-blue/10 text-psu-blue flex items-center justify-center text-[11px] font-black">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-psu-gray truncate">{row.name.trim() || t('dfh.namePlaceholder')}</h4>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest">
                      {t('dfh.staffProgress', { answered: markedCount, total: totalCriteria })}
                      {markedCount === totalCriteria ? ` · ${ready ? t('dfh.readyYes') : t('dfh.readyNo')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {markedCount === totalCriteria && (
                    <span className={cn("w-2 h-2 rounded-full", ready ? "bg-psu-green" : "bg-psu-rejected")} />
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
                    <div className="border-t border-psu-gray/5 p-5 space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={row.name}
                          onChange={e => updateRow(row.key, { name: e.target.value })}
                          placeholder={t('dfh.namePlaceholder')}
                          className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                        />
                        <input
                          value={row.position}
                          onChange={e => updateRow(row.key, { position: e.target.value })}
                          placeholder={t('dfh.positionPlaceholder')}
                          className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                        />
                      </div>

                      {DAILY_FOOD_HANDLER_GROUPS.map(group => (
                        <div key={group.key} className="space-y-2">
                          <h5 className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest">{t(`dfh.group${group.key.charAt(0).toUpperCase()}${group.key.slice(1)}`)}</h5>
                          <div className="space-y-1.5">
                            {group.criteria.map(criterion => {
                              const mark = row.marks[criterion.id];
                              return (
                                <div key={criterion.id} className="flex items-center justify-between gap-3 py-1">
                                  <span className="text-xs font-medium text-psu-gray/70 min-w-0">
                                    {criterion.labelEn ? (
                                      <>
                                        <span className="font-bold text-psu-gray">{criterion.labelEn}</span>{' '}
                                        <span className="text-psu-gray/50 italic">({criterion.labelId})</span>
                                      </>
                                    ) : (
                                      <span className="font-bold text-psu-gray">{criterion.labelId}</span>
                                    )}
                                  </span>
                                  <input
                                    value={mark || ''}
                                    onChange={e => setMark(row.key, criterion.id, e.target.value)}
                                    placeholder={t('dfh.markPlaceholder')}
                                    maxLength={8}
                                    className={cn(
                                      "w-16 shrink-0 text-center p-2 rounded-lg text-xs font-black border-2 uppercase focus:outline-none transition-colors",
                                      !mark ? "bg-psu-bg border-psu-gray/10 text-psu-gray/60" :
                                      isGoodMark(mark) ? "bg-psu-green/10 border-psu-green text-psu-green" : "bg-psu-rejected/10 border-psu-rejected text-psu-rejected"
                                    )}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between bg-psu-bg/50 rounded-xl p-3 border border-psu-gray/5">
                        <span className="text-[10px] font-black text-psu-gray/50 uppercase tracking-widest">{t('dfh.readyToWork')}</span>
                        <span className={cn("text-xs font-black", markedCount === totalCriteria ? (ready ? "text-psu-green" : "text-psu-rejected") : "text-psu-gray/30")}>
                          {markedCount === totalCriteria ? (ready ? t('dfh.readyYes') : t('dfh.readyNo')) : '—'}
                        </span>
                      </div>

                      <input
                        value={row.remark}
                        onChange={e => updateRow(row.key, { remark: e.target.value })}
                        placeholder={t('dfh.remarkPlaceholder')}
                        className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
                      />

                      {rows.length > 1 && (
                        <button
                          onClick={() => removeRow(row.key)}
                          className="flex items-center gap-2 text-[10px] font-black text-psu-rejected/70 uppercase tracking-widest"
                        >
                          <Trash2 size={13} /> {t('dfh.removeStaff')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="text-center py-12 opacity-20">
            <User size={48} className="mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('dfh.emptyRoster')}</p>
          </div>
        )}

        <button
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-psu-blue/30 text-psu-blue rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-psu-blue/5 transition-all"
        >
          <Plus size={16} /> {t('dfh.addStaff')}
        </button>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('dfh.checkedByLabel')}</label>
          <input value={checkedBy} onChange={e => setCheckedBy(e.target.value)} placeholder={t('dfh.signaturePlaceholder')} className="input-field" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('dfh.acknowledgedByLabel')}</label>
          <input value={acknowledgedBy} onChange={e => setAcknowledgedBy(e.target.value)} placeholder={t('dfh.signaturePlaceholder')} className="input-field" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('dfh.verifiedByLabel')}</label>
          <input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)} placeholder={t('dfh.signaturePlaceholder')} className="input-field" />
        </div>
      </div>

      {showValidation && !canSubmit && (
        <div className="bg-psu-rejected/10 border border-psu-rejected/20 text-psu-rejected text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {t('dfh.completeAllFirst')}
        </div>
      )}

      <div className="flex gap-4 pb-4">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/50 font-black text-xs uppercase tracking-widest">
          {t('dfh.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-[2] py-4 bg-psu-blue rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-psu-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Clock className="animate-spin" size={16} /> : <ClipboardCheck size={16} />}
          {isSubmitting ? t('dfh.submitting') : t('dfh.submitButton')}
        </button>
      </div>
    </div>
  );
}
