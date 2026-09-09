import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip } from './opsHelpers';
import { STAFF_READY_GROUPS, STAFF_READY_POSITIONS, StaffReadyRow, emptyStaffReadyRow } from '../../data/staffReadyData';
import { ChevronDown, ChevronUp, Plus, Trash2, UserPlus } from 'lucide-react';

// Checklist Persiapan Diri Karyawan — a shift roster, not the Daily Food
// Handler self-check (Inspections tab). Pulls names from active users at
// this site as a starting point; extra names can be typed in too.
export function StaffReadyForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, users, addSubmission } = store;
  const currentSiteName = sites.find(s => s.id === currentUser?.site)?.name || currentUser?.site || '';
  const siteStaff = users.filter(u => u.site === currentUser?.site && u.id !== currentUser?.id);

  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [rows, setRows] = useState<StaffReadyRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addFromRoster = (userId: string) => {
    const u = siteStaff.find(s => s.id === userId);
    if (!u || rows.some(r => r.userId === userId)) return;
    const row = emptyStaffReadyRow(`r-${Date.now()}`, u.name, u.id);
    setRows(prev => [...prev, row]);
    setExpandedId(row.id);
  };
  const addBlankRow = () => {
    const row = emptyStaffReadyRow(`r-${Date.now()}`);
    setRows(prev => [...prev, row]);
    setExpandedId(row.id);
  };
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id: string, patch: Partial<StaffReadyRow>) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const setMark = (id: string, itemId: string, mark: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, marks: { ...r.marks, [itemId]: mark } } : r));

  const totalItems = STAFF_READY_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const rowComplete = (r: StaffReadyRow) => r.name.trim() && r.position && Object.keys(r.marks).length === totalItems;
  const canSubmit = rows.length > 0 && rows.every(rowComplete);

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
      siteId: currentUser.site, siteName: currentSiteName, timestamp: new Date().toISOString(),
      type: 'STAFF_READY', status: 'PENDING',
      items: rows.map(r => ({
        id: r.id,
        question: `${r.name} (${r.position})`,
        answer: Object.values(r.marks).every(m => m === 'Y' || m === 'B'),
        remarks: [
          r.bodyTempC ? `${r.bodyTempC}°C` : '',
          !r.fhCardValid ? t('ops.staffReady.fhCardInvalid') : '',
          r.remark || '',
        ].filter(Boolean).join(' · ') || undefined,
      })),
      meta: {
        formId: 'STAFF_READY', shift,
        signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
      },
    });
    setIsSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      <OpsHeaderChip siteName={currentSiteName} formId="STAFF_READY" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')} />

      <div className="card space-y-3">
        <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.staffReady.shiftLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {(['day', 'night'] as const).map(s => (
            <button key={s} type="button" onClick={() => setShift(s)}
              className={cn("py-3 rounded-xl text-xs font-black uppercase transition-all", shift === s ? "bg-psu-blue text-white shadow-md shadow-psu-blue/20" : "bg-psu-bg text-psu-gray/50")}
            >{t(`ops.staffReady.shift.${s}`)}</button>
          ))}
        </div>
      </div>

      {siteStaff.length > 0 && (
        <div className="card space-y-2">
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.staffReady.addFromRosterLabel')}</label>
          <select onChange={(e) => { if (e.target.value) addFromRoster(e.target.value); e.target.value = ''; }} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm font-bold" defaultValue="">
            <option value="">{t('ops.staffReady.addFromRosterPlaceholder')}</option>
            {siteStaff.filter(u => !rows.some(r => r.userId === u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-3">
        {rows.map(row => {
          const expanded = expandedId === row.id;
          const markedCount = Object.keys(row.marks).length;
          return (
            <div key={row.id} className="card">
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : row.id)}>
                <div className="min-w-0 flex-1">
                  {row.userId ? (
                    <p className="text-sm font-bold text-psu-gray truncate">{row.name}</p>
                  ) : (
                    <input
                      type="text" value={row.name} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      placeholder={t('ops.staffReady.namePlaceholder')}
                      className="w-full bg-transparent text-sm font-bold text-psu-gray focus:outline-none"
                    />
                  )}
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mt-0.5">
                    {row.position ? STAFF_READY_POSITIONS.find(p => p.id === row.position)?.labelId : t('ops.staffReady.noPosition')} · {markedCount}/{totalItems}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeRow(row.id); }} className="text-psu-rejected/50 shrink-0"><Trash2 size={16} /></button>
                {expanded ? <ChevronUp size={18} className="text-psu-gray/30 shrink-0" /> : <ChevronDown size={18} className="text-psu-gray/30 shrink-0" />}
              </div>

              {expanded && (
                <div className="mt-4 pt-4 border-t border-psu-gray/5 space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1.5">{t('ops.staffReady.positionLabel')}</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STAFF_READY_POSITIONS.map(p => (
                        <button key={p.id} type="button" onClick={() => updateRow(row.id, { position: p.id })}
                          className={cn("py-2 rounded-lg text-[10px] font-black", row.position === p.id ? "bg-psu-gray text-white" : "bg-psu-bg text-psu-gray/40")}
                        >{p.id}</button>
                      ))}
                    </div>
                  </div>

                  {STAFF_READY_GROUPS.map(group => (
                    <div key={group.key} className="space-y-1.5">
                      <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest">{group.titleId}</p>
                      {group.items.map(item => {
                        const options = group.markType === 'yn' ? ['Y', 'T'] : ['B', 'C', 'J'];
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="text-xs font-medium text-psu-gray/70">{item.labelId}</span>
                            <div className="flex gap-1.5 shrink-0">
                              {options.map(opt => (
                                <button key={opt} type="button" onClick={() => setMark(row.id, item.id, opt)}
                                  className={cn("w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                                    row.marks[item.id] === opt
                                      ? (opt === 'T' || opt === 'J' ? "bg-psu-rejected text-white" : opt === 'C' ? "bg-psu-warning text-white" : "bg-psu-green text-white")
                                      : "bg-psu-bg text-psu-gray/30 border border-psu-gray/10")}
                                >{opt}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-psu-bg rounded-xl cursor-pointer">
                      <input type="checkbox" checked={row.fhCardValid} onChange={(e) => updateRow(row.id, { fhCardValid: e.target.checked })} />
                      <span className="text-[10px] font-black text-psu-gray/60 uppercase">{t('ops.staffReady.fhCardLabel')}</span>
                    </label>
                    <input type="number" step="0.1" value={row.bodyTempC} onChange={(e) => updateRow(row.id, { bodyTempC: e.target.value })}
                      placeholder={t('ops.staffReady.bodyTempLabel')} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-3 text-xs font-bold" />
                  </div>
                  <textarea value={row.remark} onChange={(e) => updateRow(row.id, { remark: e.target.value })}
                    placeholder={t('ops.remarkPlaceholder')} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-xs h-16" />
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addBlankRow} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-psu-gray/20 rounded-2xl text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          <UserPlus size={16} /> {t('ops.staffReady.addBlank')}
        </button>
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
