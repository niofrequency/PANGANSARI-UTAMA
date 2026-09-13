import { Fragment, Key, useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, OutOfRangeFlag } from './opsHelpers';
import { dishwashLocationsForSite, currentDishwashRound, DISHWASH_ROUNDS, DishwashLocation, DISHWASH_MIN_BILAS_C, DISHWASH_MIN_CUCI_C } from '../../data/dishwashData';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { Submission } from '../../types';

// UN.00.51 Monitoring Suhu Dishwashing Mesin. The paper is one sheet per
// month x 3 daily rounds (Pagi/Siang/Malam), each round recording Cuci
// (wash) and Bilas (rinse) temperatures. Same "one submission per
// location per DAY" shape as TempControlForm.tsx — see that file's
// header comment for why.
export function DishwashForm({ store, onCancel, onSubmitted }: OpsFormProps) {
  const { t } = useTranslation();
  const { currentUser, sites, submissions, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);
  const today = new Date().toISOString().slice(0, 10);
  const locations = dishwashLocationsForSite(workingSiteId);

  const [locationId, setLocationId] = useState(locations[0]?.id || '');
  const location = locations.find(l => l.id === locationId);

  if (!location) {
    return (
      <div className="space-y-6">
        <OpsHeaderChip siteName={currentSiteName} formId="UN.00.51" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_TECHNICIAN')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />
        <div className="card text-center py-8 text-xs text-psu-gray/40 font-medium">{t('ops.dishwash.noLocations')}</div>
        {onCancel && <button onClick={onCancel} className="w-full py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>}
      </div>
    );
  }

  const todaysSubmission = submissions.find(s =>
    s.type === 'DISHWASH_TEMP' && s.meta?.assetId === location.id && s.siteId === workingSiteId && s.meta?.date === today
  );

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UN.00.51" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_TECHNICIAN')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

      {locations.length > 1 && (
        <div className="card space-y-2">
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.dishwash.locationLabel')}</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-bold">
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      <DishwashDayEditor
        key={location.id}
        location={location}
        date={today}
        existing={todaysSubmission}
        currentUserName={currentUser?.name || ''}
        onSave={(readings, remarks) => {
          if (!currentUser) return;
          const stamp = { userId: currentUser.id, name: currentUser.name, at: new Date().toISOString() };
          const items = DISHWASH_ROUNDS.filter(r => readings[r]?.cuci || readings[r]?.bilas).flatMap(r => ([
            { id: `${r}.cuci`, question: `${t('ops.dishwash.cuci')} — ${location.name}, ${r}:00`, answer: readings[r].cuci ? `${readings[r].cuci}°C` : '' },
            { id: `${r}.bilas`, question: `${t('ops.dishwash.bilas')} — ${location.name}, ${r}:00`, answer: readings[r].bilas ? `${readings[r].bilas}°C` : '' },
          ]));
          if (todaysSubmission) {
            resubmitAfterRejection(todaysSubmission.id, {
              items,
              meta: { ...todaysSubmission.meta, dishwashReadings: readings, dayRemarks: remarks },
            });
          } else {
            addSubmission({
              userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
              siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
              type: 'DISHWASH_TEMP', status: 'PENDING',
              items,
              meta: {
                formId: 'UN.00.51', assetId: location.id, assetName: location.name,
                date: today, dishwashReadings: readings, dayRemarks: remarks,
                signoff: { draftedBy: stamp },
              },
            });
          }
          onSubmitted();
        }}
        onCancel={onCancel}
      />

      <DishwashMonthGrid location={location} submissions={submissions} today={today} />
    </div>
  );
}

function DishwashDayEditor({
  location, date, existing, currentUserName, onSave, onCancel,
}: {
  // Declared (never read) purely so key={...} type-checks — see
  // GarmentCounter's identical comment in LaundryShopForm.tsx.
  key?: Key;
  location: DishwashLocation;
  date: string;
  existing?: Submission;
  currentUserName: string;
  onSave: (readings: Record<string, { cuci: string; bilas: string; at: string; by: string }>, remarks: string) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [readings, setReadings] = useState<Record<string, { cuci: string; bilas: string; at: string; by: string }>>(() => existing?.meta?.dishwashReadings || {});
  const [remarks, setRemarks] = useState(existing?.meta?.dayRemarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeRound = currentDishwashRound();

  const setField = (round: string, field: 'cuci' | 'bilas', value: string) =>
    setReadings(prev => ({ ...prev, [round]: { ...prev[round], [field]: value } }));
  const canSubmit = DISHWASH_ROUNDS.some(r => readings[r]?.cuci?.trim() || readings[r]?.bilas?.trim());

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    const stamped = { ...readings };
    DISHWASH_ROUNDS.forEach(r => {
      if (stamped[r]?.cuci?.trim() || stamped[r]?.bilas?.trim()) {
        stamped[r] = { ...stamped[r], at: new Date().toISOString(), by: currentUserName };
      }
    });
    onSave(stamped, remarks);
    setIsSubmitting(false);
  };

  return (
    <div className="card space-y-4">
      <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{date === new Date().toISOString().slice(0, 10) ? t('ops.dishwash.todayFor', { location: location.name }) : date}</h4>
      <div className="space-y-3">
        {DISHWASH_ROUNDS.map(r => {
          const cuci = readings[r]?.cuci || '';
          const bilas = readings[r]?.bilas || '';
          const cuciLow = cuci.trim() !== '' && Number.isFinite(Number(cuci)) && Number(cuci) < DISHWASH_MIN_CUCI_C;
          const bilasLow = bilas.trim() !== '' && Number.isFinite(Number(bilas)) && Number(bilas) < DISHWASH_MIN_BILAS_C;
          return (
            <div key={r} className="p-3 rounded-2xl border border-psu-gray/5">
              <p className={cn("text-xs font-black uppercase mb-2", r === activeRound ? "text-psu-blue" : "text-psu-gray/50")}>{r}:00</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-psu-gray/30 uppercase mb-1">{t('ops.dishwash.cuci')} (≥{DISHWASH_MIN_CUCI_C}°C)</label>
                  <input
                    type="text" inputMode="decimal" value={cuci}
                    onChange={(e) => setField(r, 'cuci', e.target.value.replace(/[^0-9.]/g, ''))}
                    className={cn("w-full bg-psu-bg border-2 rounded-xl p-3 text-base font-black text-center focus:outline-none focus:ring-2 focus:ring-psu-blue/20", cuciLow ? "border-psu-rejected text-psu-rejected" : "border-psu-gray/10")}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-psu-gray/30 uppercase mb-1">{t('ops.dishwash.bilas')} (≥{DISHWASH_MIN_BILAS_C}°C)</label>
                  <input
                    type="text" inputMode="decimal" value={bilas}
                    onChange={(e) => setField(r, 'bilas', e.target.value.replace(/[^0-9.]/g, ''))}
                    className={cn("w-full bg-psu-bg border-2 rounded-xl p-3 text-base font-black text-center focus:outline-none focus:ring-2 focus:ring-psu-blue/20", bilasLow ? "border-psu-rejected text-psu-rejected" : "border-psu-gray/10")}
                  />
                </div>
              </div>
              {(cuciLow || bilasLow) && <div className="mt-2"><OutOfRangeFlag label={t('ops.outOfRange')} /></div>}
            </div>
          );
        })}
      </div>

      <textarea
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder={t('ops.remarkPlaceholder')}
        className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-base h-16"
      />

      <div className="flex gap-3">
        {onCancel && <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>}
        <button onClick={handleSave} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.save')}</button>
      </div>
    </div>
  );
}

// Desktop-only (md+) read-only month grid — see TempControlForm.tsx's
// identical-purpose component for the "why one submission per day" note.
function DishwashMonthGrid({ location, submissions, today }: { location: DishwashLocation; submissions: Submission[]; today: string }) {
  const { t } = useTranslation();
  const monthPrefix = today.slice(0, 7);
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const byDate = new Map<string, Submission>();
  submissions.forEach(s => {
    if (s.type === 'DISHWASH_TEMP' && s.meta?.assetId === location.id && s.meta?.date?.startsWith(monthPrefix)) {
      byDate.set(s.meta.date!, s);
    }
  });

  return (
    <div className="hidden md:block space-y-2">
      <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('ops.dishwash.monthGridTitle', { location: location.name })}</p>
      <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-psu-bg border-b border-r border-psu-gray/10 px-2 py-2 text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-16">{t('common.day')}</th>
                {DISHWASH_ROUNDS.map(r => (
                  <th key={r} colSpan={2} className="bg-psu-bg border-b border-l border-psu-gray/10 px-1 py-2 text-center text-[9px] font-black text-psu-gray/50 uppercase">{r}:00</th>
                ))}
                <th className="bg-psu-bg border-b border-psu-gray/10 px-2 py-2 text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest min-w-[140px]">{t('ops.remarkLabel')}</th>
              </tr>
              <tr>
                <th className="sticky left-0 z-10 bg-psu-bg border-b border-r border-psu-gray/10" />
                {DISHWASH_ROUNDS.map(r => (
                  <Fragment key={r}>
                    <th className="bg-psu-bg border-b border-l border-psu-gray/10 px-1 py-1 text-center text-[8px] font-bold text-psu-gray/30 uppercase">{t('ops.dishwash.cuci')}</th>
                    <th className="bg-psu-bg border-b border-psu-gray/10 px-1 py-1 text-center text-[8px] font-bold text-psu-gray/30 uppercase">{t('ops.dishwash.bilas')}</th>
                  </Fragment>
                ))}
                <th className="bg-psu-bg border-b border-psu-gray/10" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
                const sub = byDate.get(date);
                const isToday = date === today;
                return (
                  <tr key={date} className={cn(isToday && "bg-psu-blue/5")}>
                    <td className={cn("sticky left-0 z-10 border-b border-r border-psu-gray/10 px-2 py-1.5 font-black", isToday ? "bg-psu-blue/10 text-psu-blue" : "bg-white text-psu-gray/50")}>{day}</td>
                    {DISHWASH_ROUNDS.map(r => {
                      const reading = sub?.meta?.dishwashReadings?.[r];
                      const cuciLow = reading?.cuci && Number(reading.cuci) < DISHWASH_MIN_CUCI_C;
                      const bilasLow = reading?.bilas && Number(reading.bilas) < DISHWASH_MIN_BILAS_C;
                      return (
                        <Fragment key={r}>
                          <td className={cn("border-b border-l border-psu-gray/5 px-1 py-1.5 text-center font-bold", cuciLow ? "text-psu-rejected" : "text-psu-gray")}>{reading?.cuci || ''}</td>
                          <td className={cn("border-b border-psu-gray/5 px-1 py-1.5 text-center font-bold", bilasLow ? "text-psu-rejected" : "text-psu-gray")}>{reading?.bilas || ''}</td>
                        </Fragment>
                      );
                    })}
                    <td className="border-b border-psu-gray/5 px-2 py-1.5 text-[11px] text-psu-gray/60">{sub?.meta?.dayRemarks || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
