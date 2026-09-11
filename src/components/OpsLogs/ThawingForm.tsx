import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OutOfRangeFlag } from './opsHelpers';
import { THAWING_METHODS, ThawMethodId, THAW_PRODUCT_CATEGORIES, ThawProductCategoryId, THAW_USED_FOR, THAW_PRODUCT_TEMP_LIMIT_C } from '../../data/thawingData';
import { Plus, Trash2 } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface ThawRow {
  id: string;
  category: ThawProductCategoryId | '';
  qty: string;
  startTime: string;
  endTime: string;
  endTempC: string;
  usedFor: string[];
}
function emptyThawRow(id: string): ThawRow {
  return { id, category: '', qty: '', startTime: '', endTime: '', endTempC: '', usedFor: [] };
}

// UN.00.43 Checklist of Thawing Process — one submit = one day + location
// + method + a list of product batch rows.
export function ThawingForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [method, setMethod] = useState<ThawMethodId>('1');
  const [rows, setRows] = useState<ThawRow[]>([emptyThawRow('r1')]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Same type-DELETE-to-confirm fail-safe as AdminPortal.tsx's delete-user
  // flow — a whole batch's readings used to vanish on one accidental tap.
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);

  const addRow = () => setRows(prev => [...prev, emptyThawRow(`r${prev.length + 1}-${Date.now()}`)]);
  const removeRow = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateRow = (id: string, patch: Partial<ThawRow>) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const toggleUsedFor = (id: string, code: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, usedFor: r.usedFor.includes(code) ? r.usedFor.filter(c => c !== code) : [...r.usedFor, code] } : r));

  const filledRows = rows.filter(r => r.category && r.qty.trim());
  const canSubmit = filledRows.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));

    const anyOverLimit = filledRows.some(r => {
      const n = Number(r.endTempC);
      return r.endTempC.trim() !== '' && Number.isFinite(n) && n > THAW_PRODUCT_TEMP_LIMIT_C;
    });

    addSubmission({
      userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
      siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
      type: 'THAWING', status: 'PENDING',
      items: filledRows.map(r => {
        const cat = THAW_PRODUCT_CATEGORIES.find(c => c.id === r.category);
        const n = Number(r.endTempC);
        const overLimit = r.endTempC.trim() !== '' && Number.isFinite(n) && n > THAW_PRODUCT_TEMP_LIMIT_C;
        return {
          id: r.id,
          question: `${cat?.labelId} — ${r.qty}`,
          answer: r.endTempC ? `${r.endTempC}°C` : '',
          remarks: [
            `${r.startTime || '--:--'}–${r.endTime || '--:--'}`,
            r.usedFor.length ? r.usedFor.join('/') : '',
            overLimit ? t('ops.outOfRange') : '',
          ].filter(Boolean).join(' · '),
        };
      }),
      meta: {
        formId: 'UN.00.43', thawMethod: method, outOfRange: anyOverLimit,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UN.00.43" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.thawing.methodLabel')}</label>
        <div className="space-y-2">
          {THAWING_METHODS.map(m => (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)}
              className={cn("w-full text-left p-3 rounded-xl text-xs font-bold transition-all", method === m.id ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/60")}
            >{m.id}. {m.labelId}</button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.thawing.batchLabel')} {idx + 1}</span>
              {rows.length > 1 && (
                <button onClick={() => setRowToDelete(row.id)} className="text-psu-rejected/60"><Trash2 size={16} /></button>
              )}
            </div>
            <select value={row.category} onChange={(e) => updateRow(row.id, { category: e.target.value as ThawProductCategoryId })} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm font-bold">
              <option value="">{t('ops.thawing.categoryPlaceholder')}</option>
              {THAW_PRODUCT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.labelId}</option>)}
            </select>
            <input type="text" value={row.qty} onChange={(e) => updateRow(row.id, { qty: e.target.value })} placeholder={t('ops.thawing.qtyPlaceholder')} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input type="time" value={row.startTime} onChange={(e) => updateRow(row.id, { startTime: e.target.value })} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" />
              <input type="time" value={row.endTime} onChange={(e) => updateRow(row.id, { endTime: e.target.value })} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-2.5 text-xs" />
              <input type="number" step="0.1" value={row.endTempC} onChange={(e) => updateRow(row.id, { endTempC: e.target.value })} placeholder={`<=${THAW_PRODUCT_TEMP_LIMIT_C}°C`}
                className={cn("bg-psu-bg border-2 rounded-xl p-2.5 text-xs font-bold", Number.isFinite(Number(row.endTempC)) && row.endTempC.trim() !== '' && Number(row.endTempC) > THAW_PRODUCT_TEMP_LIMIT_C ? "border-psu-rejected" : "border-psu-gray/10")} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-psu-gray/30 uppercase">{t('ops.thawing.usedForLabel')}</span>
              {THAW_USED_FOR.map(u => (
                <button key={u.id} type="button" onClick={() => toggleUsedFor(row.id, u.id)}
                  className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-black", row.usedFor.includes(u.id) ? "bg-psu-gray text-white" : "bg-psu-bg text-psu-gray/40 border border-psu-gray/10")}
                >{u.id}</button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-psu-gray/20 rounded-2xl text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          <Plus size={16} /> {t('ops.thawing.addBatch')}
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-blue text-white shadow-psu-blue/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.submit')}</button>
      </div>

      <ConfirmDeleteModal
        open={!!rowToDelete}
        onCancel={() => setRowToDelete(null)}
        onConfirm={() => { removeRow(rowToDelete!); setRowToDelete(null); }}
      />
    </div>
  );
}
