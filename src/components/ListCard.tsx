import { ReactNode } from 'react';
import { cn } from '../utils/cn';

// One column of the optional md+ table view — see desktopColumns below.
export interface ListCardColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
  // CSS grid track size for this column — '1fr', '2fr', a fixed 'px'/
  // 'rem' value, whatever grid-template-columns accepts. Defaults to
  // '1fr' (all columns equal) when omitted.
  width?: string;
  // Extra classes on this column's cell (both header and body) — e.g.
  // 'text-right' for a numeric/status column, 'w-24 shrink-0' isn't
  // needed since width above already sizes the track.
  className?: string;
}

// Shared list container for every "here's a growing collection of things"
// screen that used to be a grid of individually-shadowed cards (queues,
// open items, activity feeds, staff rosters) — the same crowding problem
// SubmissionHistoryList.tsx already solved for the History screens, minus
// the search/date filtering those need and this doesn't: these are mostly
// short "what needs my attention now" queues, not long-term archives, so
// a plain list is enough here.
//
// Deliberately generic (not Submission-specific) — it backs queues of
// Submissions, CorrectiveActions, FieldReports, and Users alike. Each
// caller supplies its own row content via `renderRow`; this component
// only owns the list container and the empty state.
//
// `desktopColumns` is optional and purely additive (see
// PSU_Desktop_PC_Layout_PRD.md's "Queues and history" density rule): pass
// it and md+ renders the SAME items as a compact table instead of the
// mobile card list — renderRow above still controls everything below md,
// untouched. Omit it (every caller before this existed, and every
// worker-facing list that should stay simple, like MyActionItems/
// MyFieldReports/worker History) and nothing changes at any width.
export function ListCard<T extends { id: string }>({
  items,
  renderRow,
  rowClassName,
  emptyIcon,
  emptyLabel,
  desktopColumns,
  onRowClick,
}: {
  items: T[];
  renderRow: (item: T) => ReactNode;
  // Extra classes on a specific row's own padded wrapper — for the rare
  // row that needs to stand out within the list (e.g. a flagged "not
  // ready to work" entry), same as a highlighted table row. Applied to
  // both the mobile card and the desktop table row when both render.
  rowClassName?: (item: T) => string | undefined;
  // Omit both when this list is only ever rendered behind an
  // `items.length > 0` guard (e.g. a "history" section shown only once
  // there's history) — the empty branch is then unreachable, so there's
  // nothing worth asking every caller to fill in just in case.
  emptyIcon?: ReactNode;
  emptyLabel?: string;
  desktopColumns?: ListCardColumn<T>[];
  // Whole-row click for the desktop table — renderRow's own onClick
  // (baked into whatever JSX it returns) isn't reusable here since a
  // table row is built from desktopColumns' render() output instead.
  // Ignored when desktopColumns is omitted.
  onRowClick?: (item: T) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 opacity-40">
        {emptyIcon}
        <p className="text-sm font-bold uppercase tracking-widest mt-2">{emptyLabel}</p>
      </div>
    );
  }

  const gridTemplateColumns = desktopColumns?.map(c => c.width ?? '1fr').join(' ');

  return (
    <>
      <div className={cn("card p-0 divide-y divide-psu-gray/5 overflow-hidden", desktopColumns && "md:hidden")}>
        {items.map((item) => (
          <div key={item.id} className={cn("p-4", rowClassName?.(item))}>{renderRow(item)}</div>
        ))}
      </div>

      {desktopColumns && (
        <div className="hidden md:block bg-white rounded-xl border border-psu-gray/10 overflow-hidden">
          <div
            className="grid gap-4 px-4 py-2.5 border-b border-psu-gray/10 bg-psu-bg/50"
            style={{ gridTemplateColumns }}
          >
            {desktopColumns.map((col, i) => (
              <div key={i} className={cn("text-[9px] font-black text-psu-gray/40 uppercase tracking-widest", col.className)}>
                {col.header}
              </div>
            ))}
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onRowClick?.(item)}
              style={{ gridTemplateColumns }}
              className={cn(
                "grid gap-4 px-4 py-2.5 items-center border-b border-psu-gray/5 last:border-0 hover:bg-psu-bg/50 transition-colors",
                onRowClick && "cursor-pointer",
                rowClassName?.(item)
              )}
            >
              {desktopColumns.map((col, i) => (
                <div key={i} className={cn("text-xs font-medium text-psu-gray min-w-0 truncate", col.className)}>
                  {col.render(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
