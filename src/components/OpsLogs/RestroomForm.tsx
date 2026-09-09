import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip } from './opsHelpers';
import { RESTROOM_GROUPS, RESTROOM_SLOTS, RestroomSlot, RESTROOM_EXAMPLE_SECTION } from '../../data/restroomData';
import { Clock } from 'lucide-react';

// UN.00.45 Pembersihan Toilet — one submit = one restroom/section + one
// slot (08/11/16). Two groups of points, each with its own mark set.
export function RestroomForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  // Optional: omitted on the dedicated Bathroom Janitor portal, where
  // this is the only screen there is — nothing to cancel back to.
  onCancel?: () => void;
  onSubmitted: () => void;
}) {
  const { t, language } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';

  const [section, setSection] = useState('');
  const [slot, setSlot] = useState<RestroomSlot>('08');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const allItems = RESTROOM_GROUPS.flatMap(g => g.items);
  const allMarked = allItems.every(i => marks[i.id]);
  const canSubmit = section.trim().length > 0 && allMarked;

  const setMark = (id: string, mark: string) => setMarks(p => ({ ...p, [id]: mark }));

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) {
      setShowValidation(true);
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId: currentUser.site,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'RESTROOM',
      status: 'PENDING',
      items: allItems.map(i => ({
        id: i.id,
        question: `${i.labelId} (${i.labelEn})`,
        answer: marks[i.id],
      })),
      meta: {
        formId: 'UN.00.45',
        section: section.trim(),
        slot,
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
        formId="UN.00.45"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.HOUSEKEEPER')}
      />

      <div className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.restroom.sectionLabel')}</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder={RESTROOM_EXAMPLE_SECTION}
              className={cn("w-full text-center text-xl font-black py-3 bg-psu-bg border-2 rounded-2xl", showValidation && !section.trim() ? "border-psu-rejected" : "border-psu-gray/10")}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Clock size={12} /> {t('ops.slotLabel')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RESTROOM_SLOTS.map(s => (
                <button key={s} type="button" onClick={() => setSlot(s)}
                  className={cn("py-3 rounded-xl text-xs font-black transition-all", slot === s ? "bg-psu-green text-white shadow-md shadow-psu-green/20" : "bg-psu-bg text-psu-gray/50")}
                >{s}:00</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {RESTROOM_GROUPS.map(group => (
        <div key={group.key} className="card space-y-3">
          <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">
            {language === 'id' ? group.titleId : group.titleEn}
          </h4>
          {group.items.map(item => {
            const missing = showValidation && !marks[item.id];
            return (
              <div key={item.id} className={cn("flex items-center justify-between gap-3 py-1", missing && "bg-psu-rejected/5 rounded-xl px-2 -mx-2")}>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-psu-gray">{item.labelId}</p>
                  <p className="text-[10px] text-psu-gray/40 italic">{item.labelEn}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {group.marks.map(mark => (
                    <button
                      key={mark}
                      type="button"
                      onClick={() => setMark(item.id, mark)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        marks[item.id] === mark
                          ? (mark === 'rusak' || mark === 'tidak' ? "bg-psu-rejected text-white" : "bg-psu-green text-white")
                          : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10"
                      )}
                    >
                      {t(`ops.restroom.mark.${mark}`)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="flex gap-3">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
            {t('common.cancel')}
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-green text-white shadow-psu-green/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >
          {isSubmitting ? t('common.loading') : t('common.submit')}
        </button>
      </div>
    </div>
  );
}
