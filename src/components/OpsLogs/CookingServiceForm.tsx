import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OutOfRangeFlag } from './opsHelpers';
import { MEAL_PERIODS, MealPeriodId, COOKING_SERVICE_ROWS, INSTALLATION_CODES, COOK_MIN_TEMP_C } from '../../data/cookingServiceData';
import { useWorkingSite } from '../../hooks/useWorkingSite';

interface RowEntry {
  cookTime: string;
  cookTemp: string;
  installTime: string;
  installTemp: string;
  installCode: string;
  recipe: string;
}
type MealRows = Record<string, RowEntry>;

const emptyRow: RowEntry = { cookTime: '', cookTemp: '', installTime: '', installTemp: '', installCode: '', recipe: '' };

// UF.09001 Cooking & Service Checklist — one submit = one date + location
// + the meal periods actually cooked that day. Phone picks a service
// period FIRST (a single row of period chips doubles as both "add this
// period" and "switch to it" — see selectPeriod below): only that
// period's lines show, matching the paper's "fill Lunch's column" flow
// instead of every period competing for attention at once. Desktop shows
// every added period side by side, like the paper's own columns.
export function CookingServiceForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [selectedMeals, setSelectedMeals] = useState<MealPeriodId[]>([]);
  const [activeMeal, setActiveMeal] = useState<MealPeriodId | null>(null);
  const [rowsByMeal, setRowsByMeal] = useState<Record<MealPeriodId, MealRows>>({} as Record<MealPeriodId, MealRows>);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // One row of period chips does triple duty: tapping an unselected
  // period adds and activates it (this is the "pick a period first"
  // step); tapping the one already active removes it again (the undo for
  // an accidental tap); tapping a different, already-added period just
  // switches which one is showing. Never a bare multi-select grid sitting
  // next to a second tab bar for the same thing.
  const selectPeriod = (id: MealPeriodId) => {
    if (!selectedMeals.includes(id)) {
      setSelectedMeals(prev => [...prev, id]);
      setActiveMeal(id);
    } else if (activeMeal === id) {
      const remaining = selectedMeals.filter(m => m !== id);
      setSelectedMeals(remaining);
      setActiveMeal(remaining[0] ?? null);
    } else {
      setActiveMeal(id);
    }
  };

  const setField = (meal: MealPeriodId, rowId: string, field: keyof RowEntry, value: string) => {
    setRowsByMeal(prev => ({
      ...prev,
      [meal]: { ...prev[meal], [rowId]: { ...(prev[meal]?.[rowId] || emptyRow), [field]: value } },
    }));
  };

  // At least one row with a cook temp filled in, for each selected meal.
  const canSubmit = selectedMeals.length > 0 && selectedMeals.every(meal =>
    (Object.values(rowsByMeal[meal] || {}) as RowEntry[]).some(r => r.cookTemp.trim() !== '')
  );

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const items = selectedMeals.flatMap(meal => {
      const mealLabel = MEAL_PERIODS.find(m => m.id === meal)!;
      const rows = rowsByMeal[meal] || {};
      return COOKING_SERVICE_ROWS
        .filter(row => rows[row.id] && (rows[row.id].cookTemp || rows[row.id].recipe))
        .map(row => {
          const r = rows[row.id];
          const cookTemp = Number(r.cookTemp);
          const belowMin = r.cookTemp.trim() !== '' && Number.isFinite(cookTemp) && cookTemp < COOK_MIN_TEMP_C;
          return {
            id: `${meal}.${row.id}`,
            question: `${mealLabel.labelId} — ${row.labelId}`,
            answer: r.cookTemp ? `${r.cookTemp}°C @ ${r.cookTime || '--:--'}` : (r.recipe || ''),
            remarks: [
              r.installTemp ? `${t('ops.cookingService.installLabel')}: ${r.installTemp}°C @ ${r.installTime || '--:--'}` : '',
              r.installCode ? INSTALLATION_CODES.find(c => c.id === r.installCode)?.labelId : '',
              belowMin ? t('ops.outOfRange') : '',
            ].filter(Boolean).join(' · ') || undefined,
          };
        });
    });

    const anyBelowMin = selectedMeals.some(meal =>
      (Object.values(rowsByMeal[meal] || {}) as RowEntry[]).some(r => {
        const n = Number(r.cookTemp);
        return r.cookTemp.trim() !== '' && Number.isFinite(n) && n < COOK_MIN_TEMP_C;
      })
    );

    addSubmission({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId: workingSiteId,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'COOKING_SERVICE',
      status: 'PENDING',
      items,
      meta: {
        formId: 'UF.09001',
        mealPeriods: selectedMeals,
        outOfRange: anyBelowMin,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

  const renderMealBlock = (meal: MealPeriodId) => (
    <div className="card space-y-4">
      <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2">
        {MEAL_PERIODS.find(m => m.id === meal)?.labelId}
      </h4>
      {COOKING_SERVICE_ROWS.map(row => {
        const r = rowsByMeal[meal]?.[row.id] || emptyRow;
        const n = Number(r.cookTemp);
        const belowMin = r.cookTemp.trim() !== '' && Number.isFinite(n) && n < COOK_MIN_TEMP_C;
        return (
          <div key={row.id} className="p-3 -mx-1 rounded-2xl border border-psu-gray/5">
            <p className="text-xs font-bold text-psu-gray mb-2">{row.labelId} <span className="text-psu-gray/40 italic font-normal">({row.labelEn})</span></p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="time" value={r.cookTime} onChange={(e) => setField(meal, row.id, 'cookTime', e.target.value)}
                className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-base" placeholder={t('ops.cookingService.cookTimeLabel')} />
              <input type="text" inputMode="decimal" value={r.cookTemp} onChange={(e) => setField(meal, row.id, 'cookTemp', e.target.value.replace(/[^0-9.]/g, ''))}
                className={cn("bg-psu-bg border-2 rounded-xl p-2.5 text-base font-bold", belowMin ? "border-psu-rejected" : "border-psu-gray/10")}
                placeholder={`${t('ops.cookingService.cookTempLabel')} (>=${COOK_MIN_TEMP_C}°C)`} />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="time" value={r.installTime} onChange={(e) => setField(meal, row.id, 'installTime', e.target.value)}
                className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-base" placeholder={t('ops.cookingService.installTimeLabel')} />
              <input type="text" inputMode="decimal" value={r.installTemp} onChange={(e) => setField(meal, row.id, 'installTemp', e.target.value.replace(/[^0-9.]/g, ''))}
                className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-base" placeholder={t('ops.cookingService.installTempLabel')} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {INSTALLATION_CODES.map(c => (
                <button key={c.id} type="button" onClick={() => setField(meal, row.id, 'installCode', c.id)}
                  className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase", r.installCode === c.id ? "bg-psu-gray text-white" : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10")}
                >{c.id} {c.labelId}</button>
              ))}
              {belowMin && <OutOfRangeFlag label={t('ops.outOfRange')} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UF.09001" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.mealPeriodsLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_PERIODS.map(m => (
            <button key={m.id} type="button" onClick={() => selectPeriod(m.id)}
              className={cn(
                "py-3 rounded-xl text-xs font-black transition-all",
                activeMeal === m.id ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20"
                  : selectedMeals.includes(m.id) ? "bg-psu-blue/10 text-psu-blue"
                  : "bg-psu-bg text-psu-gray/50"
              )}
            >{m.labelId}</button>
          ))}
        </div>
      </div>

      {/* Phone: only the active period's lines — this is the whole
          point, never every period competing for space at once. */}
      <div className="md:hidden">
        {activeMeal ? renderMealBlock(activeMeal) : (
          <div className="card text-center py-8 text-xs text-psu-gray/40 font-medium">{t('ops.cookingService.pickPeriodHint')}</div>
        )}
      </div>

      {/* Desktop: every added period side by side, like the paper's own
          columns — horizontal scroll once more than fits. */}
      <div className="hidden md:flex md:gap-4 md:overflow-x-auto md:pb-2">
        {selectedMeals.length === 0 ? (
          <div className="card text-center py-8 text-xs text-psu-gray/40 font-medium w-full">{t('ops.cookingService.pickPeriodHint')}</div>
        ) : selectedMeals.map(m => (
          <div key={m} className="md:min-w-[340px] md:flex-1">
            {renderMealBlock(m)}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.submit')}</button>
      </div>
    </div>
  );
}
