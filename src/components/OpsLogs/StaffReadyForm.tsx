import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip } from './opsHelpers';
import { STAFF_READY_GROUPS, STAFF_READY_POSITIONS, StaffReadyRow, emptyStaffReadyRow } from '../../data/staffReadyData';
import { Check, ChevronDown, ChevronUp, Plus, Trash2, UserPlus } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

// Checklist Persiapan Diri Karyawan — a shift roster, not the Daily Food
// Handler self-check (Inspections tab). Starts prefilled with every
// active Food Safety Technician at this site as their own row (empty
// marks) instead of an empty list + "add" — same paper-speed idea as
// Laundry's 8 prefilled lines. "All OK" per person bulk-fills the
// passing mark down every group for that one row; exceptions still get
// tapped individually. Extra names (contractors, a name not yet in the
// roster) can still be typed in.
export function StaffReadyForm({ store, onCancel, onSubmitted }: {
  store: ReturnType<typeof useAppStore>;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser, sites, users, addSubmission } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);
  // Roster suggestions are for whichever site this submission is
  // actually for — not necessarily the supervisor's own Home Site once
  // they have Site Access to more than one (see hooks/useWorkingSite.ts).
  // Scoped to Food Safety Technicians specifically — same role scope as
  // the Issue Warning picker in SupervisorPortal.tsx — not every account
  // at the site: this is a Supervisor checking their own line staff's
  // shift-readiness, not a roster of Housekeeping/other departments who
  // just happen to share a site, or of other Supervisors/Managers.
  const siteStaff = users.filter(u => u.site === workingSiteId && u.role === 'FOOD_SAFETY_TECHNICIAN');

  const [shift, setShift] = useState<'day' | 'night'>('day');
  // Prefilled once at mount from whichever site this form opened on —
  // switching sites afterward via the picker doesn't re-derive this list
  // (would silently drop anything already marked), it just changes who
  // "Add from roster" offers next.
  const [rows, setRows] = useState<StaffReadyRow[]>(() => siteStaff.map(u => emptyStaffReadyRow(`r-${u.id}`, u.name, u.id)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Same type-DELETE-to-confirm fail-safe as AdminPortal.tsx's delete-user
  // flow — a whole roster entry's completed checklist used to vanish on
  // one accidental tap.
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);

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
  const markAllOk = (id: string) => setRows(prev => prev.map(r => {
    if (r.id !== id) return r;
    const marks = { ...r.marks };
    STAFF_READY_GROUPS.forEach(g => g.items.forEach(i => { marks[i.id] = g.passingMark; }));
    return { ...r, marks, fhCardValid: true };
  }));

  const totalItems = STAFF_READY_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const rowComplete = (r: StaffReadyRow) => r.name.trim() && r.position && Object.keys(r.marks).length === totalItems;
  const filledRows = rows.filter(r => r.name.trim());
  const canSubmit = filledRows.length > 0 && filledRows.every(rowComplete);
  // Passing means every mark matches its OWN group's passing value — not
  // just "every mark is Y or B": penyakit's passing mark is T (no
  // symptom), so a stray Y there must fail the row like any other
  // exception would.
  const rowPasses = (r: StaffReadyRow) => STAFF_READY_GROUPS.every(g => g.items.every(i => r.marks[i.id] === g.passingMark)) && r.fhCardValid;

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    addSubmission({
      userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
      siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
      type: 'STAFF_READY', status: 'PENDING',
      items: filledRows.map(r => ({
        id: r.id,
        question: `${r.name} (${r.position})`,
        answer: rowPasses(r),
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
      <OpsHeaderChip siteName={currentSiteName} formId="STAFF_READY" userName={currentUser?.name || ''} staffCode={currentUser?.staffCode} departmentLabel={t('roles.FOOD_SAFETY_SUPERVISOR')} siteOptions={availableSites} onSiteChange={setWorkingSiteId} />

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

      {siteStaff.some(u => !rows.some(r => r.userId === u.id)) && (
        <div className="card space-y-2 md:hidden">
          <label className="block text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.staffReady.addFromRosterLabel')}</label>
          <select onChange={(e) => { if (e.target.value) addFromRoster(e.target.value); e.target.value = ''; }} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-sm font-bold" defaultValue="">
            <option value="">{t('ops.staffReady.addFromRosterPlaceholder')}</option>
            {siteStaff.filter(u => !rows.some(r => r.userId === u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      {/* Mobile: prefilled roster rows, expand for the full checklist. */}
      <div className="space-y-3 md:hidden">
        {rows.map(row => {
          const expanded = expandedId === row.id;
          const markedCount = Object.keys(row.marks).length;
          const allOk = markedCount === totalItems;
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
                {!allOk && (
                  <button onClick={(e) => { e.stopPropagation(); markAllOk(row.id); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-psu-green/10 text-psu-green rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0">
                    <Check size={12} /> {t('ops.staffReady.allOk')}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setRowToDelete(row.id); }} className="text-psu-rejected/50 shrink-0"><Trash2 size={16} /></button>
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
                                      ? (opt === group.passingMark ? "bg-psu-green text-white" : opt === 'C' ? "bg-psu-warning text-white" : "bg-psu-rejected text-white")
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
                    <input type="text" inputMode="decimal" value={row.bodyTempC} onChange={(e) => updateRow(row.id, { bodyTempC: e.target.value.replace(/[^0-9.]/g, '') })}
                      placeholder={t('ops.staffReady.bodyTempLabel')} className="bg-psu-bg border border-psu-gray/10 rounded-xl p-3 text-base font-bold" />
                  </div>
                  <textarea value={row.remark} onChange={(e) => updateRow(row.id, { remark: e.target.value })}
                    placeholder={t('ops.remarkPlaceholder')} className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-base h-16" />
                </div>
              )}
            </div>
          );
        })}

        <button onClick={addBlankRow} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-psu-gray/20 rounded-2xl text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">
          <UserPlus size={16} /> {t('ops.staffReady.addBlank')}
        </button>
      </div>

      {/* Desktop: a roster table — names x every group item, click cells,
          FH card + body temp + remark columns. */}
      <div className="hidden md:block">
        <StaffReadyDesktopTable
          rows={rows}
          onUpdateRow={updateRow}
          onSetMark={setMark}
          onMarkAllOk={markAllOk}
          onDeleteRow={(id) => setRowToDelete(id)}
          onAddBlankRow={addBlankRow}
          totalItems={totalItems}
        />
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

// Desktop roster table — sticky name column, one compact column per
// group item (Y/T or B/C/J toggle buttons, not free text), FH Card,
// body temp, remark. Same sticky-header/sticky-column pattern as
// LaundryShopForm's desktop grid.
function StaffReadyDesktopTable({
  rows, onUpdateRow, onSetMark, onMarkAllOk, onDeleteRow, onAddBlankRow, totalItems,
}: {
  rows: StaffReadyRow[];
  onUpdateRow: (id: string, patch: Partial<StaffReadyRow>) => void;
  onSetMark: (id: string, itemId: string, mark: string) => void;
  onMarkAllOk: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onAddBlankRow: () => void;
  totalItems: number;
}) {
  const { t } = useTranslation();
  const allItems = STAFF_READY_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g })));

  return (
    <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 bg-psu-bg border-b border-r border-psu-gray/10 px-2 py-2 text-left align-middle text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-40 min-w-[10rem]">{t('ops.staffReady.namePlaceholder')}</th>
              {allItems.map(item => (
                <th key={item.id} title={item.labelId} style={{ height: '92px' }} className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-0.5 py-2 align-bottom text-[8px] font-black text-psu-gray/40 uppercase w-9 min-w-[2.25rem]">
                  <span style={{ writingMode: 'vertical-rl' }} className="whitespace-nowrap">{item.labelId}</span>
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-2 py-2 text-center text-[9px] font-black text-psu-gray/50 uppercase w-20">{t('ops.staffReady.fhCardLabel')}</th>
              <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-2 py-2 text-center text-[9px] font-black text-psu-gray/50 uppercase w-16">°C</th>
              <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-2 py-2 text-left text-[9px] font-black text-psu-gray/50 uppercase min-w-[140px]">{t('ops.remarkLabel')}</th>
              <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const markedCount = Object.keys(row.marks).length;
              const allOk = markedCount === totalItems;
              return (
                <tr key={row.id} className="hover:bg-psu-bg/40 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-b border-r border-psu-gray/10 px-2 py-1.5 align-middle">
                    {row.userId ? (
                      <p className="text-xs font-bold text-psu-gray truncate">{row.name}</p>
                    ) : (
                      <input
                        type="text" value={row.name} onChange={(e) => onUpdateRow(row.id, { name: e.target.value })}
                        placeholder={t('ops.staffReady.namePlaceholder')}
                        className="w-full bg-transparent text-xs font-bold text-psu-gray focus:outline-none"
                      />
                    )}
                  </td>
                  {allItems.map(item => {
                    const options = item.group.markType === 'yn' ? ['Y', 'T'] : ['B', 'C', 'J'];
                    const current = row.marks[item.id];
                    return (
                      <td key={item.id} className="border-b border-psu-gray/5 px-0.5 py-1 align-middle text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          {options.map(opt => (
                            <button
                              key={opt} type="button" onClick={() => onSetMark(row.id, item.id, opt)}
                              className={cn("w-5 h-5 rounded text-[8px] font-black transition-all",
                                current === opt
                                  ? (opt === item.group.passingMark ? "bg-psu-green text-white" : opt === 'C' ? "bg-psu-warning text-white" : "bg-psu-rejected text-white")
                                  : "bg-psu-bg text-psu-gray/30")}
                            >{opt}</button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-psu-gray/5 px-2 py-1.5 align-middle text-center">
                    <input type="checkbox" checked={row.fhCardValid} onChange={(e) => onUpdateRow(row.id, { fhCardValid: e.target.checked })} />
                  </td>
                  <td className="border-b border-psu-gray/5 px-1 py-1.5 align-middle">
                    <input type="text" inputMode="decimal" value={row.bodyTempC} onChange={(e) => onUpdateRow(row.id, { bodyTempC: e.target.value.replace(/[^0-9.]/g, '') })}
                      className="w-full bg-transparent text-center text-xs font-bold text-psu-gray focus:outline-none" />
                  </td>
                  <td className="border-b border-psu-gray/5 px-2 py-1.5 align-middle">
                    <input type="text" value={row.remark} onChange={(e) => onUpdateRow(row.id, { remark: e.target.value })}
                      className="w-full bg-transparent text-[11px] font-medium text-psu-gray focus:outline-none" />
                  </td>
                  <td className="border-b border-psu-gray/5 px-2 py-1.5 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {!allOk && (
                        <button type="button" onClick={() => onMarkAllOk(row.id)} className="text-psu-green" title={t('ops.staffReady.allOk')}>
                          <Check size={14} />
                        </button>
                      )}
                      <button type="button" onClick={() => onDeleteRow(row.id)} className="text-psu-rejected/40 hover:text-psu-rejected transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button" onClick={onAddBlankRow}
        className="w-full flex items-center justify-center gap-2 py-3 border-t border-dashed border-psu-gray/20 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest hover:text-psu-gray/60 transition-colors"
      >
        <Plus size={14} /> {t('ops.staffReady.addBlank')}
      </button>
    </div>
  );
}
