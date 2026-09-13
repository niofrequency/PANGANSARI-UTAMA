import { Key, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, OutOfRangeFlag } from './opsHelpers';
import { assetsForSite, currentTempSlot, TEMP_CONTROL_SLOTS, TEMP_LIMITS, TempControlAsset, TempControlSlot } from '../../data/tempControlAssets';
import { tempControlReadingsSchema } from '../../lib/validators/tempControl';
import { Thermometer } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { Submission } from '../../types';

// UF.10000 Temperature Control Checklist. The paper is one sheet per
// cabinet for the whole month, 5 daily slots each with a temp + paraf.
// The app keeps ONE SUBMISSION PER ASSET PER DAY (not per reading, and
// not one giant submission for the whole month) — that's what lets this
// reuse addSubmission/resubmitAfterRejection/the sign-off chain exactly
// like every other Ops Log type; the desktop month grid below just
// queries a month of those per-day submissions instead of reading one
// big one apart. See types.ts's Submission.meta comment on `date`/
// `tempReadings` for the exact shape.
export function TempControlForm({ store, onCancel, onSubmitted }: OpsFormProps) {
  const { t } = useTranslation();
  const { currentUser, sites, submissions, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);
  const today = new Date().toISOString().slice(0, 10);
  const assets = assetsForSite(workingSiteId);

  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const asset = assets.find(a => a.id === assetId);

  if (!asset) {
    return (
      <div className="space-y-6">
        <OpsHeaderChip siteName={currentSiteName} formId="UF.10000" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_TECHNICIAN')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />
        <div className="card text-center py-8 text-xs text-psu-gray/40 font-medium">{t('ops.tempControl.noAssets')}</div>
        {onCancel && <button onClick={onCancel} className="w-full py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>}
      </div>
    );
  }

  const todaysSubmission = submissions.find(s =>
    s.type === 'TEMP_CONTROL' && s.meta?.assetId === asset.id && s.siteId === workingSiteId && s.meta?.date === today
  );

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UF.10000" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_TECHNICIAN')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.tempControl.assetLabel')}</label>
        <div className="grid grid-cols-2 gap-3">
          {assets.map(a => (
            <button
              key={a.id} type="button" onClick={() => setAssetId(a.id)}
              className={cn("p-4 rounded-2xl border-2 text-left transition-all", assetId === a.id ? "border-psu-blue bg-psu-blue/5" : "border-psu-gray/10 bg-psu-bg")}
            >
              <p className="text-sm font-bold text-psu-gray">{a.name}</p>
              <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest mt-1">
                {t(`ops.storeKind.${a.kind}`)} · {TEMP_LIMITS[a.kind].label}
              </p>
            </button>
          ))}
        </div>
      </div>

      <TempControlDayEditor
        key={asset.id}
        asset={asset}
        date={today}
        existing={todaysSubmission}
        currentUserName={currentUser?.name || ''}
        onSave={(readings, remarks) => {
          if (!currentUser) return;
          const stamp = { userId: currentUser.id, name: currentUser.name, at: new Date().toISOString() };
          const items = TEMP_CONTROL_SLOTS.filter(s => readings[s]?.temp).map(s => ({
            id: s,
            question: `${asset.name} — ${s}:00`,
            answer: `${readings[s].temp}°C`,
            remarks: TEMP_LIMITS[asset.kind].check(Number(readings[s].temp)) ? undefined : t('ops.outOfRange'),
          }));
          if (todaysSubmission) {
            resubmitAfterRejection(todaysSubmission.id, {
              items,
              meta: { ...todaysSubmission.meta, tempReadings: readings, dayRemarks: remarks },
            });
          } else {
            addSubmission({
              userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
              siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
              type: 'TEMP_CONTROL', status: 'PENDING',
              items,
              meta: {
                formId: 'UF.10000', assetId: asset.id, assetName: asset.name, storeKind: asset.kind,
                date: today, tempReadings: readings, dayRemarks: remarks,
                signoff: { draftedBy: stamp },
              },
            });
          }
          onSubmitted();
        }}
        onCancel={onCancel}
      />

      <TempControlMonthGrid asset={asset} submissions={submissions} today={today} />
    </div>
  );
}

// Today's 5 slots for one asset — same component phone and desktop both
// use for actually entering a reading; the desktop month grid below is
// read-only review, not a second editor.
function TempControlDayEditor({
  asset, date, existing, currentUserName, onSave, onCancel,
}: {
  // Declared (never read) purely so key={...} type-checks — see
  // GarmentCounter's identical comment in LaundryShopForm.tsx.
  key?: Key;
  asset: TempControlAsset;
  date: string;
  existing?: Submission;
  currentUserName: string;
  onSave: (readings: Record<string, { temp: string; at: string; by: string }>, remarks: string) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const [readings, setReadings] = useState<Record<string, { temp: string; at: string; by: string }>>(() => existing?.meta?.tempReadings || {});
  const [remarks, setRemarks] = useState(existing?.meta?.dayRemarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeSlot = currentTempSlot();

  const setTemp = (slot: TempControlSlot, temp: string) => setReadings(prev => ({ ...prev, [slot]: { ...prev[slot], temp } }));
  const canSubmit = TEMP_CONTROL_SLOTS.some(s => readings[s]?.temp?.trim());

  const handleSave = async () => {
    if (!canSubmit) return;
    const stamped = { ...readings };
    TEMP_CONTROL_SLOTS.forEach(s => {
      if (stamped[s]?.temp?.trim()) {
        stamped[s] = { ...stamped[s], at: new Date().toISOString(), by: currentUserName };
      }
    });
    const parsed = tempControlReadingsSchema.safeParse(stamped);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t('ops.tempControl.validationError'));
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    onSave(stamped, remarks);
    setIsSubmitting(false);
    toast.success(t('ops.tempControl.savedToast'));
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{date === new Date().toISOString().slice(0, 10) ? t('ops.tempControl.todayFor', { asset: asset.name }) : date}</h4>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {TEMP_CONTROL_SLOTS.map(s => {
          const val = readings[s]?.temp || '';
          const n = Number(val);
          const outOfRange = val.trim() !== '' && Number.isFinite(n) && !TEMP_LIMITS[asset.kind].check(n);
          return (
            <div key={s}>
              <label className={cn("block text-center text-[9px] font-black uppercase mb-1", s === activeSlot ? "text-psu-blue" : "text-psu-gray/40")}>{s}:00</label>
              <input
                type="text" inputMode="decimal"
                value={val}
                onChange={(e) => setTemp(s, e.target.value.replace(/[^0-9.-]/g, ''))}
                placeholder="—"
                className={cn(
                  "w-full text-base text-center bg-psu-bg border-2 rounded-xl p-3 font-black focus:outline-none focus:ring-2 focus:ring-psu-blue/20",
                  outOfRange ? "border-psu-rejected text-psu-rejected" : s === activeSlot ? "border-psu-blue/30" : "border-psu-gray/10"
                )}
              />
            </div>
          );
        })}
      </div>
      {TEMP_CONTROL_SLOTS.some(s => {
        const n = Number(readings[s]?.temp);
        return readings[s]?.temp?.trim() && Number.isFinite(n) && !TEMP_LIMITS[asset.kind].check(n);
      }) && <OutOfRangeFlag label={t('ops.outOfRange')} />}

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

// Desktop-only (md+) — a read-only month grid built from a month's worth
// of this asset's own per-day submissions (one addSubmission per day,
// see this file's header comment), not one big month-long record. Today
// is highlighted; every other day is display-only in this pass —
// correcting an older day still goes through the normal Ops Log review
// queue's Edit & Resubmit, not inline editing here.
function TempControlMonthGrid({ asset, submissions, today }: { asset: TempControlAsset; submissions: Submission[]; today: string }) {
  const { t } = useTranslation();
  const monthPrefix = today.slice(0, 7);
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const byDate = new Map<string, Submission>();
  submissions.forEach(s => {
    if (s.type === 'TEMP_CONTROL' && s.meta?.assetId === asset.id && s.meta?.date?.startsWith(monthPrefix)) {
      byDate.set(s.meta.date!, s);
    }
  });

  return (
    <div className="hidden md:block space-y-2">
      <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('ops.tempControl.monthGridTitle', { asset: asset.name })}</p>
      <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-psu-bg border-b border-r border-psu-gray/10 px-2 py-2 text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-16">{t('common.day')}</th>
                {TEMP_CONTROL_SLOTS.map(s => (
                  <th key={s} className="bg-psu-bg border-b border-psu-gray/10 px-1 py-2 text-center text-[9px] font-black text-psu-gray/50 uppercase w-16">{s}:00</th>
                ))}
                <th className="bg-psu-bg border-b border-psu-gray/10 px-2 py-2 text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest min-w-[140px]">{t('ops.remarkLabel')}</th>
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
                    {TEMP_CONTROL_SLOTS.map(s => {
                      const reading = sub?.meta?.tempReadings?.[s];
                      const n = Number(reading?.temp);
                      const outOfRange = reading?.temp && Number.isFinite(n) && !TEMP_LIMITS[asset.kind].check(n);
                      return (
                        <td key={s} title={reading ? `${reading.by} · ${new Date(reading.at).toLocaleTimeString()}` : undefined} className={cn("border-b border-psu-gray/5 px-1 py-1.5 text-center font-bold", outOfRange ? "text-psu-rejected" : "text-psu-gray")}>
                          {reading?.temp || ''}
                        </td>
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
