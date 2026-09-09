import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OutOfRangeFlag } from './opsHelpers';
import { assetsForSite, currentSlot, TEMP_CONTROL_SLOTS, TEMP_LIMITS, TempControlSlot } from '../../data/tempControlAssets';
import { Thermometer, Clock } from 'lucide-react';

// UF.10000 Temperature Control Checklist. The paper is one sheet per
// container for the whole month; this is one reading, for one asset, for
// the current slot — see tempControlAssets.ts's currentSlot().
export function TempControlForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t, language } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';
  const assets = assetsForSite(currentUser?.site);

  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [slot, setSlot] = useState<TempControlSlot>(currentSlot());
  const [tempC, setTempC] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = assets.find(a => a.id === assetId);
  const tempNum = Number(tempC);
  const hasTemp = tempC.trim() !== '' && Number.isFinite(tempNum);
  const outOfRange = Boolean(asset && hasTemp && !TEMP_LIMITS[asset.kind].check(tempNum));
  const canSubmit = Boolean(asset && hasTemp);

  const handleSubmit = async () => {
    if (!canSubmit || !asset || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      siteId: currentUser.site,
      siteName: currentSiteName,
      timestamp: new Date().toISOString(),
      type: 'TEMP_CONTROL',
      status: 'PENDING',
      items: [{
        id: 'reading',
        question: `${asset.name} — ${slot}:00`,
        answer: `${tempC}°C`,
        remarks: remark.trim() || undefined,
      }],
      meta: {
        formId: 'UF.10000',
        assetId: asset.id,
        assetName: asset.name,
        storeKind: asset.kind,
        slot,
        outOfRange,
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
        formId="UF.10000"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.FOOD_SAFETY_TECHNICIAN')}
      />

      <div className="card space-y-6">
        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.tempControl.assetLabel')}</label>
          <div className="grid grid-cols-2 gap-3">
            {assets.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAssetId(a.id)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all",
                  assetId === a.id ? "border-psu-blue bg-psu-blue/5" : "border-psu-gray/10 bg-psu-bg"
                )}
              >
                <p className="text-sm font-bold text-psu-gray">{a.name}</p>
                <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest mt-1">
                  {t(`ops.storeKind.${a.kind}`)} · {TEMP_LIMITS[a.kind].label}
                </p>
              </button>
            ))}
            {assets.length === 0 && (
              <p className="col-span-2 text-xs text-psu-gray/40 font-medium">{t('ops.tempControl.noAssets')}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clock size={12} /> {t('ops.slotLabel')}
          </label>
          <div className="grid grid-cols-5 gap-2">
            {TEMP_CONTROL_SLOTS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={cn(
                  "py-3 rounded-xl text-xs font-black transition-all",
                  slot === s ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/50"
                )}
              >
                {s}:00
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Thermometer size={12} /> {t('ops.tempControl.tempLabel')}
          </label>
          <input
            type="number"
            step="0.1"
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            placeholder="0.0"
            className={cn(
              "w-full bg-psu-bg border-2 rounded-xl p-4 text-lg font-black focus:outline-none focus:ring-2 focus:ring-psu-blue/20",
              outOfRange ? "border-psu-rejected" : "border-psu-gray/10"
            )}
          />
          {outOfRange && (
            <div className="mt-2"><OutOfRangeFlag label={t('ops.outOfRange')} /></div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-2">{t('ops.remarkLabel')}</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={t('ops.remarkPlaceholder')}
            className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20 h-20"
          />
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
