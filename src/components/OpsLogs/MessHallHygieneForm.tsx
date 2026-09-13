import { Key, useState } from 'react';
import { PhotoCapture } from '../PhotoCapture';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, ChecklistRow } from './opsHelpers';
import { MESS_HALL_AREAS, MessHallArea, MessHallMark } from '../../data/messHallHygieneData';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { Submission } from '../../types';

// UWL10001 Checklist Kebersihan dan Perawatan Area Mess Hall — the paper
// is one sheet per area for the whole month, one column per day, every
// line B (Bersih/Baik) or R (Rusak). The app keeps ONE SUBMISSION PER
// AREA PER DAY (same "standing sheet" shape as TempControlForm.tsx —
// see that file's header comment for why): today's column only, one
// Save upserts it, and the desktop month grid below is built by
// querying a month of those per-day submissions.
export function MessHallHygieneForm({ store, onCancel, onSubmitted }: OpsFormProps) {
  const { t, language } = useTranslation();
  const { currentUser, sites, submissions, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);
  const today = new Date().toISOString().slice(0, 10);

  const [areaKey, setAreaKey] = useState(MESS_HALL_AREAS[0]?.key || 'D');
  const area = MESS_HALL_AREAS.find(a => a.key === areaKey)!;

  const todaysSubmission = submissions.find(s =>
    s.type === 'MESS_HALL_HYGIENE' && s.meta?.areaKey === area.key && s.siteId === workingSiteId && s.meta?.date === today
  );

  return (
    <div className="space-y-6">
      <OpsHeaderChip
        siteName={currentSiteName}
        formId="UWL10001"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')}
        siteOptions={availableSites}
        onSiteChange={setWorkingSiteId}
      />

      {MESS_HALL_AREAS.length > 1 && (
        <div className="card">
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.messHall.areaLabel')}</label>
          <select value={areaKey} onChange={(e) => setAreaKey(e.target.value)} className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold">
            {MESS_HALL_AREAS.map(a => <option key={a.key} value={a.key}>{a.key} — {language === 'id' ? a.titleId : a.titleEn}</option>)}
          </select>
        </div>
      )}

      <MessHallDayEditor
        key={area.key}
        area={area}
        language={language}
        existing={todaysSubmission}
        currentUserId={currentUser?.id}
        onSave={(marks, photos) => {
          if (!currentUser) return;
          const rCount = area.items.filter(i => marks[i.id] === 'R').length;
          const items = area.items.map(i => ({
            id: i.id,
            question: `${i.labelId} (${i.labelEn})`,
            answer: marks[i.id],
            photoUrl: photos[i.id],
          }));
          const score = Math.round(((area.items.length - rCount) / area.items.length) * 100);
          if (todaysSubmission) {
            resubmitAfterRejection(todaysSubmission.id, { items, score, meta: { ...todaysSubmission.meta, areaKey: area.key } });
          } else {
            addSubmission({
              userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
              siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
              type: 'MESS_HALL_HYGIENE', status: 'PENDING',
              items, score,
              meta: {
                formId: 'UWL10001', areaKey: area.key, date: today,
                signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
              },
            });
          }
          onSubmitted();
        }}
        onCancel={onCancel}
      />

      <MessHallMonthGrid area={area} submissions={submissions} siteId={workingSiteId} language={language} today={today} />
    </div>
  );
}

// Today's column for one area — every line, a big B/R each, photo
// optional on R. Not require re-marking yesterday: reopening today's
// already-saved entry just hydrates from it (see `existing` below), a
// blank day starts with every line unmarked.
function MessHallDayEditor({
  area, language, existing, currentUserId, onSave, onCancel,
}: {
  // Declared (never read) purely so key={...} type-checks — see
  // GarmentCounter's identical comment in LaundryShopForm.tsx.
  key?: Key;
  area: MessHallArea;
  language: string;
  existing?: Submission;
  currentUserId?: string;
  onSave: (marks: Record<string, MessHallMark>, photos: Record<string, string>) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [marks, setMarks] = useState<Record<string, MessHallMark>>(() => {
    const initial: Record<string, MessHallMark> = {};
    existing?.items.forEach(i => { if (i.answer === 'B' || i.answer === 'R') initial[i.id] = i.answer; });
    return initial;
  });
  const [photos, setPhotos] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    existing?.items.forEach(i => { if (i.photoUrl) initial[i.id] = i.photoUrl; });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const allMarked = area.items.every(i => marks[i.id]);
  const setMark = (id: string, mark: MessHallMark) => setMarks(p => ({ ...p, [id]: mark }));

  const handleSave = async () => {
    if (!allMarked) { setShowValidation(true); return; }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    onSave(marks, photos);
    setIsSubmitting(false);
  };

  return (
    <div className="card space-y-4">
      <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">
        {area.key} — {language === 'id' ? area.titleId : area.titleEn}
      </h4>
      {area.items.map(item => {
        const missing = showValidation && !marks[item.id];
        return (
          <div key={item.id} className={cn("p-3 -mx-1 rounded-2xl transition-all", missing && "bg-psu-rejected/5")}>
            <ChecklistRow
              label={item.labelId}
              sublabel={item.labelEn}
              actions={<>
                <button
                  type="button"
                  onClick={() => setMark(item.id, 'B')}
                  className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border-2 font-black text-xs transition-all active:scale-95",
                    marks[item.id] === 'B' ? "bg-psu-green border-psu-green text-white" : "bg-psu-bg border-psu-gray/10 text-psu-gray/30")}
                >B</button>
                <button
                  type="button"
                  onClick={() => setMark(item.id, 'R')}
                  className={cn("w-11 h-11 rounded-2xl flex items-center justify-center border-2 font-black text-xs transition-all active:scale-95",
                    marks[item.id] === 'R' ? "bg-psu-rejected border-psu-rejected text-white" : "bg-psu-bg border-psu-gray/10 text-psu-gray/30")}
                >R</button>
              </>}
            />
            {marks[item.id] === 'R' && (
              <div className="mt-3">
                <PhotoCapture uid={currentUserId} onCapture={(url) => setPhotos(p => ({ ...p, [item.id]: url }))} />
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        {onCancel && <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>}
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", allMarked ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.save')}</button>
      </div>
    </div>
  );
}

// Desktop-only (md+) read-only month grid — lines x days, B/R per cell.
// Same "one submission per area per day" query pattern as
// TempControlForm.tsx's own month grid.
function MessHallMonthGrid({ area, submissions, siteId, language, today }: {
  area: MessHallArea; submissions: Submission[]; siteId: string; language: string; today: string;
}) {
  const { t } = useTranslation();
  const monthPrefix = today.slice(0, 7);
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const byDate = new Map<string, Submission>();
  submissions.forEach(s => {
    if (s.type === 'MESS_HALL_HYGIENE' && s.meta?.areaKey === area.key && s.siteId === siteId && s.meta?.date?.startsWith(monthPrefix)) {
      byDate.set(s.meta.date!, s);
    }
  });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="hidden md:block space-y-2">
      <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('ops.messHall.monthGridTitle', { area: area.key })}</p>
      <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-psu-bg border-b border-r border-psu-gray/10 px-2 py-2 text-left align-middle text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-56 min-w-[14rem]">
                  {t('ops.messHall.areaLabel')}
                </th>
                {days.map(day => (
                  <th key={day} className={cn("sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-1 py-2 text-center text-[9px] font-black uppercase w-8", `${monthPrefix}-${String(day).padStart(2, '0')}` === today ? "text-psu-blue" : "text-psu-gray/50")}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {area.items.map(item => (
                <tr key={item.id} className="hover:bg-psu-bg/40 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-b border-r border-psu-gray/10 px-2 py-1.5 align-middle text-[11px] font-bold text-psu-gray truncate">
                    {language === 'id' ? item.labelId : item.labelEn}
                  </td>
                  {days.map(day => {
                    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
                    const sub = byDate.get(date);
                    const mark = sub?.items.find(i => i.id === item.id)?.answer;
                    return (
                      <td key={day} className={cn("border-b border-psu-gray/5 text-center align-middle font-black", date === today && "bg-psu-blue/5")}>
                        {mark === 'R' ? <span className="text-psu-rejected">R</span> : mark === 'B' ? <span className="text-psu-green">B</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
