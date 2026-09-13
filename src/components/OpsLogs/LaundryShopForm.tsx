import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, ResubmitNotice } from './opsHelpers';
import {
  LAUNDRY_GARMENT_COLUMNS, FREQUENT_GARMENT_COLUMNS, OTHER_GARMENT_COLUMNS,
  LaundryGarmentId, LaundryRoomRow, emptyLaundryRow, totalRoomCount,
} from '../../data/laundryShopData';
import { ChevronDown, ChevronUp, Plus, Trash2, Minus, Copy, Clock } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

// One garment row inside a room's Frequent/All-types list — label, a
// minus/qty/plus stepper. Typing directly into the qty field still works
// (fast for a big count), the +/- buttons are for the common case of
// one or two more pieces.
function GarmentCounter({ label, title, value, onChange, onBump }: {
  label: string;
  title?: string;
  value: string;
  onChange: (value: string) => void;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-psu-gray/5 last:border-0">
      <span className="text-xs font-bold text-psu-gray truncate min-w-0 flex-1" title={title}>{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => onBump(-1)} className="w-8 h-8 rounded-lg bg-psu-bg border border-psu-gray/10 flex items-center justify-center text-psu-gray/50 active:scale-95 transition-all">
          <Minus size={14} />
        </button>
        <input
          type="text" inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-10 text-center text-sm font-black bg-transparent focus:outline-none"
        />
        <button type="button" onClick={() => onBump(1)} className="w-8 h-8 rounded-lg bg-psu-green/10 text-psu-green flex items-center justify-center active:scale-95 transition-all">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// Daily Check List — Laundryshop. NOT UN.00.65 section 6 — this is the
// laundry shop's own receiving log. One submit = one date, with one row
// per room dropped off that day and a count per garment type (blank = 0).
//
// Mobile (<md): a thumb grid, not a wizard — add a room number, tap
// counts on a short Frequent list (All types expands the rest), never
// "add an item". Desktop (md+): a real spreadsheet — sticky room column,
// one column per garment, click/Tab/Enter like the paper book. Both
// share the same `rows` state; only the editor chrome differs by
// breakpoint (see the md:hidden / hidden md:block split below).
export function LaundryShopForm({ store, onCancel, onSubmitted, editingSubmission }: OpsFormProps) {
  const { t } = useTranslation();
  const { currentUser, sites, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [rows, setRows] = useState<LaundryRoomRow[]>(
    () => editingSubmission?.meta?.laundryRows?.map(r => ({ ...r, counts: r.counts as LaundryRoomRow['counts'] })) || [emptyLaundryRow('room-1')]
  );
  const [expandedId, setExpandedId] = useState<string | null>(rows[0]?.id ?? null);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A tap on the trash icon used to remove a room's counts immediately,
  // with no way back — that's real data entry lost to one accidental
  // tap. Now it just opens the same type-DELETE-to-confirm fail-safe
  // AdminPortal.tsx uses for deleting a user profile.
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const today = editingSubmission?.meta?.laundryDate || new Date().toISOString().slice(0, 10);

  // Desktop: which row's room-number cell to focus once it exists — set
  // by the Enter-adds-a-row handler and the bottom "+ Add row" control,
  // consumed by the effect below once that row has actually rendered.
  const [focusRoomId, setFocusRoomId] = useState<string | null>(null);
  const roomInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => {
    if (focusRoomId && roomInputRefs.current[focusRoomId]) {
      roomInputRefs.current[focusRoomId]?.focus();
      setFocusRoomId(null);
    }
  }, [focusRoomId, rows]);

  const addBlankRow = () => {
    const row = emptyLaundryRow(`room-${Date.now()}`);
    setRows(prev => [...prev, row]);
    setFocusRoomId(row.id);
    return row.id;
  };
  // Mobile's prominent "add room" field — a room appears immediately,
  // expanded, all counts 0, instead of an empty "0 items" dead state.
  const handleAddRoomMobile = () => {
    const row = emptyLaundryRow(`room-${Date.now()}`);
    row.roomNumber = newRoomNumber.trim();
    setRows(prev => [...prev, row]);
    setExpandedId(row.id);
    setShowAllTypes(false);
    setNewRoomNumber('');
  };
  const duplicateRow = (id: string) => {
    const source = rows.find(r => r.id === id);
    if (!source) return;
    const input = window.prompt(t('ops.laundryShop.duplicateRoomPrompt'), '');
    if (input === null) return;
    const newRow: LaundryRoomRow = { ...source, id: `room-${Date.now()}`, roomNumber: input.trim(), counts: { ...source.counts } };
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, newRow);
      return next;
    });
    setExpandedId(newRow.id);
    setShowAllTypes(false);
  };
  const removeRow = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateRoomNumber = (id: string, roomNumber: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, roomNumber } : r));
  const updateKeterangan = (id: string, keterangan: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, keterangan } : r));
  const updateCount = (id: string, garmentId: string, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, counts: { ...r.counts, [garmentId]: value.replace(/\D/g, '') } } : r));
  const bumpCount = (id: string, garmentId: LaundryGarmentId, delta: number) =>
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = Math.max(0, (parseInt(r.counts[garmentId], 10) || 0) + delta);
      return { ...r, counts: { ...r.counts, [garmentId]: next === 0 ? '' : String(next) } };
    }));

  // Validation: a room number is only required once that room actually
  // has a count in it — an empty scratch row is fine to leave blank.
  // Duplicate room numbers are a warning, not a block (two bags from the
  // same room in one day is a real thing).
  const invalidRowIds = new Set(rows.filter(r => totalRoomCount(r) > 0 && !r.roomNumber.trim()).map(r => r.id));
  const roomNumberCounts = new Map<string, number>();
  rows.forEach(r => {
    const key = r.roomNumber.trim().toLowerCase();
    if (key) roomNumberCounts.set(key, (roomNumberCounts.get(key) || 0) + 1);
  });
  const duplicateRoomNumbers = new Set([...roomNumberCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  const submittableRows = rows.filter(r => r.roomNumber.trim() && totalRoomCount(r) > 0);
  const canSubmit = submittableRows.length > 0 && invalidRowIds.size === 0;

  // "Copy yesterday's rooms" — room numbers only, counts left at 0. Reads
  // straight off store.submissions (already loaded, already filtered to
  // this user's own history elsewhere) rather than a new query.
  const previousSubmission = store.submissions
    .filter(s => s.type === 'LAUNDRY_SHOP' && s.userId === currentUser?.id && s.meta?.laundryDate && s.meta.laundryDate < today && (s.meta?.laundryRows?.length ?? 0) > 0)
    .sort((a, b) => (b.meta?.laundryDate ?? '').localeCompare(a.meta?.laundryDate ?? ''))[0];
  const previousRoomNumbers = Array.from(new Set(
    (previousSubmission?.meta?.laundryRows ?? []).map(r => r.roomNumber.trim()).filter(Boolean)
  ));
  const copyYesterdayRooms = () => {
    const existing = new Set(rows.map(r => r.roomNumber.trim().toLowerCase()).filter(Boolean));
    const toAdd = previousRoomNumbers.filter(rn => !existing.has(rn.toLowerCase()));
    if (toAdd.length === 0) return;
    setRows(prev => [...prev, ...toAdd.map((rn, i) => {
      const row = emptyLaundryRow(`room-${Date.now()}-${i}`);
      row.roomNumber = rn;
      return row;
    })]);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    const items = submittableRows.map(r => ({
      id: r.id,
      question: `${t('ops.laundryShop.roomLabel')} ${r.roomNumber}`,
      answer: `${totalRoomCount(r)} ${t('ops.laundryShop.itemsUnit')}`,
      remarks: [
        (Object.entries(r.counts) as [string, string][]).filter(([, v]) => parseInt(v, 10) > 0).map(([gId, v]) => {
          const g = LAUNDRY_GARMENT_COLUMNS.find(c => c.id === gId);
          return `${g?.labelId} x${v}`;
        }).join(', '),
        r.keterangan,
      ].filter(Boolean).join(' — ') || undefined,
    }));
    if (editingSubmission) {
      resubmitAfterRejection(editingSubmission.id, {
        items,
        meta: { ...editingSubmission.meta, laundryDate: today, laundryRows: submittableRows },
      });
    } else {
      addSubmission({
        userId: currentUser.id, userName: currentUser.name, role: currentUser.role,
        siteId: workingSiteId, siteName: currentSiteName, timestamp: new Date().toISOString(),
        type: 'LAUNDRY_SHOP', status: 'PENDING',
        items,
        meta: {
          formId: 'UN.00-LAUNDRY', laundryDate: today, laundryRows: submittableRows,
          signoff: { draftedBy: { userId: currentUser.id, name: currentUser.name, staffCode: currentUser.staffCode, at: new Date().toISOString() } },
        },
      });
    }
    setIsSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      {editingSubmission && <ResubmitNotice />}
      <OpsHeaderChip
        siteName={currentSiteName}
        formId="UN.00-LAUNDRY"
        userName={currentUser?.name || ''}
        staffCode={currentUser?.staffCode}
        departmentLabel={t('roles.HOUSEKEEPING_LAUNDRY')}
        siteOptions={availableSites}
        onSiteChange={setWorkingSiteId}
      />

      <div className="card !py-3 text-center">
        <span className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('ops.laundryShop.dateLabel')}: {today}</span>
      </div>

      {/* Mobile: thumb grid — add-room bar, then one card per room with a
          Frequent stepper list (All types expands the rest). */}
      <div className="space-y-3 md:hidden">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text" inputMode="numeric"
              value={newRoomNumber}
              onChange={(e) => setNewRoomNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRoomMobile(); } }}
              placeholder={t('ops.laundryShop.roomPlaceholder')}
              className="flex-1 min-w-0 bg-white border border-psu-gray/10 rounded-2xl px-4 py-4 text-base font-black text-psu-gray focus:outline-none focus:ring-2 focus:ring-psu-green/20"
            />
            <button
              type="button" onClick={handleAddRoomMobile}
              className="px-5 rounded-2xl bg-psu-green text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
            >
              <Plus size={16} /> {t('ops.laundryShop.addRoom')}
            </button>
          </div>
          {previousRoomNumbers.length > 0 && (
            <button type="button" onClick={copyYesterdayRooms} className="w-full flex items-center justify-center gap-2 py-2.5 text-psu-blue font-black text-[9px] uppercase tracking-widest">
              <Clock size={13} /> {t('ops.laundryShop.copyYesterday')}
            </button>
          )}
        </div>

        {rows.map(row => {
          const expanded = expandedId === row.id;
          const invalid = invalidRowIds.has(row.id);
          const dup = !invalid && row.roomNumber.trim() && duplicateRoomNumbers.has(row.roomNumber.trim().toLowerCase());
          return (
            <div key={row.id} className="card">
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : row.id)}>
                <div className="min-w-0 flex-1">
                  <input
                    type="text" value={row.roomNumber} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateRoomNumber(row.id, e.target.value)}
                    placeholder={t('ops.laundryShop.roomPlaceholder')}
                    className={cn("w-full bg-transparent text-lg font-black focus:outline-none", invalid ? "text-psu-rejected" : "text-psu-gray")}
                  />
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mt-0.5">
                    {totalRoomCount(row)} {t('ops.laundryShop.itemsUnit')}
                  </p>
                  {invalid && <p className="text-[9px] font-bold text-psu-rejected mt-0.5">{t('ops.laundryShop.roomNumberRequired')}</p>}
                  {dup && <p className="text-[9px] font-bold text-psu-warning mt-0.5">{t('ops.laundryShop.duplicateRoomWarning', { room: row.roomNumber.trim() })}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); duplicateRow(row.id); }} className="text-psu-blue/50 p-1" aria-label={t('ops.laundryShop.duplicateRoom')}>
                    <Copy size={16} />
                  </button>
                  {rows.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setRowToDelete(row.id); }} className="text-psu-rejected/50 p-1"><Trash2 size={16} /></button>
                  )}
                  {expanded ? <ChevronUp size={18} className="text-psu-gray/30 shrink-0" /> : <ChevronDown size={18} className="text-psu-gray/30 shrink-0" />}
                </div>
              </div>

              {expanded && (
                <div className="mt-4 pt-4 border-t border-psu-gray/5 space-y-3">
                  <div>
                    <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{t('ops.laundryShop.frequent')}</p>
                    {FREQUENT_GARMENT_COLUMNS.map(g => (
                      <GarmentCounter
                        key={g.id} label={g.labelId} title={g.labelEn}
                        value={row.counts[g.id]}
                        onChange={(v) => updateCount(row.id, g.id, v)}
                        onBump={(d) => bumpCount(row.id, g.id, d)}
                      />
                    ))}
                  </div>

                  <button
                    type="button" onClick={() => setShowAllTypes(s => !s)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-psu-gray/40 font-black text-[9px] uppercase tracking-widest"
                  >
                    {showAllTypes ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {t('ops.laundryShop.allTypes')}
                  </button>

                  {showAllTypes && (
                    <div>
                      {OTHER_GARMENT_COLUMNS.map(g => (
                        <GarmentCounter
                          key={g.id} label={g.labelId} title={g.labelEn}
                          value={row.counts[g.id]}
                          onChange={(v) => updateCount(row.id, g.id, v)}
                          onBump={(d) => bumpCount(row.id, g.id, d)}
                        />
                      ))}
                    </div>
                  )}

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
      </div>

      {/* Desktop: the paper sheet — a real spreadsheet grid, not the
          mobile accordion. Sticky room column + header, click/Tab/Enter
          like the book, a totals row at the bottom. */}
      <div className="hidden md:block space-y-2">
        <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('ops.laundryShop.emptyGridHint')}</p>
        <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 bg-psu-bg border-b border-r border-psu-gray/10 px-2 py-2 text-left align-middle text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-40 min-w-[10rem]">
                    {t('ops.laundryShop.roomColumnHeader')}
                  </th>
                  {LAUNDRY_GARMENT_COLUMNS.map(g => (
                    <th
                      key={g.id} title={g.labelId}
                      style={{ height: '92px' }}
                      className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-1 py-2 align-bottom text-[9px] font-black text-psu-gray/50 uppercase w-11 min-w-[2.75rem]"
                    >
                      <span style={{ writingMode: 'vertical-rl' }} className="whitespace-nowrap">{g.labelId}</span>
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 px-2 py-2 align-middle text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest min-w-[140px]">
                    {t('ops.laundryShop.keteranganHeader')}
                  </th>
                  <th className="sticky top-0 z-10 bg-psu-bg border-b border-psu-gray/10 w-9" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const invalid = invalidRowIds.has(row.id);
                  const dup = !invalid && row.roomNumber.trim() && duplicateRoomNumbers.has(row.roomNumber.trim().toLowerCase());
                  return (
                    <tr key={row.id} className="hover:bg-psu-bg/40 transition-colors">
                      <td className={cn("sticky left-0 z-10 border-b border-r border-psu-gray/10 px-2 py-1 align-middle", invalid ? "bg-psu-rejected/5" : "bg-white")}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-psu-gray/30 font-black w-4 text-right shrink-0">{idx + 1}</span>
                          <input
                            ref={(el) => { roomInputRefs.current[row.id] = el; }}
                            type="text" value={row.roomNumber}
                            onChange={(e) => updateRoomNumber(row.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBlankRow(); } }}
                            placeholder={t('ops.laundryShop.roomPlaceholder')}
                            title={invalid ? t('ops.laundryShop.roomNumberRequired') : dup ? t('ops.laundryShop.duplicateRoomWarning', { room: row.roomNumber.trim() }) : undefined}
                            className={cn("w-full min-w-0 bg-transparent text-xs font-black focus:outline-none", invalid ? "text-psu-rejected" : dup ? "text-psu-warning" : "text-psu-gray")}
                          />
                        </div>
                      </td>
                      {LAUNDRY_GARMENT_COLUMNS.map(g => (
                        <td key={g.id} className="border-b border-psu-gray/5 p-0.5 align-middle">
                          <input
                            type="text" inputMode="numeric"
                            value={row.counts[g.id]}
                            onChange={(e) => updateCount(row.id, g.id, e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-center text-xs font-bold text-psu-gray focus:outline-none focus:bg-psu-green/5 rounded py-1"
                          />
                        </td>
                      ))}
                      <td className="border-b border-psu-gray/5 px-1 align-middle">
                        <input
                          type="text" value={row.keterangan}
                          onChange={(e) => updateKeterangan(row.id, e.target.value)}
                          placeholder={t('ops.laundryShop.keteranganPlaceholder')}
                          className="w-full bg-transparent text-[11px] font-medium text-psu-gray focus:outline-none"
                        />
                      </td>
                      <td className="border-b border-psu-gray/5 px-1 align-middle text-center">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => setRowToDelete(row.id)} className="text-psu-rejected/40 hover:text-psu-rejected transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="sticky left-0 z-10 bg-psu-bg border-t border-r border-psu-gray/10 px-2 py-2 align-middle text-[9px] font-black uppercase tracking-widest text-psu-gray/50">
                    {t('ops.laundryShop.total')}
                  </td>
                  {LAUNDRY_GARMENT_COLUMNS.map(g => (
                    <td key={g.id} className="bg-psu-bg border-t border-psu-gray/10 text-center align-middle text-[10px] font-black text-psu-gray/60 py-2">
                      {rows.reduce((sum, r) => sum + (parseInt(r.counts[g.id], 10) || 0), 0) || ''}
                    </td>
                  ))}
                  <td className="bg-psu-bg border-t border-psu-gray/10" />
                  <td className="bg-psu-bg border-t border-psu-gray/10" />
                </tr>
              </tbody>
            </table>
          </div>
          <button
            type="button" onClick={() => addBlankRow()}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-dashed border-psu-gray/20 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest hover:text-psu-gray/60 transition-colors"
          >
            <Plus size={14} /> {t('ops.laundryShop.addRoom')}
          </button>
        </div>
      </div>

      <div className="flex gap-3 md:sticky md:bottom-0 md:bg-white/95 md:backdrop-blur md:border-t md:border-psu-gray/10 md:py-4 md:z-20 md:rounded-t-2xl">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-4 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest">{t('common.cancel')}</button>
        )}
        <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}
          className={cn("flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95", canSubmit ? "bg-psu-green text-white shadow-psu-green/20" : "bg-psu-gray/20 text-psu-gray/40")}
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
