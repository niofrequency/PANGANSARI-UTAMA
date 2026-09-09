import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PhotoCapture } from '../PhotoCapture';
import { TrainingsTab } from '../TrainingsTab';
import { ClipboardCheck, History, GraduationCap, CheckCircle2, Clock, XCircle, AlertTriangle, MapPin, Check, X, MapPinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { DAILY_FOOD_HANDLER_GROUPS, DAILY_FOOD_HANDLER_ALL_CRITERIA } from '../../data/dailyFoodHandlerData';
import { computeReadyToWork, countMarked, isGoodMark } from '../../data/dailyFoodHandlerScoring';
import { DeepLinkJob, parseDeepLinkFromUrl } from '../../lib/deepLink';
import { ScanJobButton } from '../QrScanner';
import { userCanSeeSite } from '../../lib/siteScope';
import { useWorkingSite } from '../../hooks/useWorkingSite';

type DeepLinkStartAt = 'fridge' | 'core' | 'clean' | 'wellness';

const GROUP_LABEL_KEY: Record<string, string> = {
  wellness: 'dfh.groupWellness',
  personalHygiene: 'dfh.groupPersonalHygiene',
  ppe: 'dfh.groupPpe',
};

// A generous sanity range, not an official PSU SOP threshold — this app
// isn't the authority on what's food-safe, it just catches the kind of
// input that's obviously not a real reading (an empty field left at
// whatever the last person typed, a stray extra digit, a sign flip) so it
// isn't recorded as-is with nothing questioning it. Covers a chest freezer
// on the cold end through a deep fryer on the hot end.
const MIN_PLAUSIBLE_TEMP_C = -30;
const MAX_PLAUSIBLE_TEMP_C = 200;

function isPlausibleTemp(value: string): boolean {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= MIN_PLAUSIBLE_TEMP_C && n <= MAX_PLAUSIBLE_TEMP_C;
}

interface TechnicianPortalProps {
  store: ReturnType<typeof useAppStore>;
  // Scan-to-Job (deepLink.ts): which section to jump to and highlight when
  // this technician arrived via a job QR, the site the QR was scanned at
  // (blocks the whole log if it doesn't match this technician's own site —
  // see PRD "Wrong site blocks the job"), and a callback to clear the
  // pending job once it's actually been submitted.
  startAt?: DeepLinkStartAt;
  expectedSite?: string;
  onDeepLinkHandled?: () => void;
  onScanJob?: (job: DeepLinkJob) => void;
}

export function TechnicianPortal({ store, startAt, expectedSite, onDeepLinkHandled, onScanJob }: TechnicianPortalProps) {
  const { t } = useTranslation();
  const { currentUser, submissions, addSubmission, trainings, completeTraining, warnings, sites } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [highlightSection, setHighlightSection] = useState<DeepLinkStartAt | null>(null);
  // Which site this daily log is for — a single, fixed site for most
  // accounts (Home Site only, no picker); once an Admin gives this
  // Technician Site Access to more than one, a QR scan pins it, and
  // otherwise a picker on the card below lets them choose. See
  // hooks/useWorkingSite.ts.
  const { workingSiteId, workingSiteName: currentSiteName, setWorkingSiteId, availableSites, needsPicker } = useWorkingSite(currentUser, sites, expectedSite);
  const fridgeRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const cleanRef = useRef<HTMLDivElement>(null);
  const wellnessRef = useRef<HTMLDivElement>(null);
  const siteMismatch = Boolean(expectedSite && currentUser && !userCanSeeSite(currentUser, expectedSite));
  const [formData, setFormData] = useState({
    fridgeTemp: '4',
    cookingTemp: '75',
    areaClean: false,
    photo: null as string | null
  });
  // Personal wellness / hygiene / PPE self-check — same 19 criteria and the
  // same "all GOOD = Ready to Work" rule as the Supervisor/Manager roster
  // tool under Inspections, just answered by one person about themselves
  // rather than a supervisor walking the whole crew. See that tool's data
  // files for the source citation and the "computed, not sourced" note on
  // Ready to Work.
  const [wellnessMarks, setWellnessMarks] = useState<Record<string, string>>({});

  const myHistory = submissions.filter(s => s.userId === currentUser?.id);
  const myWarnings = warnings.filter(w => w.technicianId === currentUser?.id);

  const totalCriteria = DAILY_FOOD_HANDLER_ALL_CRITERIA.length;
  const markedCount = countMarked(wellnessMarks);
  const allMarked = markedCount === totalCriteria;
  const readyToWork = useMemo(() => computeReadyToWork(wellnessMarks), [wellnessMarks]);
  const fridgeTempValid = isPlausibleTemp(formData.fridgeTemp);
  const coreTempValid = isPlausibleTemp(formData.cookingTemp);
  const canSubmit = allMarked && fridgeTempValid && coreTempValid;

  const setMark = (criterionId: string, mark: string) => {
    setWellnessMarks(p => ({ ...p, [criterionId]: mark }));
  };

  // Scanning a job QR jumps here on the exact section it's for — force the
  // Tasks tab open and scroll/highlight it. Doesn't touch canSubmit: the
  // rest of today's log still has to be filled in before submitting (see
  // PRD "Scanning fridge still requires the full current technician log").
  useEffect(() => {
    if (!startAt || siteMismatch) return;
    setActiveTab('TASKS');
    setHighlightSection(startAt);
    const refs: Record<DeepLinkStartAt, React.RefObject<HTMLDivElement>> = {
      fridge: fridgeRef,
      core: coreRef,
      clean: cleanRef,
      wellness: wellnessRef,
    };
    const target = refs[startAt].current;
    if (target) {
      const timer = setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      const clearHighlight = setTimeout(() => setHighlightSection(null), 3000);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearHighlight);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startAt, siteMismatch]);

  const highlightClass = (section: DeepLinkStartAt) =>
    highlightSection === section ? 'ring-4 ring-psu-blue/30 rounded-2xl' : '';

  const handleScanned = (rawValue: string) => {
    const job = parseDeepLinkFromUrl(rawValue);
    if (job) onScanJob?.(job);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));

    const wellnessItems = DAILY_FOOD_HANDLER_ALL_CRITERIA.map(c => ({
      id: c.id,
      question: c.labelEn || c.labelId,
      answer: isGoodMark(wellnessMarks[c.id]),
    }));
    const goodCount = wellnessItems.filter(i => i.answer).length;

    addSubmission({
      userId: currentUser!.id,
      userName: currentUser!.name,
      role: currentUser!.role,
      siteId: workingSiteId,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'FOOD_SAFETY',
      status: 'PENDING',
      items: [
        { id: '1', question: t('technician.fridgeTemp'), answer: formData.fridgeTemp },
        { id: '2', question: t('technician.coreTemp'), answer: formData.cookingTemp },
        { id: '3', question: t('technician.areaClean'), answer: formData.areaClean, photoUrl: formData.photo || undefined },
        ...wellnessItems,
      ],
      score: Math.round((goodCount / totalCriteria) * 100),
      ...(startAt ? { meta: { source: 'qr' as const, qrAction: startAt } } : {}),
    });

    setFormData({ fridgeTemp: '4', cookingTemp: '75', areaClean: false, photo: null });
    setWellnessMarks({});
    setShowValidation(false);
    setIsSubmitting(false);
    setActiveTab('HISTORY');
    if (startAt) onDeepLinkHandled?.();
  };

  // A job QR scanned for a different site than this technician's own —
  // block the whole log rather than silently ignoring the mismatch (see
  // PRD "Wrong site (s= on QR != user.site): block the job").
  if (siteMismatch) {
    const scannedSiteName = sites.find(s => s.id === expectedSite)?.name || expectedSite;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-psu-rejected/10 rounded-2xl flex items-center justify-center text-psu-rejected mb-4">
          <MapPinOff size={28} />
        </div>
        <h2 className="text-lg font-bold text-psu-gray">{t('deepLink.wrongLocationTitle')}</h2>
        <p className="mt-2 text-sm text-psu-gray/60 max-w-xs">
          {t('deepLink.wrongLocationBody', { site: scannedSiteName || '', mySite: currentSiteName })}
        </p>
        <button
          onClick={() => onDeepLinkHandled?.()}
          className="mt-6 px-6 py-3 bg-psu-gray text-white rounded-2xl font-black text-[10px] uppercase tracking-widest"
        >
          {t('deepLink.continueToMyPortal')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Alert if any */}
      {myWarnings.length > 0 && (activeTab === 'TASKS') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-psu-warning/10 border-2 border-psu-warning/30 p-5 rounded-2xl flex gap-4 items-center shadow-lg shadow-psu-warning/5"
        >
          <AlertTriangle className="text-psu-warning shrink-0" size={28} />
          <div>
            <p className="text-sm font-black text-psu-warning uppercase tracking-widest">{t('common.warning')}</p>
            <p className="text-[11px] text-psu-gray/70 font-medium">{t('technician.warningAlert', { count: myWarnings.length })}</p>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'TASKS', icon: ClipboardCheck, label: t('technician.tabChecks') },
          { id: 'HISTORY', icon: History, label: t('technician.tabHistory') },
          { id: 'TRAINING', icon: GraduationCap, label: t('technician.tabTraining') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" 
                : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'TASKS' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2 gap-3">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('technician.dailyLogTitle')}</h2>
              <div className="flex items-center gap-3 shrink-0">
                {needsPicker ? (
                  <div className="flex items-center gap-1 text-[10px] font-black text-psu-gray/50 uppercase tracking-widest">
                    <MapPin size={12} className="shrink-0" />
                    <select
                      value={workingSiteId}
                      onChange={(e) => setWorkingSiteId(e.target.value)}
                      className="bg-white border border-psu-gray/10 rounded-lg px-1.5 py-1 outline-none focus:ring-2 focus:ring-psu-blue/20"
                    >
                      {availableSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">
                    <MapPin size={12} /> {currentSiteName}
                  </div>
                )}
                <ScanJobButton
                  onScanned={handleScanned}
                  label={t('technician.scanJobButton')}
                  iconOnly
                  className="w-9 h-9 rounded-xl bg-white border border-psu-gray/10 text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all"
                />
              </div>
            </div>

            <div className="card space-y-8">
              <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2 -mb-2">{t('technician.sectionOperations')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div ref={fridgeRef} className={cn("p-2 -m-2 transition-all", highlightClass('fridge'))}>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('technician.fridgeTemp')}</label>
                  <input
                    type="number"
                    required
                    value={formData.fridgeTemp}
                    onChange={(e) => setFormData(p => ({ ...p, fridgeTemp: e.target.value }))}
                    className={cn(
                      "w-full bg-psu-bg border rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20",
                      showValidation && !fridgeTempValid ? "border-psu-rejected" : "border-psu-gray/10"
                    )}
                  />
                  {showValidation && !fridgeTempValid && (
                    <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{t('technician.tempInvalid')}</p>
                  )}
                </div>
                <div ref={coreRef} className={cn("p-2 -m-2 transition-all", highlightClass('core'))}>
                  <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('technician.coreTemp')}</label>
                  <input
                    type="number"
                    required
                    value={formData.cookingTemp}
                    onChange={(e) => setFormData(p => ({ ...p, cookingTemp: e.target.value }))}
                    className={cn(
                      "w-full bg-psu-bg border rounded-xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-psu-blue/20",
                      showValidation && !coreTempValid ? "border-psu-rejected" : "border-psu-gray/10"
                    )}
                  />
                  {showValidation && !coreTempValid && (
                    <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{t('technician.tempInvalid')}</p>
                  )}
                </div>
              </div>

              <div ref={cleanRef} className={cn("space-y-3 p-2 -m-2 transition-all", highlightClass('clean'))}>
                <label className="flex items-center justify-between p-4 bg-psu-bg/50 border border-psu-gray/5 rounded-2xl cursor-pointer hover:bg-psu-bg transition-colors">
                  <span className="text-sm font-bold text-psu-gray">{t('technician.areaClean')}</span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.areaClean}
                      onChange={(e) => setFormData(p => ({ ...p, areaClean: e.target.checked }))}
                    />
                    <div className="w-12 h-6 bg-psu-gray/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-psu-blue"></div>
                  </div>
                </label>
              </div>

              <div ref={wellnessRef} className={cn("space-y-5 pt-2 p-2 -m-2 transition-all", highlightClass('wellness'))}>
                <div className="flex items-center justify-between border-b border-psu-gray/5 pb-2">
                  <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{t('technician.sectionPersonalCheck')}</h4>
                  {allMarked && (
                    <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md", readyToWork ? "bg-psu-green/10 text-psu-green" : "bg-psu-rejected/10 text-psu-rejected")}>
                      {t('dfh.readyToWork')}: {readyToWork ? t('dfh.readyYes') : t('dfh.readyNo')}
                    </span>
                  )}
                </div>

                {DAILY_FOOD_HANDLER_GROUPS.map(group => (
                  <div key={group.key} className="space-y-2">
                    <h5 className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest">{t(GROUP_LABEL_KEY[group.key])}</h5>
                    <div className="space-y-1.5">
                      {group.criteria.map(criterion => {
                        const mark = wellnessMarks[criterion.id];
                        const missing = showValidation && !mark;
                        return (
                          <div key={criterion.id} className={cn("flex items-center justify-between gap-3 py-1.5 px-2 -mx-2 rounded-xl", missing && "bg-psu-rejected/5")}>
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
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setMark(criterion.id, 'v')}
                                aria-label={t('technician.markGood')}
                                aria-pressed={isGoodMark(mark)}
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all active:scale-95",
                                  isGoodMark(mark)
                                    ? "bg-psu-green border-psu-green text-white shadow-sm shadow-psu-green/30"
                                    : "bg-psu-bg border-psu-gray/10 text-psu-gray/30 hover:border-psu-green/40 hover:text-psu-green"
                                )}
                              >
                                <Check size={16} strokeWidth={3} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setMark(criterion.id, 'x')}
                                aria-label={t('technician.markNotGood')}
                                aria-pressed={mark === 'x'}
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all active:scale-95",
                                  mark === 'x'
                                    ? "bg-psu-rejected border-psu-rejected text-white shadow-sm shadow-psu-rejected/30"
                                    : "bg-psu-bg border-psu-gray/10 text-psu-gray/30 hover:border-psu-rejected/40 hover:text-psu-rejected"
                                )}
                              >
                                <X size={16} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {allMarked && !readyToWork && (
                  <div className="bg-psu-rejected/10 border border-psu-rejected/20 text-psu-rejected text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    {t('technician.notReadyBanner')}
                  </div>
                )}
                {showValidation && !allMarked && (
                  <div className="bg-psu-rejected/10 border border-psu-rejected/20 text-psu-rejected text-xs font-bold p-4 rounded-2xl flex items-center gap-2">
                    <XCircle size={16} className="shrink-0" />
                    {t('technician.completeAllFirst')}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-3">{t('technician.photoLabel')}</label>
                <PhotoCapture uid={currentUser?.id} onCapture={(url) => setFormData(p => ({ ...p, photo: url }))} />
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-psu-blue rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl shadow-psu-blue/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Clock className="animate-spin" /> : <CheckCircle2 size={18} />}
                {isSubmitting ? t('technician.submitting') : t('technician.submitButton')}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-black text-psu-gray">{t('technician.historyTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHistory.map(s => (
                <div key={s.id} className="card flex items-center justify-between group hover:border-psu-blue/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" :
                      s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" :
                      "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? <CheckCircle2 size={24} /> :
                       s.status === 'REJECTED' ? <XCircle size={24} /> :
                       <Clock size={24} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-psu-gray">{new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{s.type} • ID {s.id.slice(-6)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md",
                      s.status === 'APPROVED' ? "bg-psu-green/10 text-psu-green" :
                      s.status === 'REJECTED' ? "bg-psu-rejected/10 text-psu-rejected" :
                      "bg-psu-blue/10 text-psu-blue"
                    )}>
                      {s.status === 'APPROVED' ? t('common.approved') : s.status === 'REJECTED' ? t('common.rejected') : t('common.pending')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'TRAINING' && (
          <motion.div
            key="training"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('technician.trainingTitle')}</h2>
            <TrainingsTab 
              trainings={trainings} 
              userId={currentUser?.id || ''} 
              onComplete={(id) => completeTraining(currentUser?.id || '', id)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
