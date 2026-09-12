import { useMemo, useState, ReactNode } from 'react';
import { Search, Calendar } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { cn } from '../utils/cn';
import { Submission } from '../types';

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

const PRESETS: { id: DatePreset; labelKey: string }[] = [
  { id: 'all', labelKey: 'history.filterAll' },
  { id: 'today', labelKey: 'history.filterToday' },
  { id: '7d', labelKey: 'history.filter7d' },
  { id: '30d', labelKey: 'history.filter30d' },
  { id: 'custom', labelKey: 'history.filterCustom' },
];

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

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
  const [preset, setPreset] = useState<DatePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return submissions.filter((s) => {
      if (q && !searchHaystack(s).includes(q)) return false;
      if (preset === 'all') return true;
      const ts = new Date(s.timestamp);
      if (preset === 'today') return isSameLocalDay(ts, now);
      if (preset === '7d') return now.getTime() - ts.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (preset === '30d') return now.getTime() - ts.getTime() <= 30 * 24 * 60 * 60 * 1000;
      // custom: an empty from/to side leaves that side unbounded.
      if (from && ts < new Date(from)) return false;
      if (to && ts.getTime() > new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [submissions, search, preset, from, to]);

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

      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
              preset === p.id ? "bg-psu-gray text-white" : "bg-white text-psu-gray/40 border border-psu-gray/10"
            )}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-psu-gray/30 shrink-0" />
          <label className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest shrink-0">{t('history.fromLabel')}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
          />
          <label className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest shrink-0">{t('history.toLabel')}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-psu-gray/10 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20"
          />
        </div>
      )}

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
