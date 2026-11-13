import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { MissedCheck, Submission } from '../../types';
import { sitesForScope, userCanSeeSite } from '../../lib/siteScope';
import { departmentOf } from '../../data/opsLogsCatalog';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { fetchSubmissionsInRange } from '../../services/exportService';
import { hasProblem } from '../../lib/problemRate';
import { localDateISO } from '../../utils/localDate';
import { cn } from '../../utils/cn';

type Store = ReturnType<typeof useAppStore>;
type Dept = 'HOUSEKEEPING' | 'FOOD_SAFETY';

// Month-by-month trends: how many submissions, what share had a problem
// (lib/problemRate.ts), and how many scheduled checks were missed — overall
// and per site. Loaded on demand (one read of the chosen period), since
// the app only keeps 60 days loaded and a long trend is an occasional look,
// not something every phone needs on every open.

interface MonthStat { month: string; total: number; problems: number; missed: number }

function monthKey(iso: string): string {
  return localDateISO(iso).slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function rateCls(rate: number | null): string {
  if (rate === null) return 'text-psu-gray/20';
  if (rate >= 20) return 'bg-psu-rejected/15 text-psu-rejected';
  if (rate >= 10) return 'bg-amber-100 text-amber-700';
  return 'bg-psu-green/10 text-psu-green';
}

export function TrendsPanel({ store, department }: { store: Store; department?: Dept }) {
  const { t } = useTranslation();
  const { currentUser, sites } = store;
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<{ months: string[]; overall: MonthStat[]; bySite: { siteId: string; name: string; cells: (MonthStat | null)[] }[] } | null>(null);

  if (!currentUser) return null;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const fromISO = start.toISOString();
      const toISO = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
      const scope = sitesForScope(currentUser);

      let subs: Submission[];
      let missed: MissedCheck[] = [];
      if (isFirebaseConfigured && db) {
        subs = (await fetchSubmissionsInRange(scope, fromISO, toISO)).submissions;
        const snap = await getDocs(query(collection(db, 'missedChecks'), where('date', '>=', localDateISO(start))));
        missed = snap.docs.map((d) => ({ ...(d.data() as Omit<MissedCheck, 'id'>), id: d.id }));
      } else {
        subs = store.submissions.filter((s) => s.timestamp >= fromISO);
        missed = store.missedChecks;
      }
      subs = subs.filter((s) => !s.deletedAt && userCanSeeSite(currentUser, s.siteId) && (!department || departmentOf(s) === department));
      missed = missed.filter((m) => userCanSeeSite(currentUser, m.siteId) && (!department || m.department === department));

      const monthKeys = Array.from({ length: months }, (_, i) => localDateISO(new Date(start.getFullYear(), start.getMonth() + i, 1)).slice(0, 7));
      const blank = (month: string): MonthStat => ({ month, total: 0, problems: 0, missed: 0 });
      const overall = new Map(monthKeys.map((k) => [k, blank(k)]));
      const bySite = new Map<string, Map<string, MonthStat>>();
      const cell = (siteId: string, month: string) => {
        if (!bySite.has(siteId)) bySite.set(siteId, new Map());
        const row = bySite.get(siteId)!;
        if (!row.has(month)) row.set(month, blank(month));
        return row.get(month)!;
      };

      for (const s of subs) {
        const k = monthKey(s.timestamp);
        if (!overall.has(k)) continue;
        const bad = hasProblem(s) ? 1 : 0;
        overall.get(k)!.total++; overall.get(k)!.problems += bad;
        const c = cell(s.siteId, k); c.total++; c.problems += bad;
      }
      for (const m of missed) {
        const k = m.date.slice(0, 7);
        if (!overall.has(k) || m.resolvedAt) continue;
        overall.get(k)!.missed++;
        cell(m.siteId, k).missed++;
      }

      setData({
        months: monthKeys,
        overall: monthKeys.map((k) => overall.get(k)!),
        bySite: [...bySite.entries()]
          .map(([siteId, row]) => ({
            siteId,
            name: sites.find((x) => x.id === siteId)?.name || siteId,
            cells: monthKeys.map((k) => row.get(k) || null),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      });
    } catch (err) {
      console.error('Trends load failed:', err);
      setError(t('trends.failed'));
    } finally {
      setLoading(false);
    }
  };

  const rate = (s: MonthStat | null) => (s && s.total > 0 ? Math.round((s.problems / s.total) * 100) : null);

  return (
    <div className="card p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] flex items-center gap-2">
          <TrendingUp size={14} /> {t('trends.title')}
        </h3>
        <div className="flex items-center gap-2">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMonths(n)}
              className={cn('px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest', months === n ? 'bg-psu-gray text-white' : 'bg-white text-psu-gray/40 border border-psu-gray/10')}
            >
              {t('trends.months', { n })}
            </button>
          ))}
          <button type="button" onClick={load} disabled={loading} className="px-4 py-1.5 rounded-full bg-psu-blue text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50">
            {loading ? t('trends.loading') : data ? t('trends.reload') : t('trends.load')}
          </button>
        </div>
      </div>
      <p className="text-xs text-psu-gray/50">{t('trends.hint')}</p>
      {error && <p className="text-xs text-psu-rejected">{error}</p>}

      {data && (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.overall.map((m) => ({ name: monthLabel(m.month), rate: rate(m), missed: m.missed }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="rate" tick={{ fontSize: 10 }} unit="%" width={40} />
                <YAxis yAxisId="missed" orientation="right" tick={{ fontSize: 10 }} width={30} allowDecimals={false} />
                <Tooltip />
                <Line yAxisId="rate" type="monotone" dataKey="rate" name={t('trends.problemRate')} stroke="#E5484D" strokeWidth={2} connectNulls />
                <Line yAxisId="missed" type="monotone" dataKey="missed" name={t('trends.missed')} stroke="#6E7781" strokeWidth={2} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-psu-gray/40">
                  <th className="text-left py-2 pr-3">{t('trends.site')}</th>
                  {data.months.map((k) => <th key={k} className="px-1 py-2 text-center">{monthLabel(k)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-psu-gray/5">
                <tr className="font-black">
                  <td className="py-2 pr-3">{t('trends.allSites')}</td>
                  {data.overall.map((m) => (
                    <td key={m.month} className="px-1 py-1 text-center">
                      <span className={cn('inline-block min-w-[44px] rounded-lg px-1.5 py-1', rateCls(rate(m)))} title={`${m.problems}/${m.total} · ${t('trends.missed')}: ${m.missed}`}>
                        {rate(m) === null ? '—' : `${rate(m)}%`}
                      </span>
                    </td>
                  ))}
                </tr>
                {data.bySite.map((row) => (
                  <tr key={row.siteId}>
                    <td className="py-2 pr-3 font-bold text-psu-gray truncate max-w-[180px]">{row.name}</td>
                    {row.cells.map((c, i) => (
                      <td key={i} className="px-1 py-1 text-center">
                        <span className={cn('inline-block min-w-[44px] rounded-lg px-1.5 py-1', rateCls(rate(c)))} title={c ? `${c.problems}/${c.total} · ${t('trends.missed')}: ${c.missed}` : ''}>
                          {rate(c) === null ? '—' : `${rate(c)}%`}{c && c.missed > 0 ? <sup className="ml-0.5 text-psu-gray/50">{c.missed}</sup> : null}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-psu-gray/40">{t('trends.legend')}</p>
        </>
      )}
    </div>
  );
}
