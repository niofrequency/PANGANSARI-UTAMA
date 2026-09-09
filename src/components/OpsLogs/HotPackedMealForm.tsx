import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OutOfRangeFlag } from './opsHelpers';
import { HOT_PACK_TYPES, HotPackTypeId, HOT_PACK_MEAL_PERIODS, HotPackMealPeriodId, HOT_PACK_ROWS } from '../../data/hotPackedMealData';
import { COOK_MIN_TEMP_C } from '../../data/cookingServiceData';
import { useWorkingSite } from '../../hooks/useWorkingSite';

interface RowEntry {
  cookTime: string; cookTemp: string;
  holdTime: string; holdTemp: string;
  packStart: string; packFinish: string; packOk: boolean | null;
}
const emptyRow: RowEntry = { cookTime: '', cookTemp: '', holdTime: '', holdTemp: '', packStart: '', packFinish: '', packOk: null };

// UF.09000 Hot Packed Meal Checklist — same kitchen family as Cooking &
// Service, different pack workflow: cooking -> holding -> packing.
export function HotPackedMealForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [packType, setPackType] = useState<HotPackTypeId>('1');
  const [selectedMeals, setSelectedMeals] = useState<HotPackMealPeriodId[]>([]);
  const [activeMeal, setActiveMeal] = useState<HotPackMealPeriodId | null>(null);
  const [rowsByMeal, setRowsByMeal] = useState<Record<HotPackMealPeriodId, Record<string, RowEntry>>>({} as any);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMeal = (id: HotPackMealPeriodId) => {
    setSelectedMeals(prev => {
      const next = prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id];
      if (!prev.includes(id)) setActiveMeal(id);
      return next;
    });
  };

  const setField = (meal: HotPackMealPeriodId, rowId: string, field: keyof RowEntry, value: any) => {
    setRowsByMeal(prev => ({ ...prev, [meal]: { ...prev[meal], [rowId]: { ...(prev[meal]?.[rowId] || emptyRow), [field]: value } } }));
  };

  const canSubmit = selectedMeals.length > 0 && selectedMeals.every(meal =>
    (Object.values(rowsByMeal[meal] || {}) as RowEntry[]).some(r => r.cookTemp.trim() !== '')
  );

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const items = selectedMeals.flatMap(meal => {
      const mealLabel = HOT_PACK_MEAL_PERIODS.find(m => m.id === meal)!;
      const rows = rowsByMeal[meal] || {};
      return HOT_PACK_ROWS
        .filter(row => rows[row.id]?.cookTemp)
        .map(row => {
          const r = rows[row.id];
          const cookTemp = Number(r.cookTemp);
          const belowMin = Number.isFinite(cookTemp) && cookTemp < COOK_MIN_TEMP_C;
          return {
            id: `${meal}.${row.id}`,
            question: `${mealLabel.labelId} — ${row.labelId}`,
            answer: `${r.cookTemp}°C @ ${r.cookTime || '--:--'}`,
            remarks: [
              r.holdTemp ? `${t('ops.hotPacked.holdLabel')}: ${r.holdTemp}°C @ ${r.holdTime || '--:--'}` : '',
              (r.packStart || r.packFinish) ? `${t('ops.hotPacked.packLabel')}: ${r.packStart || '--:--'}–${r.packFinish || '--:--'}` : '',
              r.packOk === false ? t('ops.hotPacked.packFail') : r.packOk === true ? t('ops.hotPacked.packPass') : '',
              belowMin ? t('ops.outOfRange') : '',
            ].filter(Boolean).join(' · ') || undefined,
          };
        });
    });

    const anyBelowMin = selectedMeals.some(meal =>
      (Object.values(rowsByMeal[meal] || {}) as RowEntry[]).some(r => { const n = Number(r.cookTemp); return r.cookTemp.trim() !== '' && Number.isFinite(n) && n < COOK_MIN_TEMP_C; })
    );

    addSubmission({
      userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
      siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
      type: 'HOT_PACKED_MEAL', status: 'PENDING', items,
      meta: {
        formId: 'UF.09000', mealPeriods: selectedMeals, packType,
        outOfRange: anyBelowMin,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UF.09000" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.hotPacked.packTypeLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {HOT_PACK_TYPES.map(pt => (
            <button key={pt.id} type="button" onClick={() => setPackType(pt.id)}
              className={cn("py-3 rounded-xl text-xs font-black transition-all", packType === pt.id ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/50")}
            >{pt.id}. {pt.labelId}</button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.mealPeriodsLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {HOT_PACK_MEAL_PERIODS.map(m => (
            <button key={m.id} type="button" onClick={() => toggleMeal(m.id)}
              className={cn("py-3 rounded-xl text-xs font-black transition-all", selectedMeals.includes(m.id) ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/50")}
            >{m.labelId}</button>
          ))}
        </div>
      </div>

      {selectedMeals.length > 0 && (
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
          {selectedMeals.map(m => (
            <button key={m} onClick={() => setActiveMeal(m)}
              className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeMeal === m ? "bg-psu-blue text-white" : "text-psu-gray/40")}
            >{HOT_PACK_MEAL_PERIODS.find(mm => mm.id === m)?.labelId}</button>
          ))}
        </div>
      )}

      {activeMeal && (
        <div className="card space-y-4">
          {HOT_PACK_ROWS.map(row => {
            const r = rowsByMeal[activeMeal]?.[row.id] || emptyRow;
            const n = Number(r.cookTemp);
            const belowMin = r.cookTemp.trim() !== '' && Number.isFinite(n) && n < COOK_MIN_TEMP_C;
            return (
              <div key={row.id} className="p-3 -mx-1 rounded-2xl border border-psu-gray/5">
                <p className="text-xs font-bold text-psu-gray mb-2">{row.labelId} <span className="text-psu-gray/40 italic font-normal">({row.labelEn})</span></p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="time" value={r.cookTime} onChange={(e) => setField(activeMeal, row.id, 'cookTime', e.target.value)} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" placeholder={t('ops.cookingService.cookTimeLabel')} />
                  <input type="number" step="0.1" value={r.cookTemp} onChange={(e) => setField(activeMeal, row.id, 'cookTemp', e.target.value)}
                    className={cn("bg-psu-bg border-2 rounded-xl p-2.5 text-xs font-bold", belowMin ? "border-psu-rejected" : "border-psu-gray/10")} placeholder={`${t('ops.cookingService.cookTempLabel')} (>=${COOK_MIN_TEMP_C}°C)`} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="time" value={r.holdTime} onChange={(e) => setField(activeMeal, row.id, 'holdTime', e.target.value)} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" placeholder={t('ops.hotPacked.holdTimeLabel')} />
                  <input type="number" step="0.1" value={r.holdTemp} onChange={(e) => setField(activeMeal, row.id, 'holdTemp', e.target.value)} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" placeholder={t('ops.hotPacked.holdTempLabel')} />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="time" value={r.packStart} onChange={(e) => setField(activeMeal, row.id, 'packStart', e.target.value)} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" placeholder={t('ops.hotPacked.packStartLabel')} />
                  <input type="time" value={r.packFinish} onChange={(e) => setField(activeMeal, row.id, 'packFinish', e.target.value)} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" placeholder={t('ops.hotPacked.packFinishLabel')} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setField(activeMeal, row.id, 'packOk', true)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black", r.packOk === true ? "bg-psu-green text-white" : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10")}>✓ {t('ops.hotPacked.packPass')}</button>
                  <button type="button" onClick={() => setField(activeMeal, row.id, 'packOk', false)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black", r.packOk === false ? "bg-psu-rejected text-white" : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10")}>✗ {t('ops.hotPacked.packFail')}</button>
                  {belowMin && <OutOfRangeFlag label={t('ops.outOfRange')} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.submit')}</button>
      </div>
    </div>
  );
}
