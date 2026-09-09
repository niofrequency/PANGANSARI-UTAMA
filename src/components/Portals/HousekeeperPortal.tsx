import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PhotoCapture } from '../PhotoCapture';
import { TrainingsTab } from '../TrainingsTab';
import {
  ClipboardList, History, GraduationCap, CheckCircle2, Clock, XCircle, MapPin, MapPinOff,
  Check, Sparkles, BedDouble, Bath, Sofa, UtensilsCrossed, Shirt,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import {
  ROOM_CLEANING_GROUPS, ROOM_CLEANING_ITEMS, itemsForGroup,
  TIDAK_DIKERJAKAN_REASONS, RoomCleaningGroupKey, RoomCleaningItem, TidakDikerjakanReason,
} from '../../data/roomCleaningData';
import { wasDoneWithinDays, wasDoneThisCalendarMonth } from '../../data/roomCleaningCadence';
import { DeepLinkJob, parseDeepLinkFromUrl } from '../../lib/deepLink';
import { ScanJobButton } from '../QrScanner';

const GROUP_ICON: Record<RoomCleaningGroupKey, typeof Sparkles> = {
  '1': Sparkles,
  '2': BedDouble,
  '3': Bath,
  '4': Sofa,
  '5': UtensilsCrossed,
  '6': Shirt,
};

interface ItemState {
  checked: boolean;
  reason?: TidakDikerjakanReason;
}

interface HousekeeperPortalProps {
  store: ReturnType<typeof useAppStore>;
  // Scan-to-Job (deepLink.ts): prefills BARAK + NO. KAMAR from the scanned
  // room QR, and the site it was scanned at (blocks the form if it doesn't
  // match this housekeeper's own site — same "Lokasi salah" pattern as
  // TechnicianPortal.tsx).
  startBarak?: string;
  startRoom?: string;
  expectedSite?: string;
  onDeepLinkHandled?: () => void;
  onScanJob?: (job: DeepLinkJob) => void;
}

export function HousekeeperPortal({ store, startBarak, startRoom, expectedSite, onDeepLinkHandled, onScanJob }: HousekeeperPortalProps) {
  const { t, language } = useTranslation();
  const { currentUser, submissions, addSubmission, trainings, completeTraining, sites } = store;
  const [activeTab, setActiveTab] = useState<'TASKS' | 'HISTORY' | 'TRAINING'>('TASKS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const currentSite = sites.find(s => s.id === currentUser?.site);
  const currentSiteName = currentSite?.name || currentUser?.site || '';
  const siteMismatch = Boolean(expectedSite && currentUser && currentUser.site !== expectedSite);

  const [barak, setBarak] = useState(startBarak || '');
  const [roomId, setRoomId] = useState(startRoom || '');
  const [checklistState, setChecklistState] = useState<Record<string, ItemState>>({});
  // One proof photo for the whole submission, not per section.
  const [photo, setPhoto] = useState<string | null>(null);

  // A job QR always wins over whatever was typed before it was scanned —
  // this is the whole point of scanning the door sticker.
  useEffect(() => {
    if (startBarak !== undefined) setBarak(startBarak);
    if (startRoom !== undefined) setRoomId(startRoom);
  }, [startBarak, startRoom]);

  const cameFromQr = startBarak !== undefined || startRoom !== undefined;

  const myHistory = submissions.filter(s => s.userId === currentUser?.id);

  // Cadence: daily items are always due; 6.1 (weekly) is due unless this
  // exact room has had a successful 6.1 in the last 7 days; 1.7/1.8/3.6/6.2
  // (monthly) are due unless done this calendar month for this room. With
  // no room identity typed yet there's nothing to check history against,
  // so a non-daily item shows as due by default rather than silently
  // skippable.
  const isRequiredToday = (item: RoomCleaningItem): boolean => {
    if (item.cadence === 'daily') return true;
    const b = barak.trim();
    const r = roomId.trim();
    if (!b || !r) return true;
    if (item.cadence === 'weekly') return !wasDoneWithinDays(submissions, b, r, item.id, 7);
    return !wasDoneThisCalendarMonth(submissions, b, r, item.id);
  };

  const isAnswered = (itemId: string) => Boolean(checklistState[itemId]?.checked || checklistState[itemId]?.reason);

  const toggleChecked = (itemId: string) => {
    setChecklistState(prev => {
      const wasChecked = prev[itemId]?.checked;
      return { ...prev, [itemId]: { checked: !wasChecked, reason: undefined } };
    });
  };

  const setReason = (itemId: string, reason: TidakDikerjakanReason) => {
    setChecklistState(prev => ({ ...prev, [itemId]: { checked: false, reason } }));
  };

  const dailyItems = useMemo(() => ROOM_CLEANING_ITEMS.filter(i => i.cadence === 'daily'), []);
  const dueNonDailyItems = useMemo(
    () => ROOM_CLEANING_ITEMS.filter(i => i.cadence !== 'daily' && isRequiredToday(i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [barak, roomId, submissions]
  );

  const barakFilled = barak.trim().length > 0;
  const roomFilled = roomId.trim().length > 0;
  const allDailyAnswered = dailyItems.every(i => checklistState[i.id]?.checked);
  const allDueAnswered = dueNonDailyItems.every(i => isAnswered(i.id));
  const photoPresent = Boolean(photo);
  const canSubmit = barakFilled && roomFilled && allDailyAnswered && allDueAnswered && photoPresent;

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
    await new Promise(r => setTimeout(r, 800));

    const requiredToday = [...dailyItems, ...dueNonDailyItems];
    const checkedRequiredCount = requiredToday.filter(i => checklistState[i.id]?.checked).length;
    const score = requiredToday.length > 0 ? Math.round((checkedRequiredCount / requiredToday.length) * 100) : 100;

    const items = ROOM_CLEANING_ITEMS.map(item => {
      const state = checklistState[item.id];
      return {
        id: item.id,
        question: `${item.labelId} (${item.labelEn})`,
        answer: Boolean(state?.checked),
        remarks: state?.reason ? t(`housekeeper.reason.${state.reason}`) : undefined,
      };
    });

    addSubmission({
      userId: currentUser!.id,
      userName: currentUser!.name,
      role: currentUser!.role,
      siteId: currentUser!.site,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'HOUSEKEEPING',
      status: 'PENDING',
      items,
      score,
      meta: {
        formId: 'UN.00.65',
        barak: barak.trim(),
        roomId: roomId.trim(),
        photoUrl: photo || undefined,
        ...(cameFromQr ? { source: 'qr' as const, qrAction: 'room' as const, qrRoomId: startRoom } : {}),
      },
    });

    setChecklistState({});
    setPhoto(null);
    setShowValidation(false);
    setIsSubmitting(false);
    setActiveTab('HISTORY');
    if (cameFromQr) onDeepLinkHandled?.();
  };

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
      {/* Tab Navigation */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {[
          { id: 'TASKS', icon: ClipboardList, label: t('housekeeper.tabTasks') },
          { id: 'HISTORY', icon: History, label: t('housekeeper.tabHistory') },
          { id: 'TRAINING', icon: GraduationCap, label: t('housekeeper.tabTraining') },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id
                ? "bg-psu-green text-white shadow-md shadow-psu-green/20"
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
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2 gap-3">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray truncate">{t('housekeeper.today')}</h2>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">
                  <MapPin size={12} /> {currentSiteName}
                </div>
                <ScanJobButton
                  onScanned={handleScanned}
                  label={t('housekeeper.scanJobButton')}
                  iconOnly
                  className="w-9 h-9 rounded-xl bg-white border border-psu-gray/10 text-psu-gray/50 flex items-center justify-center active:scale-95 transition-all"
                />
              </div>
            </div>

            {/* BARAK + NO. KAMAR */}
            <div className="card grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('housekeeper.barakLabel')}</label>
                <input
                  type="text"
                  value={barak}
                  onChange={(e) => setBarak(e.target.value)}
                  placeholder={t('housekeeper.barakPlaceholder')}
                  className={cn(
                    "w-full text-center text-2xl font-black py-3 bg-psu-bg border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all",
                    showValidation && !barakFilled ? "border-psu-rejected" : "border-psu-gray/10"
                  )}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('housekeeper.roomLabel')}</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder={t('housekeeper.roomPlaceholder')}
                  className={cn(
                    "w-full text-center text-2xl font-black py-3 bg-psu-bg border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-psu-green/20 transition-all",
                    showValidation && !roomFilled ? "border-psu-rejected" : "border-psu-gray/10"
                  )}
                />
              </div>
            </div>

            {/* One flat, continuous checklist — same shape as the paper
                form itself (a single numbered list with section labels),
                not a set of tap-to-open tiles. */}
            <div className="card space-y-7">
              {ROOM_CLEANING_GROUPS.map(group => {
                const Icon = GROUP_ICON[group.key];
                return (
                  <div key={group.key} className="space-y-3">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">
                      <Icon size={14} className="text-psu-gray/25" />
                      {group.key}. {language === 'id' ? group.titleId : group.titleEn}
                    </h4>

                    {itemsForGroup(group.key).map(item => {
                      const due = isRequiredToday(item);
                      const state = checklistState[item.id];
                      const missing = showValidation && ((item.cadence === 'daily' && !state?.checked) || (item.cadence !== 'daily' && due && !isAnswered(item.id)));
                      return (
                        <div key={item.id} className={cn("p-3 -mx-1 rounded-2xl transition-all", missing && "bg-psu-rejected/5")}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-psu-gray">{item.labelId}</p>
                              <p className="text-[10px] text-psu-gray/40 italic">{item.labelEn}</p>
                              {item.cadence !== 'daily' && (
                                <span className={cn(
                                  "inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                  due ? "bg-psu-warning/10 text-psu-warning" : "bg-psu-gray/5 text-psu-gray/30"
                                )}>
                                  {item.cadence === 'weekly' ? t('housekeeper.cadenceWeekly') : t('housekeeper.cadenceMonthly')}
                                  {' · '}
                                  {due ? t('housekeeper.due') : t('housekeeper.notDue')}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleChecked(item.id)}
                              className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all active:scale-95",
                                state?.checked ? "bg-psu-green border-psu-green text-white" : "bg-psu-bg border-psu-gray/10 text-psu-gray/20"
                              )}
                            >
                              {state?.checked && <Check size={20} strokeWidth={3} />}
                            </button>
                          </div>

                          {item.cadence !== 'daily' && due && !state?.checked && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest w-full">
                                {t('housekeeper.notDoneLabel')}
                              </span>
                              {TIDAK_DIKERJAKAN_REASONS.map(reason => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setReason(item.id, reason)}
                                  className={cn(
                                    "px-3 py-2 rounded-xl text-[10px] font-bold transition-all",
                                    state?.reason === reason
                                      ? "bg-psu-gray text-white"
                                      : "bg-psu-bg text-psu-gray/50 border border-psu-gray/10"
                                  )}
                                >
                                  {t(`housekeeper.reason.${reason}`)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* One proof photo for the whole submission, not per section. */}
            <div className="card">
              <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">
                {t('housekeeper.groupPhotoLabel')}
              </label>
              <PhotoCapture uid={currentUser?.id} onCapture={(url) => setPhoto(url)} />
              {showValidation && !photo && (
                <p className="text-[10px] text-psu-rejected font-bold mt-2">{t('housekeeper.photoRequired')}</p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                canSubmit ? "bg-psu-green shadow-psu-green/20" : "bg-psu-gray/20 cursor-not-allowed text-psu-gray/40"
              )}
            >
              {isSubmitting ? <Clock className="animate-spin" /> : <CheckCircle2 size={18} />}
              {isSubmitting ? t('housekeeper.submitting') : t('housekeeper.submitButton')}
            </button>
            {showValidation && !canSubmit && (
              <p className="text-center text-[10px] text-psu-rejected font-bold uppercase tracking-widest">
                {t('housekeeper.completeAllFirst')}
              </p>
            )}
          </motion.div>
        )}

        {activeTab === 'HISTORY' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('housekeeper.historyTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHistory.map(s => (
                <div key={s.id} className="card flex items-center justify-between group hover:border-psu-green/20 transition-all">
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
                      <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
                        {s.meta?.barak && s.meta?.roomId ? `${s.meta.barak} · ${s.meta.roomId} · ` : ''}{s.type} • ID {s.id.slice(-6)}
                      </p>
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
              {myHistory.length === 0 && (
                <div className="text-center py-10 opacity-40">
                  <ClipboardList size={48} className="mx-auto mb-2" />
                  <p className="text-sm font-bold uppercase tracking-widest">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'TRAINING' && (
          <motion.div
            key="training"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <h2 className="text-lg font-black text-psu-gray mb-4">{t('housekeeper.trainingTitle')}</h2>
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
