import { ReactNode } from 'react';
import { cn } from '../utils/cn';

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
export function ListCard<T extends { id: string }>({
  items,
  renderRow,
  rowClassName,
  emptyIcon,
  emptyLabel,
}: {
  items: T[];
  renderRow: (item: T) => ReactNode;
  // Extra classes on a specific row's own padded wrapper — for the rare
  // row that needs to stand out within the list (e.g. a flagged "not
  // ready to work" entry), same as a highlighted table row.
  rowClassName?: (item: T) => string | undefined;
  // Omit both when this list is only ever rendered behind an
  // `items.length > 0` guard (e.g. a "history" section shown only once
  // there's history) — the empty branch is then unreachable, so there's
  // nothing worth asking every caller to fill in just in case.
  emptyIcon?: ReactNode;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10 opacity-40">
        {emptyIcon}
        <p className="text-sm font-bold uppercase tracking-widest mt-2">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="card p-0 divide-y divide-psu-gray/5 overflow-hidden">
      {items.map((item) => (
        <div key={item.id} className={cn("p-4", rowClassName?.(item))}>{renderRow(item)}</div>
      ))}
    </div>
  );
}
