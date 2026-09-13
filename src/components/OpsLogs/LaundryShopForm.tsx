import { Key, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from '@tanstack/react-table';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { OpsHeaderChip, OpsFormProps, ResubmitNotice } from './opsHelpers';
import { laundrySubmissionSchema } from '../../lib/validators/laundryShop';
import {
  LAUNDRY_GARMENT_COLUMNS, FREQUENT_GARMENT_COLUMNS, OTHER_GARMENT_COLUMNS,
  LaundryGarmentId, LaundryRoomRow, emptyLaundryRow, totalRoomCount,
} from '../../data/laundryShopData';
import { ChevronDown, ChevronUp, Plus, Trash2, Minus, Copy, Clock, X } from 'lucide-react';
import { useWorkingSite } from '../../hooks/useWorkingSite';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { Modal } from '../Modal';
import { AnimatePresence } from 'motion/react';

// TanStack Table's own callback-props-via-meta pattern for editable
// cells (its docs' own recommended shape for this exact case) — column
// defs below stay pure render functions; every mutation goes through
// these instead of closing over component state directly, so the column
// array itself doesn't need to be rebuilt as a special case.
declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    invalidRowIds: Set<string>;
    duplicateRoomNumbers: Set<string>;
    onRoomNumberChange: (id: string, value: string) => void;
    onCountChange: (id: string, garmentId: string, value: string) => void;
    onKeteranganChange: (id: string, value: string) => void;
    onEnterRoom: () => void;
    setRoomRef: (id: string, el: HTMLInputElement | null) => void;
    onDeleteRow: (id: string) => void;
    canDeleteRows: boolean;
  }
}
const laundryColumnHelper = createColumnHelper<LaundryRoomRow>();

// A fresh Laundry log starts with this many blank numbered lines already
// on screen — paper-speed means never seeing an empty "0 items" state as
// the first thing you do. Reopening a REJECTED entry to fix/resubmit
// still hydrates from whatever rooms were actually saved (see the rows
// initializer below), not padded back up to 8.
const PREFILLED_LINE_COUNT = 8;

// One garment row inside a room's Frequent/All-types list — label, a
// minus/qty/plus stepper. Typing directly into the qty field still works
// (fast for a big count), the +/- buttons are for the common case of
// one or two more pieces. Only ever rendered inside the mobile
// full-screen counter editor, so the qty input is a flat 16px
// (text-base) + inputMode="numeric" — no iOS focus-zoom, no desktop
// variant needed.
function GarmentCounter({ label, title, value, onChange, onBump }: {
  // Declared (never read) purely so key={...} type-checks when this is
  // rendered from a .map() — see ChecklistRow's identical comment in
  // opsHelpers.tsx.
  key?: Key;
  label: string;
  title?: string;
  value: string;
  onChange: (value: string) => void;
  onBump: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-psu-gray/5 last:border-0">
      <span className="text-sm font-bold text-psu-gray truncate min-w-0 flex-1" title={title}>{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => onBump(-1)} className="w-10 h-10 rounded-xl bg-psu-bg border border-psu-gray/10 flex items-center justify-center text-psu-gray/50 active:scale-95 transition-all">
          <Minus size={16} />
        </button>
        <input
          type="text" inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
          className="w-12 text-center text-base font-black bg-transparent focus:outline-none"
        />
        <button type="button" onClick={() => onBump(1)} className="w-10 h-10 rounded-xl bg-psu-green/10 text-psu-green flex items-center justify-center active:scale-95 transition-all">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// Daily Check List — Laundryshop. NOT UN.00.65 section 6 — this is the
// laundry shop's own receiving log. One submit = one date, with one row
// per room dropped off that day and a count per garment type (blank = 0).
//
// Mobile (<md): 8 prefilled numbered lines, collapsed to # / room / total
// pcs. Tapping a line opens a full-screen counter editor (Frequent list
// first, All types expands the rest) — never an "add item" flow. Desktop
// (md+): a real spreadsheet — sticky room column, one column per garment,
// click/Tab/Enter like the paper book. Both share the same `rows` state;
// only the editor chrome differs by breakpoint.
export function LaundryShopForm({ store, onCancel, onSubmitted, editingSubmission }: OpsFormProps) {
  const { t, language } = useTranslation();
  const { currentUser, sites, addSubmission, resubmitAfterRejection } = store;
  const { workingSiteId, workingSiteName: currentSiteName, availableSites, setWorkingSiteId } = useWorkingSite(currentUser, sites);

  const [rows, setRows] = useState<LaundryRoomRow[]>(() => {
    if (editingSubmission?.meta?.laundryRows?.length) {
      return editingSubmission.meta.laundryRows.map(r => ({ ...r, counts: r.counts as LaundryRoomRow['counts'] }));
    }
    return Array.from({ length: PREFILLED_LINE_COUNT }, (_, i) => emptyLaundryRow(`room-${i + 1}`));
  });
  // Mobile only — which room's full-screen counter editor is open. Never
  // auto-opened on mount: the collapsed line list itself is the landing
  // view, not a wizard step.
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showAllTypes, setShowAllTypes] = useState(false);
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

  // Shared by both breakpoints' "add" controls — a line only ever appends
  // one blank row. Desktop also focuses it (see the effect above);
  // mobile just appends it to the collapsed list for whenever the filer
  // gets to it — no auto-opened editor, no room-number prompt.
  const addBlankRow = () => {
    const row = emptyLaundryRow(`room-${Date.now()}`);
    setRows(prev => [...prev, row]);
    setFocusRoomId(row.id);
    return row.id;
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
    setEditingRoomId(newRow.id);
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
  // has a count in it — an empty scratch line is fine to leave blank.
  // Duplicate room numbers are a warning, not a block (two bags from the
  // same room in one day is a real thing).
  const invalidRowIds: Set<string> = new Set(rows.filter(r => totalRoomCount(r) > 0 && !r.roomNumber.trim()).map(r => r.id));
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
  const previousRoomNumbers: string[] = Array.from(new Set(
    (previousSubmission?.meta?.laundryRows ?? [])
      .map(r => r.roomNumber.trim())
      .filter((roomNumber): roomNumber is string => roomNumber.length > 0)
  ));
  const copyYesterdayRooms = () => {
    const existing = new Set(rows.map(r => r.roomNumber.trim().toLowerCase()).filter(Boolean));
    const toAdd = previousRoomNumbers.filter((rn: string) => !existing.has(rn.toLowerCase()));
    if (toAdd.length === 0) return;
    setRows(prev => [...prev, ...toAdd.map((rn, i) => {
      const row = emptyLaundryRow(`room-${Date.now()}-${i}`);
      row.roomNumber = rn;
      return row;
    })]);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser) return;
    // Last-mile guard right before the write — the UI's own canSubmit/
    // invalidRowIds checks already keep this from being reachable in
    // normal use, but this is the one place the paper's actual rules
    // (room number required, counts >= 0) are enforced as the real gate
    // on what gets saved, not just what disables a button.
    const parsed = laundrySubmissionSchema.safeParse(submittableRows);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t('ops.laundryShop.validationError'));
      return;
    }
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
    toast.success(t('ops.laundryShop.submittedToast'));
    onSubmitted();
  };

  const editingRoom = editingRoomId ? rows.find(r => r.id === editingRoomId) : undefined;

  // Desktop grid — column defs once, one per garment plus room/keterangan/
  // actions; every cell is a controlled input reading straight off `rows`,
  // so the table has nothing of its own to keep in sync. A `footer` per
  // garment column doubles as the totals row (table.getFooterGroups()
  // below) instead of a hand-appended <tr>.
  // Memoized on language alone (the only thing column *definitions*
  // actually depend on — everything row-specific comes through `meta`,
  // not a closure over `rows`/`t`) — a fresh columns array every render
  // is a known TanStack Table foot-gun: it treats that as "the whole
  // column model changed" and remounts every cell, which drops focus
  // out of whatever input the person was mid-keystroke in. Redefining it
  // only when the language actually toggles keeps Tab-to-next-cell
  // working continuously while still translating header labels.
  const laundryColumns = useMemo(() => [
    laundryColumnHelper.display({
      id: 'room',
      header: () => t('ops.laundryShop.roomColumnHeader'),
      cell: ({ row, table }) => {
        const r = row.original;
        const meta = table.options.meta!;
        const invalid = meta.invalidRowIds.has(r.id);
        const dup = !invalid && r.roomNumber.trim() && meta.duplicateRoomNumbers.has(r.roomNumber.trim().toLowerCase());
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-psu-gray/30 font-black w-4 text-right shrink-0">{row.index + 1}</span>
            <input
              ref={(el) => meta.setRoomRef(r.id, el)}
              type="text" value={r.roomNumber}
              onChange={(e) => meta.onRoomNumberChange(r.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); meta.onEnterRoom(); } }}
              placeholder={t('ops.laundryShop.roomPlaceholder')}
              title={invalid ? t('ops.laundryShop.roomNumberRequired') : dup ? t('ops.laundryShop.duplicateRoomWarning', { room: r.roomNumber.trim() }) : undefined}
              className={cn("w-full min-w-0 bg-transparent text-xs font-black focus:outline-none", invalid ? "text-psu-rejected" : dup ? "text-psu-warning" : "text-psu-gray")}
            />
          </div>
        );
      },
      footer: () => t('ops.laundryShop.total'),
    }),
    ...LAUNDRY_GARMENT_COLUMNS.map(g => laundryColumnHelper.accessor(row => row.counts[g.id], {
      id: g.id,
      header: () => <span title={g.labelId} style={{ writingMode: 'vertical-rl' as const }} className="whitespace-nowrap">{g.labelId}</span>,
      cell: ({ row, table }) => {
        const r = row.original;
        const meta = table.options.meta!;
        return (
          <input
            type="text" inputMode="numeric"
            value={r.counts[g.id]}
            onChange={(e) => meta.onCountChange(r.id, g.id, e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-center text-xs font-bold text-psu-gray focus:outline-none focus:bg-psu-green/5 rounded py-1"
          />
        );
      },
      footer: ({ table }) => {
        const total = table.getCoreRowModel().rows.reduce((sum, row) => sum + (parseInt(row.original.counts[g.id], 10) || 0), 0);
        return total || '';
      },
    })),
    laundryColumnHelper.display({
      id: 'keterangan',
      header: () => t('ops.laundryShop.keteranganHeader'),
      cell: ({ row, table }) => {
        const r = row.original;
        const meta = table.options.meta!;
        return (
          <input
            type="text" value={r.keterangan} onChange={(e) => meta.onKeteranganChange(r.id, e.target.value)}
            placeholder={t('ops.laundryShop.keteranganPlaceholder')}
            className="w-full bg-transparent text-[11px] font-medium text-psu-gray focus:outline-none"
          />
        );
      },
    }),
    laundryColumnHelper.display({
      id: 'actions',
      cell: ({ row, table }) => {
        const meta = table.options.meta!;
        return meta.canDeleteRows ? (
          <button type="button" onClick={() => meta.onDeleteRow(row.original.id)} className="text-psu-rejected/40 hover:text-psu-rejected transition-colors">
            <Trash2 size={13} />
          </button>
        ) : null;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [language]);

  const laundryTable = useReactTable<LaundryRoomRow>({
    data: rows,
    columns: laundryColumns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      invalidRowIds,
      duplicateRoomNumbers,
      onRoomNumberChange: updateRoomNumber,
      onCountChange: updateCount,
      onKeteranganChange: updateKeterangan,
      onEnterRoom: addBlankRow,
      setRoomRef: (id, el) => { roomInputRefs.current[id] = el; },
      onDeleteRow: (id) => setRowToDelete(id),
      canDeleteRows: rows.length > 1,
    },
  });
  const isGarmentColumn = (id: string) => LAUNDRY_GARMENT_COLUMNS.some(g => g.id === id);

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

      {/* Mobile: numbered lines, collapsed to #/room/total — tap a line
          for the full-screen counter editor, never an inline "add item". */}
      <div className="space-y-2 md:hidden">
        {previousRoomNumbers.length > 0 && (
          <button type="button" onClick={copyYesterdayRooms} className="w-full flex items-center justify-center gap-2 py-2 text-psu-blue font-black text-[9px] uppercase tracking-widest">
            <Clock size={13} /> {t('ops.laundryShop.copyYesterday')}
          </button>
        )}

        <div className="card !p-0 divide-y divide-psu-gray/5 overflow-hidden">
          {rows.map((row, idx) => {
            const invalid = invalidRowIds.has(row.id);
            const dup = !invalid && row.roomNumber.trim() && duplicateRoomNumbers.has(row.roomNumber.trim().toLowerCase());
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 p-4 active:bg-psu-bg/50 transition-colors"
                onClick={() => { setEditingRoomId(row.id); setShowAllTypes(false); }}
              >
                <span className="text-[10px] font-black text-psu-gray/25 w-4 text-right shrink-0">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <input
                    type="text" value={row.roomNumber} onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateRoomNumber(row.id, e.target.value)}
                    placeholder={t('ops.laundryShop.roomPlaceholder')}
                    className={cn("w-full bg-transparent text-base font-black focus:outline-none", invalid ? "text-psu-rejected" : "text-psu-gray")}
                  />
                  {invalid && <p className="text-[9px] font-bold text-psu-rejected mt-0.5">{t('ops.laundryShop.roomNumberRequired')}</p>}
                  {dup && <p className="text-[9px] font-bold text-psu-warning mt-0.5">{t('ops.laundryShop.duplicateRoomWarning', { room: row.roomNumber.trim() })}</p>}
                </div>
                <span className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest shrink-0">
                  {totalRoomCount(row)} {t('ops.laundryShop.itemsUnit')}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); duplicateRow(row.id); }} className="text-psu-blue/50 p-1.5" aria-label={t('ops.laundryShop.duplicateRoom')}>
                    <Copy size={15} />
                  </button>
                  {rows.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); setRowToDelete(row.id); }} className="text-psu-rejected/50 p-1.5"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button" onClick={addBlankRow}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-psu-gray/20 rounded-2xl text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
        >
          <Plus size={14} /> {t('ops.laundryShop.addRoom')}
        </button>
      </div>

      {/* Desktop: the paper sheet — a real spreadsheet grid, not the
          mobile line list. Sticky room column + header, click/Tab/Enter
          like the book, a totals row at the bottom. */}
      <div className="hidden md:block space-y-2">
        <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest px-1">{t('ops.laundryShop.emptyGridHint')}</p>
        <div className="bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                {laundryTable.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const id = header.column.id;
                      const isRoom = id === 'room';
                      const isGarment = isGarmentColumn(id);
                      const isKeterangan = id === 'keterangan';
                      return (
                        <th
                          key={header.id}
                          style={isGarment ? { height: '92px' } : undefined}
                          className={cn(
                            "bg-psu-bg border-b border-psu-gray/10",
                            isRoom && "sticky left-0 top-0 z-20 border-r px-2 py-2 text-left align-middle text-[9px] font-black text-psu-gray/50 uppercase tracking-widest w-40 min-w-[10rem]",
                            isGarment && "sticky top-0 z-10 px-1 py-2 align-bottom text-[9px] font-black text-psu-gray/50 uppercase w-11 min-w-[2.75rem]",
                            isKeterangan && "sticky top-0 z-10 px-2 py-2 align-middle text-left text-[9px] font-black text-psu-gray/50 uppercase tracking-widest min-w-[140px]",
                            id === 'actions' && "sticky top-0 z-10 w-9",
                          )}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {laundryTable.getRowModel().rows.map(row => {
                  const invalid = invalidRowIds.has(row.original.id);
                  return (
                    <tr key={row.id} className="hover:bg-psu-bg/40 transition-colors">
                      {row.getVisibleCells().map(cell => {
                        const id = cell.column.id;
                        const isRoom = id === 'room';
                        const isGarment = isGarmentColumn(id);
                        const isKeterangan = id === 'keterangan';
                        const isActions = id === 'actions';
                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "border-b",
                              isRoom && cn("sticky left-0 z-10 border-r border-psu-gray/10 px-2 py-1 align-middle", invalid ? "bg-psu-rejected/5" : "bg-white"),
                              isGarment && "border-psu-gray/5 p-0.5 align-middle",
                              isKeterangan && "border-psu-gray/5 px-1 align-middle",
                              isActions && "border-psu-gray/5 px-1 align-middle text-center",
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {laundryTable.getFooterGroups().map(footerGroup => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map(header => {
                      const id = header.column.id;
                      const isRoom = id === 'room';
                      const isGarment = isGarmentColumn(id);
                      return (
                        <td
                          key={header.id}
                          className={cn(
                            "bg-psu-bg border-t border-psu-gray/10",
                            isRoom && "sticky left-0 z-10 border-r px-2 py-2 align-middle text-[9px] font-black uppercase tracking-widest text-psu-gray/50",
                            isGarment && "text-center align-middle text-[10px] font-black text-psu-gray/60 py-2",
                          )}
                        >
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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

      {/* Mobile-only full-screen counter editor. Rendered unconditionally
          (not inside the md:hidden block above) since Modal's backdrop is
          position:fixed — a display:none ancestor would hide it too — and
          it's never triggered from anywhere on desktop, so this simply
          never opens at md+. */}
      <AnimatePresence>
        {editingRoom && (
          <Modal
            size="sm"
            backdropClassName="p-0 sm:p-6"
            boxClassName="w-full h-full sm:h-auto sm:max-h-[85vh] rounded-none sm:rounded-[32px] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 p-5 border-b border-psu-gray/5 shrink-0">
              <div className="min-w-0 flex-1">
                <input
                  type="text" value={editingRoom.roomNumber}
                  onChange={(e) => updateRoomNumber(editingRoom.id, e.target.value)}
                  placeholder={t('ops.laundryShop.roomPlaceholder')}
                  className="w-full bg-transparent text-xl font-black text-psu-gray focus:outline-none"
                />
                <p className="text-[10px] font-black text-psu-gray/30 uppercase tracking-widest mt-0.5">
                  {totalRoomCount(editingRoom)} {t('ops.laundryShop.itemsUnit')}
                </p>
              </div>
              <button onClick={() => setEditingRoomId(null)} className="w-9 h-9 rounded-full bg-psu-bg flex items-center justify-center text-psu-gray/40 shrink-0" aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{t('ops.laundryShop.frequent')}</p>
                {FREQUENT_GARMENT_COLUMNS.map(g => (
                  <GarmentCounter
                    key={g.id} label={g.labelId} title={g.labelEn}
                    value={editingRoom.counts[g.id]}
                    onChange={(v) => updateCount(editingRoom.id, g.id, v)}
                    onBump={(d) => bumpCount(editingRoom.id, g.id, d)}
                  />
                ))}
              </div>

              <button
                type="button" onClick={() => setShowAllTypes(s => !s)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-psu-gray/40 font-black text-[10px] uppercase tracking-widest"
              >
                {showAllTypes ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {t('ops.laundryShop.allTypes')}
              </button>

              {showAllTypes && (
                <div>
                  {OTHER_GARMENT_COLUMNS.map(g => (
                    <GarmentCounter
                      key={g.id} label={g.labelId} title={g.labelEn}
                      value={editingRoom.counts[g.id]}
                      onChange={(v) => updateCount(editingRoom.id, g.id, v)}
                      onBump={(d) => bumpCount(editingRoom.id, g.id, d)}
                    />
                  ))}
                </div>
              )}

              <textarea
                value={editingRoom.keterangan}
                onChange={(e) => updateKeterangan(editingRoom.id, e.target.value)}
                placeholder={t('ops.laundryShop.keteranganPlaceholder')}
                className="w-full p-3 bg-psu-bg border border-psu-gray/10 rounded-xl text-base h-20"
              />
            </div>

            <div className="p-5 border-t border-psu-gray/5 shrink-0">
              <button
                type="button" onClick={() => setEditingRoomId(null)}
                className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
              >
                {t('common.close')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={!!rowToDelete}
        onCancel={() => setRowToDelete(null)}
        onConfirm={() => { removeRow(rowToDelete!); if (editingRoomId === rowToDelete) setEditingRoomId(null); setRowToDelete(null); }}
      />
    </div>
  );
}
