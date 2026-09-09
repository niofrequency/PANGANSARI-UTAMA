import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OutOfRangeFlag } from './opsHelpers';
import { dishwashLocationsForSite, currentDishwashShift, DISHWASH_SHIFTS, DishwashShift, DISHWASH_MIN_BILAS_C, DISHWASH_MIN_CUCI_C } from '../../data/dishwashForm';
import { Thermometer, Clock } from 'lucide-react';

// UN.00.51 Monitoring Suhu Dishwashing Mesin — one submit = one machine +
// one shift + both temperatures (Bilas/rinse, Cuci/wash).
export function DishwashForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';
  const locations = dishwashLocationsForSite(currentUser?.site);

  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const [shift, setShift] = useState<DishwashShift>(currentDishwashShift());
  const [cuciC, setCuciC] = useState('');
  const [bilasC, setBilasC] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const location = locations.find(l => l.id === locationId);
  const cuciNum = Number(cuciC);
  const bilasNum = Number(bilasC);
  const hasCuci = cuciC.trim() !== '' && Number.isFinite(cuciNum);
  const hasBilas = bilasC.trim() !== '' && Number.isFinite(bilasNum);
  const cuciLow = hasCuci && cuciNum < DISHWASH_MIN_CUCI_C;
  const bilasLow = hasBilas && bilasNum < DISHWASH_MIN_BILAS_C;
  const canSubmit = Boolean(location && hasCuci && hasBilas);

  const handleSubmit = async () => {
    if (!canSubmit || !location || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId: currentUser.site,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'DISHWASH_TEMP',
      status: 'PENDING',
      items: [
        { id: 'cuci', question: `${t('ops.dishwash.cuci')} — ${location.name}, ${shift}:00`, answer: `${cuciC}°C` },
        { id: 'bilas', question: `${t('ops.dishwash.bilas')} — ${location.name}, ${shift}:00`, answer: `${bilasC}°C` },
      ],
      meta: {
        formId: 'UN.00.51',
        assetId: location.id,
        assetName: location.name,
        slot: shift,
        outOfRange: cuciLow || bilasLow,
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
        formId="UN.00.51"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')}
      />

      <div className="card space-y-6">
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.dishwash.locationLabel')}</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold"
          >
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clock size={12} /> {t('ops.slotLabel')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DISHWASH_SHIFTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={cn(
                  "py-3 rounded-xl text-xs font-black transition-all",
                  shift === s ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/50"
                )}
              >
                {s}:00
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Thermometer size={12} /> {t('ops.dishwash.cuci')} (min {DISHWASH_MIN_CUCI_C}°C)
            </label>
            <input
              type="number" step="0.1" value={cuciC} onChange={(e) => setCuciC(e.target.value)}
              className={cn("w-full bg-psu-bg border-2 rounded-xl p-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-psu-blue/20", cuciLow ? "border-psu-rejected" : "border-psu-gray/10")}
            />
            {cuciLow && <div className="mt-2"><OutOfRangeFlag label={t('ops.outOfRange')} /></div>}
          </div>
          <div>
            <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Thermometer size={12} /> {t('ops.dishwash.bilas')} (min {DISHWASH_MIN_BILAS_C}°C)
            </label>
            <input
              type="number" step="0.1" value={bilasC} onChange={(e) => setBilasC(e.target.value)}
              className={cn("w-full bg-psu-bg border-2 rounded-xl p-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-psu-blue/20", bilasLow ? "border-psu-rejected" : "border-psu-gray/10")}
            />
            {bilasLow && <div className="mt-2"><OutOfRangeFlag label={t('ops.outOfRange')} /></div>}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-[2] py-4 bg-psu-blue text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-blue/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('common.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
