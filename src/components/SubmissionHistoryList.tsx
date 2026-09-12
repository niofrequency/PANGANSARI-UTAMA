import { useMemo, useState, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { Submission } from '../types';
import { useDateFilter } from '../hooks/useDateFilter';
import { DateFilterBar } from './DateFilterBar';

// Everything a submission carries that a person filing/reviewing dozens of
// these might actually search for — room/barak (Room Cleaning), staff
// name, site, form type, and the short ID shown in every history card.
// One free-text box against all of these beats separate "search by room"
// / "search by name" fields: the person doesn't have to know which box a
// term belongs in.
function searchHaystack(s: Submission): string {
  return [
    s.userName,
    s.siteName,
    s.type,
    s.id,
    s.meta?.roomId,
    s.meta?.barak,
    s.meta?.areaAudited,
    s.meta?.section,
  ].filter(Boolean).join(' ').toLowerCase();
}

// Shared list + search + date-filter shell for every "my submissions"
// history screen (Housekeeper/Technician/Laundry Staff/Janitor portals'
// own History tab, Inspections' own filed-audits history) — replaces the
// old 2-column grid of individually-shadowed cards with one continuous,
// divided list, since a filer builds up months of entries here and a grid
// of full-size cards runs out of room fast. Each caller supplies its own
// row content via `renderRow` (icon, title line, status badge, any
// REJECTED "fix & resubmit" block) — this component only owns the
// filtering chrome and the list container around it.
export function SubmissionHistoryList<T extends Submission>({
  submissions,
  renderRow,
  emptyIcon,
  emptyLabel,
}: {
  submissions: T[];
  renderRow: (s: T) => ReactNode;
  emptyIcon: ReactNode;
  emptyLabel: string;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { preset, setPreset, from, setFrom, to, setTo, matches } = useDateFilter();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (q && !searchHaystack(s).includes(q)) return false;
      return matches(s.timestamp);
    });
  }, [submissions, search, matches]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-psu-gray/20" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('history.searchPlaceholder')}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
        />
      </div>

      <DateFilterBar preset={preset} setPreset={setPreset} from={from} setFrom={setFrom} to={to} setTo={setTo} />

      {filtered.length > 0 ? (
        <div className="card p-0 divide-y divide-psu-gray/5 overflow-hidden">
          {filtered.map((s) => (
            <div key={s.id} className="p-4">{renderRow(s)}</div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 opacity-40">
          {emptyIcon}
          <p className="text-sm font-bold uppercase tracking-widest mt-2">
            {submissions.length === 0 ? emptyLabel : t('history.noResults')}
          </p>
        </div>
      )}
    </div>
  );
}
