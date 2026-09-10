import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PhotoCapture } from '../PhotoCapture';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, ChecklistRow } from './opsHelpers';
import { MESS_HALL_AREAS, MessHallMark } from '../../data/messHallHygieneData';
import { useWorkingSite } from '../../hooks/useWorkingSite';

// UWL10001 Checklist Kebersihan dan Perawatan Area Mess Hall — one submit
// = one area (only "D — Area Gudang" is catalogued yet, see
// messHallHygieneData.ts) + today. Each item marked B (Bersih/Baik) or R
// (Rusak); photo optional on any R.
export function MessHallHygieneForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t, language } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [areaKey, setAreaKey] = useState(MESS_HALL_AREAS[0]?.key || 'D');
  const area = MESS_HALL_AREAS.find(a => a.key === areaKey)!;
  const [marks, setMarks] = useState<Record<string, MessHallMark>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const allMarked = area.items.every(i => marks[i.id]);
  const canSubmit = allMarked;

  const setMark = (id: string, mark: MessHallMark) => setMarks(p => ({ ...p, [id]: mark }));

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    const rCount = area.items.filter(i => marks[i.id] === 'R').length;
    addSubmission({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId: workingSiteId,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'MESS_HALL_HYGIENE',
      status: 'PENDING',
      items: area.items.map(i => ({
        id: i.id,
        question: `${i.labelId} (${i.labelEn})`,
        answer: marks[i.id],
        photoUrl: photos[i.id],
      })),
      score: Math.round(((area.items.length - rCount) / area.items.length) * 100),
      meta: {
        formId: 'UWL10001',
        areaKey: area.key,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

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
                  <PhotoCapture uid={currentUser?.id} onCapture={(url) => setPhotos(p => ({ ...p, [item.id]: url }))} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >
          {isSubmitting ? t('common.loading') : t('common.submit')}
        </button>
      </div>
    </div>
  );
}
