import { ReactNode, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { fetchSubmissionsInRange } from '../../services/exportService';
import { sitesForScope } from '../../lib/siteScope';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { AlertTriangle, AlarmClock, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, ClipboardList, Clock, FileWarning, ListTodo, Timer, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { MissedCheck, Submission } from '../../types';
import { departmentOf, titleKeyForChainType } from '../../data/opsLogsCatalog';
import { userCanSeeSite } from '../../lib/siteScope';
import { hasProblem } from '../../lib/problemRate';
import { chainOf, reviewDepartments, reviewQueueFor } from '../../lib/logLifecycle';
import { localDateISO } from '../../utils/localDate';
import { cn } from '../../utils/cn';

type Store = ReturnType<typeof useAppStore>;
export type DashTarget = 'opslogs' | 'history' | 'checks' | 'reports' | 'actions';
type Period = 1 | 7 | 30;

// Operations dashboard for Admin, Manager / GM and Supervisor / Leadhand —
// the same screen for each, scoped to what that person is responsible for:
// their department(s) (Admin / GM: both) and the sites in their access.
// Every number is defined from real records:
//   • Logs submitted — logs filed in the period.
//   • Problem rate — share of those with a problem (lib/problemRate.ts:
//     out-of-range reading, failed item, or sent back).
//   • Waiting for review — PENDING now; "overdue" = waiting > 24h.
//   • Time to approval — median hours from submitted to the final stamp,
//     for logs approved in the period.
//   • Missed checks — scheduled checks not done on time, in the period.
//   • Open issues / overdue action items — right now.
// KPI deltas compare with the previous period of the same length.
const DAY = 24 * 3600 * 1000;
const OVERDUE_HOURS = 24;

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function approvedAt(s: Submission): string | undefined {
  if (s.status !== 'APPROVED') return undefined;
  const chain = chainOf(s);
  return chain.length ? s.meta?.signoff?.[chain[chain.length - 1]]?.at : undefined;
}

export function OpsDashboard({ store, onNavigate, onlySiteId, onlyDept }: {
  store: Store;
  onNavigate?: (t: DashTarget) => void;
  // Admin's scope filters (site / department) narrow it further.
  onlySiteId?: string;
  onlyDept?: 'HOUSEKEEPING' | 'FOOD_SAFETY';
}) {
  const { t } = useTranslation();
  const { currentUser, submissions, sites, fieldReports, correctiveActions, missedChecks } = store;
  const [period, setPeriod] = useState<Period>(7);
  // The app keeps only a recent window live (lib/dataScope.ts). When the
  // chosen period + the previous one reach further back, fetch just the
  // missing days once (and the missed checks for them) instead of keeping
  // weeks of every site's logs on every phone.
  const [extra, setExtra] = useState<{ subs: Submission[]; missed: MissedCheck[]; truncated: boolean; from: string } | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const needFrom = new Date(todayStart.getTime() - (2 * period - 1) * DAY).toISOString();
    const liveFrom = store.olderHistory.loadedFrom;
    if (needFrom >= liveFrom || (extra && extra.from <= needFrom)) return;
    let alive = true;
    setLoadingExtra(true);
    Promise.all([
      fetchSubmissionsInRange(sitesForScope(currentUser), needFrom, liveFrom),
      getDocs(query(collection(db, 'missedChecks'), where('date', '>=', localDateISO(new Date(needFrom))))),
    ]).then(([r, snap]) => {
      if (!alive) return;
      setExtra({ subs: r.submissions, truncated: r.truncated, from: needFrom,
        missed: snap.docs.map((d) => ({ ...(d.data() as Omit<MissedCheck, 'id'>), id: d.id })) });
    }).catch((err) => console.error('dashboard history fetch failed:', err))
      .finally(() => { if (alive) setLoadingExtra(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, currentUser?.id]);
  const allSubs = useMemo(() => {
    if (!extra) return submissions;
    const byId = new Map<string, Submission>();
    for (const x of extra.subs) byId.set(x.id, x);
    for (const x of submissions) byId.set(x.id, x);
    return Array.from(byId.values());
  }, [submissions, extra]);
  const allMissed = useMemo(() => {
    if (!extra) return missedChecks;
    const byId = new Map<string, MissedCheck>();
    for (const x of extra.missed) byId.set(x.id, x);
    for (const x of missedChecks) byId.set(x.id, x);
    return Array.from(byId.values());
  }, [missedChecks, extra]);

  const d = useMemo(() => {
    const me = currentUser;
    const depts = (me?.role === 'ADMIN' ? ['HOUSEKEEPING', 'FOOD_SAFETY'] : reviewDepartments(me?.role) as string[])
      .filter(x => !onlyDept || x === onlyDept);
    const inScope = (siteId: string, dept?: string) => !!me && userCanSeeSite(me, siteId) && (!onlySiteId || siteId === onlySiteId)
      && !!dept && depts.includes(dept);
    const logs = allSubs.filter(s => !s.deletedAt && inScope(s.siteId, departmentOf(s)));

    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const start = todayStart.getTime() - (period - 1) * DAY;
    const prevStart = start - period * DAY;
    const ts = (s: Submission) => new Date(s.timestamp).getTime();
    const cur = logs.filter(s => ts(s) >= start);
    const prev = logs.filter(s => ts(s) >= prevStart && ts(s) < start);
    const rate = (xs: Submission[]) => xs.length ? (xs.filter(hasProblem).length / xs.length) * 100 : null;

    const pending = logs.filter(s => s.status === 'PENDING');
    const overdue = pending.filter(s => now - ts(s) > OVERDUE_HOURS * 3600 * 1000);
    const mine = reviewQueueFor(me, logs).mine;

    const hours = (xs: Submission[]) => xs.map(s => {
      const a = approvedAt(s);
      return a ? (new Date(a).getTime() - ts(s)) / 3600000 : null;
    }).filter((h): h is number => h !== null && h >= 0);
    const approvedIn = (from: number, to: number) => logs.filter(s => { const a = approvedAt(s); return a && new Date(a).getTime() >= from && new Date(a).getTime() < to; });
    const ttaCur = median(hours(approvedIn(start, now + DAY)));
    const ttaPrev = median(hours(approvedIn(prevStart, start)));

    const fromDate = localDateISO(new Date(start));
    const prevFromDate = localDateISO(new Date(prevStart));
    const missedScoped = allMissed.filter(m => inScope(m.siteId, m.department));
    const missedCur = missedScoped.filter(m => m.date >= fromDate);
    const missedPrev = missedScoped.filter(m => m.date >= prevFromDate && m.date < fromDate);
    const todayISO = localDateISO(new Date());
    const missedToday = missedScoped.filter(m => m.date === todayISO && !m.resolvedAt);

    const openIssues = fieldReports.filter(r => r.status !== 'RESOLVED' && inScope(r.siteId, r.department));
    const unackIssues = openIssues.filter(r => r.status === 'OPEN');
    const overdueActions = correctiveActions.filter(a => a.status === 'OPEN' && a.dueDate < todayISO && inScope(a.siteId, a.department));

    // Daily OK vs problem (always at least the last 7 days, so "Today"
    // still has a shape to compare against).
    const days = Math.max(period, 7);
    const daily = Array.from({ length: days }, (_, i) => {
      const dayStart = todayStart.getTime() - (days - 1 - i) * DAY;
      const xs = logs.filter(s => ts(s) >= dayStart && ts(s) < dayStart + DAY);
      const bad = xs.filter(hasProblem).length;
      return { day: new Date(dayStart).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), ok: xs.length - bad, problem: bad };
    });

    // Per site — worst first; sites with no logs in the period are
    // counted separately (that's a finding too, not a row of zeros).
    const siteIds = Array.from(new Set([...cur.map(s => s.siteId), ...pending.map(s => s.siteId), ...missedCur.map(m => m.siteId)]));
    const bySite = siteIds.map(id => {
      const xs = cur.filter(s => s.siteId === id);
      const last = logs.filter(s => s.siteId === id).sort((a, b) => ts(b) - ts(a))[0];
      return {
        id,
        name: sites.find(x => x.id === id)?.name || xs[0]?.siteName || id,
        logs: xs.length,
        rate: rate(xs),
        pending: pending.filter(s => s.siteId === id).length,
        overdue: overdue.filter(s => s.siteId === id).length,
        missed: missedCur.filter(m => m.siteId === id).length,
        last: last?.timestamp,
      };
    }).sort((a, b) => (b.overdue - a.overdue) || (b.missed - a.missed) || ((b.rate ?? -1) - (a.rate ?? -1)) || (b.logs - a.logs));
    const scopedSites = sites.filter(x => me && userCanSeeSite(me, x.id) && (!onlySiteId || x.id === onlySiteId) && !x.id.startsWith('site-main'));
    const silentSites = scopedSites.filter(x => !cur.some(s => s.siteId === x.id));

    // Per form type.
    const types = Array.from(new Set(cur.map(s => s.type)));
    const byForm = types.map(type => {
      const xs = cur.filter(s => s.type === type);
      return { type, logs: xs.length, rate: rate(xs), pending: pending.filter(s => s.type === type).length };
    }).sort((a, b) => b.logs - a.logs);

    const problemsToday = logs.filter(s => ts(s) >= todayStart.getTime() && hasProblem(s)).sort((a, b) => ts(b) - ts(a));

    return {
      cur: cur.length, prev: prev.length, rateCur: rate(cur), ratePrev: rate(prev),
      pending: pending.length, overdue: overdue.length, mine: mine.length,
      ttaCur, ttaPrev, missedCur: missedCur.length, missedPrev: missedPrev.length, missedToday: missedToday.length,
      openIssues: openIssues.length, unackIssues: unackIssues.length, overdueActions: overdueActions.length,
      daily, bySite, silentSites, byForm, problemsToday,
    };
  }, [currentUser, allSubs, sites, fieldReports, correctiveActions, allMissed, period, onlySiteId, onlyDept]);

  const fmtH = (h: number | null) => h === null ? '—' : h < 1 ? `${Math.round(h * 60)}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;
  const pct = (r: number | null) => r === null ? '—' : `${Math.round(r)}%`;
  const formName = (type: Submission['type']) => { const k = titleKeyForChainType(type); return k ? t(k) : type; };
  const periodLabel = period === 1 ? t('dash.today') : t('dash.lastNDays', { n: period });

  const attention: { key: string; icon: ReactNode; text: string; target: DashTarget; tone: 'red' | 'amber' }[] = [];
  if (d.overdue) attention.push({ key: 'od', icon: <Clock size={16} />, text: t('dash.att.overdue', { count: d.overdue, h: OVERDUE_HOURS }), target: 'opslogs', tone: 'red' });
  if (d.mine) attention.push({ key: 'mine', icon: <ClipboardList size={16} />, text: t('dash.att.mine', { count: d.mine }), target: 'opslogs', tone: 'amber' });
  if (d.problemsToday.length) attention.push({ key: 'pt', icon: <AlertTriangle size={16} />, text: t('dash.att.problemsToday', { count: d.problemsToday.length }), target: 'history', tone: 'red' });
  if (d.missedToday) attention.push({ key: 'mt', icon: <AlarmClock size={16} />, text: t('dash.att.missedToday', { count: d.missedToday }), target: 'checks', tone: 'red' });
  if (d.unackIssues) attention.push({ key: 'ui', icon: <FileWarning size={16} />, text: t('dash.att.issues', { count: d.unackIssues }), target: 'reports', tone: 'amber' });
  if (d.overdueActions) attention.push({ key: 'oa', icon: <ListTodo size={16} />, text: t('dash.att.actions', { count: d.overdueActions }), target: 'actions', tone: 'amber' });

  return (
    <div className="space-y-6">
      {/* Period */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-bold text-psu-gray/50">
          {t('dash.scope', { period: periodLabel })}
          {loadingExtra && <span className="ml-2 text-psu-blue">· {t('dash.loading')}</span>}
          {extra?.truncated && <span className="ml-2 text-amber-700">· {t('dash.truncated')}</span>}
        </p>
        <div className="flex bg-white rounded-xl p-1 border border-psu-gray/10">
          {([1, 7, 30] as Period[]).map(p => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest', period === p ? 'bg-psu-gray text-white' : 'text-psu-gray/50')}>
              {p === 1 ? t('dash.today') : t('dash.nDays', { n: p })}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<ClipboardList size={16} />} label={t('dash.kpi.logs')} value={String(d.cur)} delta={delta(d.cur, d.prev)} goodWhen="up" hint={t('dash.kpi.logsHint')} />
        <Kpi icon={<AlertTriangle size={16} />} label={t('dash.kpi.problemRate')} value={pct(d.rateCur)}
          delta={d.rateCur !== null && d.ratePrev !== null ? { diff: d.rateCur - d.ratePrev, text: `${d.rateCur - d.ratePrev >= 0 ? '+' : ''}${Math.round(d.rateCur - d.ratePrev)} pts` } : null}
          goodWhen="down" hint={t('dash.kpi.problemHint')} tone={d.rateCur !== null && d.rateCur >= 20 ? 'red' : d.rateCur !== null && d.rateCur >= 10 ? 'amber' : undefined} />
        <Kpi icon={<Clock size={16} />} label={t('dash.kpi.waiting')} value={String(d.pending)}
          sub={d.overdue ? t('dash.kpi.overdueSub', { count: d.overdue }) : t('dash.kpi.noneOverdue')} tone={d.overdue ? 'red' : undefined}
          onClick={onNavigate ? () => onNavigate('opslogs') : undefined} />
        <Kpi icon={<Timer size={16} />} label={t('dash.kpi.tta')} value={fmtH(d.ttaCur)}
          delta={d.ttaCur !== null && d.ttaPrev !== null ? { diff: d.ttaCur - d.ttaPrev, text: `${d.ttaCur - d.ttaPrev >= 0 ? '+' : '−'}${fmtH(Math.abs(d.ttaCur - d.ttaPrev))}` } : null}
          goodWhen="down" hint={t('dash.kpi.ttaHint')} />
        <Kpi icon={<AlarmClock size={16} />} label={t('dash.kpi.missed')} value={String(d.missedCur)} delta={delta(d.missedCur, d.missedPrev)} goodWhen="down"
          tone={d.missedCur ? 'amber' : undefined} onClick={onNavigate ? () => onNavigate('checks') : undefined} />
        <Kpi icon={<FileWarning size={16} />} label={t('dash.kpi.openIssues')} value={String(d.openIssues)}
          sub={t('dash.kpi.overdueActions', { count: d.overdueActions })} tone={d.overdueActions ? 'amber' : undefined}
          onClick={onNavigate ? () => onNavigate('reports') : undefined} />
      </div>

      {/* Attention */}
      <div className={cn('rounded-2xl border p-4 space-y-2', attention.length ? 'bg-psu-rejected/5 border-psu-rejected/15' : 'bg-psu-green/5 border-psu-green/15')}>
        <p className={cn('text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5', attention.length ? 'text-psu-rejected' : 'text-psu-green')}>
          {attention.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {attention.length ? t('dash.attentionTitle') : t('dash.allGood')}
        </p>
        {attention.map(a => (
          <button key={a.key} type="button" disabled={!onNavigate} onClick={() => onNavigate?.(a.target)}
            className="w-full flex items-center gap-3 bg-white rounded-xl px-3 py-3 border border-psu-gray/5 text-left hover:bg-psu-bg disabled:cursor-default">
            <span className={a.tone === 'red' ? 'text-psu-rejected' : 'text-amber-600'}>{a.icon}</span>
            <span className="flex-1 text-xs font-bold text-psu-gray">{a.text}</span>
            {onNavigate && <ChevronRight size={16} className="text-psu-gray/30" />}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Daily chart */}
        <div className="card !p-4 md:!p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={14} /> {t('dash.chartTitle')}</h3>
            <span className="text-[10px] font-bold text-psu-gray/30">{t('dash.lastNDays', { n: d.daily.length })}</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.daily} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eef0f2" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9aa3ad' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9aa3ad' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ok" name={t('dash.okLogs')} stackId="a" fill="#8BC53F" radius={[0, 0, 0, 0]} />
                <Bar dataKey="problem" name={t('dash.problemLogs')} stackId="a" fill="#E5484D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By form */}
        <div className="card !p-4 md:!p-6 lg:col-span-2">
          <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-3">{t('dash.byForm')}</h3>
          {d.byForm.length === 0 ? <p className="text-xs text-psu-gray/40">{t('dash.noLogs')}</p> : (
            <table className="w-full text-xs">
              <thead><tr className="text-[9px] font-black uppercase tracking-widest text-psu-gray/40 text-left">
                <th className="py-1.5">{t('dash.col.form')}</th><th className="text-right pl-2">{t('dash.col.logs')}</th><th className="text-right pl-2">{t('dash.col.problems')}</th><th className="text-right pl-2">{t('dash.col.waiting')}</th>
              </tr></thead>
              <tbody className="divide-y divide-psu-gray/5">
                {d.byForm.map(f => (
                  <tr key={f.type}>
                    <td className="py-2 pr-2 font-bold text-psu-gray">{formName(f.type)}</td>
                    <td className="text-right tabular-nums pl-2">{f.logs}</td>
                    <td className="text-right pl-2"><RateChip r={f.rate} /></td>
                    <td className="text-right tabular-nums pl-2">{f.pending || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* By site */}
      <div className="card !p-4 md:!p-6">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('dash.bySite')}</h3>
          {d.silentSites.length > 0 && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg" title={d.silentSites.map(s => s.name).join(', ')}>
              {t('dash.silentSites', { count: d.silentSites.length, period: periodLabel })}
            </span>
          )}
        </div>
        {d.bySite.length === 0 ? <p className="text-xs text-psu-gray/40">{t('dash.noLogs')}</p> : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[520px]">
              <thead><tr className="text-[9px] font-black uppercase tracking-widest text-psu-gray/40 text-left">
                <th className="py-1.5 px-1">{t('dash.col.site')}</th>
                <th className="text-right px-1">{t('dash.col.logs')}</th>
                <th className="text-right px-1">{t('dash.col.problems')}</th>
                <th className="text-right px-1">{t('dash.col.waiting')}</th>
                <th className="text-right px-1">{t('dash.col.missed')}</th>
                <th className="text-right px-1">{t('dash.col.last')}</th>
              </tr></thead>
              <tbody className="divide-y divide-psu-gray/5">
                {d.bySite.map(s => (
                  <tr key={s.id}>
                    <td className="py-2 px-1 font-bold text-psu-gray">{s.name}</td>
                    <td className="text-right tabular-nums px-1">{s.logs}</td>
                    <td className="text-right px-1"><RateChip r={s.rate} /></td>
                    <td className={cn('text-right tabular-nums px-1', s.overdue && 'text-psu-rejected font-black')}>{s.pending ? `${s.pending}${s.overdue ? ` (${s.overdue} ${t('dash.late')})` : ''}` : '—'}</td>
                    <td className={cn('text-right tabular-nums px-1', s.missed && 'text-amber-700 font-black')}>{s.missed || '—'}</td>
                    <td className="text-right px-1 text-psu-gray/50">{s.last ? new Date(s.last).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function delta(cur: number, prev: number): { diff: number; text: string } | null {
  if (!prev && !cur) return null;
  if (!prev) return { diff: cur, text: `+${cur}` };
  const p = Math.round(((cur - prev) / prev) * 100);
  return { diff: cur - prev, text: `${p >= 0 ? '+' : ''}${p}%` };
}

function Kpi({ icon, label, value, sub, delta: dl, goodWhen, hint, tone, onClick }: {
  icon: ReactNode; label: string; value: string; sub?: string; delta?: { diff: number; text: string } | null;
  goodWhen?: 'up' | 'down'; hint?: string; tone?: 'red' | 'amber'; onClick?: () => void;
}) {
  const { t } = useTranslation();
  const good = dl && dl.diff !== 0 ? (goodWhen === 'up' ? dl.diff > 0 : dl.diff < 0) : null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} title={hint}
      className={cn('bg-white rounded-2xl p-4 border text-left', tone === 'red' ? 'border-psu-rejected/30' : tone === 'amber' ? 'border-amber-300/60' : 'border-psu-gray/10', onClick && 'hover:bg-psu-bg active:scale-[0.98] transition-all')}>
      <p className="text-[9px] font-black uppercase tracking-widest text-psu-gray/40 flex items-center gap-1.5">
        <span className={tone === 'red' ? 'text-psu-rejected' : tone === 'amber' ? 'text-amber-600' : 'text-psu-blue'}>{icon}</span>{label}
      </p>
      <p className={cn('text-2xl font-black mt-2 tabular-nums', tone === 'red' ? 'text-psu-rejected' : 'text-psu-gray')}>{value}</p>
      <div className="mt-1 min-h-[16px] text-[10px] font-bold">
        {dl ? (
          <span className={cn('inline-flex items-center gap-0.5', good === null ? 'text-psu-gray/40' : good ? 'text-psu-green' : 'text-psu-rejected')}>
            {dl.diff > 0 ? <ArrowUpRight size={12} /> : dl.diff < 0 ? <ArrowDownRight size={12} /> : null}{dl.text} <span className="text-psu-gray/30 font-medium">{t('dash.vsPrev')}</span>
          </span>
        ) : sub ? <span className="text-psu-gray/50">{sub}</span> : null}
      </div>
    </Tag>
  );
}

function RateChip({ r }: { r: number | null }) {
  if (r === null) return <span className="text-psu-gray/30">—</span>;
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded-md font-black tabular-nums',
      r >= 20 ? 'bg-psu-rejected/10 text-psu-rejected' : r >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-psu-green/10 text-psu-green')}>
      {Math.round(r)}%
    </span>
  );
}
