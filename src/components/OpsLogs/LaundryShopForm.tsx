import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip } from './opsHelpers';
import { LAUNDRY_GARMENT_COLUMNS, LaundryRoomRow, emptyLaundryRow } from '../../data/laundryShopData';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

// Daily Check List — Laundryshop. NOT UN.00.65 section 6 — this is the
// laundry shop's own receiving log. One submit = one date, with one row
// per room dropped off that day and a count per garment type (blank = 0).
export function LaundryShopForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission } = store;
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';

  const [rows, setRows] = useState<LaundryRoomRow[]>([emptyLaundryRow('room-1')]);
  const [expandedId, setExpandedId] = useState<string | null>('room-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const addRow = () => {
    const row = emptyLaundryRow(`room-${Date.now()}`);
    setRows(prev => [...prev, row]);
    setExpandedId(row.id);
  };
  const removeRow = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateRoomNumber = (id: string, roomNumber: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, roomNumber } : r));
  const updateKeterangan = (id: string, keterangan: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, keterangan } : r));
  const updateCount = (id: string, garmentId: string, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, counts: { ...r.counts, [garmentId]: value.replace(/\D/g, '') } } : r));

  const filledRows = rows.filter(r => r.roomNumber.trim());
  const canSubmit = filledRows.length > 0;

  const totalGarments = (r: LaundryRoomRow) => (Object.values(r.counts) as string[]).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
      siteId: currentUser.site, siteName: currentSiteName, timestamp: new Date().toISOString(),
      type: 'LAUNDRY_SHOP', status: 'PENDING',
      items: filledRows.map(r => ({
        id: r.id,
        question: `${t('ops.laundryShop.roomLabel')} ${r.roomNumber}`,
        answer: `${totalGarments(r)} ${t('ops.laundryShop.itemsUnit')}`,
        remarks: [
          (Object.entries(r.counts) as [string, string][]).filter(([, v]) => parseInt(v, 10) > 0).map(([gId, v]) => {
            const g = LAUNDRY_GARMENT_COLUMNS.find(c => c.id === gId);
            return `${g?.labelId} x${v}`;
          }).join(', '),
          r.keterangan,
        ].filter(Boolean).join(' — ') || undefined,
      })),
      meta: {
        formId: 'UN.00-LAUNDRY', laundryDate: today,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="UN.00-LAUNDRY" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.HOUSEKEEPER')} />

      <div className="card !py-3 text-center">
        <span className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.laundryShop.dateLabel')}: {today}</span>
      </div>

      <div className="space-y-3">
        {rows.map(row => {
          const expanded = expandedId === row.id;
          return (
            <div key={row.id} className="card">
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : row.id)}>
                <div className="min-w-0 flex-1">
                  <input
                    type="text" value={row.roomNumber} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateRoomNumber(row.id, e.target.value)}
                    placeholder={t('ops.laundryShop.roomPlaceholder')}
                    className="w-full bg-transparent text-lg font-black text-psu-gray focus:outline-none"
                  />
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mt-0.5">
                    {totalGarments(row)} {t('ops.laundryShop.itemsUnit')}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeRow(row.id); }} className="text-psu-rejected/50 shrink-0"><Trash2 size={16} /></button>
                {expanded ? <ChevronUp size={18} className="text-psu-gray/30 shrink-0" /> : <ChevronDown size={18} className="text-psu-gray/30 shrink-0" />}
              </div>

              {expanded && (
                <div className="mt-4 pt-4 border-t border-psu-gray/5 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {LAUNDRY_GARMENT_COLUMNS.map(g => (
                      <div key={g.id}>
                        <label className="block text-[8px] font-black text-psu-gray/30 uppercase tracking-tighter mb-1 truncate" title={g.labelId}>{g.labelId}</label>
                        <input
                          type="text" inputMode="numeric"
                          value={row.counts[g.id]}
                          onChange={(e) => updateCount(row.id, g.id, e.target.value)}
                          placeholder="0"
                          className="w-full bg-psu-bg border border-psu-gray/10 rounded-lg p-2 text-xs font-bold text-center"
                        />
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={row.keterangan}
                    onChange={(e) => updateKeterangan(row.id, e.target.value)}
                    placeholder={t('ops.laundryShop.keteranganPlaceholder')}
                    className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs h-16"
                  />
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addRow} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-psu-gray/20 rounded-2xl text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          <Plus size={16} /> {t('ops.laundryShop.addRoom')}
        </button>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-green text-white shadow-psu-green/20" : "bg-psu-gray/20 text-psu-gray/40")}
        >{isSubmitting ? t('common.loading') : t('common.submit')}</button>
      </div>
    </div>
  );
}
