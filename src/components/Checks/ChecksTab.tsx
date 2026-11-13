import { useEffect, useMemo, useState } from 'react';
import { AlarmClockOff, CheckCircle2, Clock, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { CheckSchedule, MissedCheck, Submission } from '../../types';
import { userCanSeeSite } from '../../lib/siteScope';
import { OPS_LOG_DEFS, departmentOf, titleKeyForChainType } from '../../data/opsLogsCatalog';
import { TEMP_CONTROL_ASSETS, TEMP_CONTROL_SLOTS } from '../../data/tempControlAssets';
import { DISHWASH_LOCATIONS, DISHWASH_ROUNDS } from '../../data/dishwashData';
import { RESTROOM_SLOTS } from '../../data/restroomData';
import { SiteOptions } from '../SiteOptions';
import { localDateISO } from '../../utils/localDate';
import { isFirebaseConfigured } from '../../lib/firebase';
import { cn } from '../../utils/cn';

type Store = ReturnType<typeof useAppStore>;
type Dept = 'HOUSEKEEPING' | 'FOOD_SAFETY';

// Missed-check alerts — see functions/src/missedChecks.ts for how a miss
// is detected. This file is the two screens around it: the list of
// what's been missed (everyone who reviews a site) and the schedule
// editor (Admins and Managers).

// Opens the Checks view when a missed-check push notification is tapped
// (public/sw.js posts OPEN_CHECKS, or the app is opened at /?tab=checks).
export function useOpenChecksSignal(open: () => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'checks') {
      open();
      params.delete('tab');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }
    const onMessage = (e: MessageEvent) => { if (e.data?.type === 'OPEN_CHECKS') open(); };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function slotLabel(slot: string): string {
  if (slot.includes(':')) return slot;
  return slot === '24' ? '24:00' : `${slot.padStart(2, '0')}:00`;
}

// The forms a schedule can be set for, with the slot keys a slotted form
// uses on paper (anything else takes plain HH:MM due times).
const SLOTTED: Partial<Record<Submission['type'], readonly string[]>> = {
  TEMP_CONTROL: TEMP_CONTROL_SLOTS,
  DISHWASH_TEMP: DISHWASH_ROUNDS,
  RESTROOM: RESTROOM_SLOTS,
};
const SCHEDULABLE_TYPES: Submission['type'][] = [
  ...OPS_LOG_DEFS.map((d) => d.type),
  'FOOD_SAFETY',
  'HOUSEKEEPING',
];

function useVisibleMisses(store: Store, department?: Dept): MissedCheck[] {
  const { currentUser, missedChecks } = store;
  return useMemo(
    () => missedChecks
      .filter((m) => userCanSeeSite(currentUser, m.siteId) && (!department || m.department === department))
      .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1)),
    [missedChecks, currentUser, department]
  );
}

// Compact card for the top of a review screen. Renders nothing when
// there's nothing open today, so it never takes space for no reason.
export function MissedChecksBanner({ store, department, onOpen }: { store: Store; department?: Dept; onOpen?: () => void }) {
  const { t } = useTranslation();
  const today = localDateISO();
  const open = useVisibleMisses(store, department).filter((m) => m.date === today && !m.resolvedAt);
  if (open.length === 0) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left card border border-psu-rejected/20 bg-psu-rejected/5 flex items-start gap-3"
    >
      <AlarmClockOff size={20} className="text-psu-rejected shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-psu-rejected">
          {t('checks.missedToday')} · {open.length}
        </p>
        <p className="text-xs text-psu-gray/70 mt-1 truncate">
          {open.slice(0, 3).map((m) => `${m.siteName} · ${m.label} · ${slotLabel(m.slot)}`).join('  •  ')}
          {open.length > 3 ? `  +${open.length - 3}` : ''}
        </p>
      </div>
    </button>
  );
}

function MissRow({ m }: { m: MissedCheck; key?: string }) {
  const { t } = useTranslation();
  const late = !!m.resolvedAt;
  return (
    <div className="p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h4 className={cn('text-sm font-bold truncate', late ? 'text-psu-gray/50' : 'text-psu-gray')}>{m.label}</h4>
        <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
          {m.siteName} • {m.date} • {t('checks.due', { time: slotLabel(m.slot) })}
        </p>
      </div>
      {late ? (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-gray/50 bg-psu-bg px-2 py-1 rounded-full shrink-0">
          <CheckCircle2 size={11} /> {t('checks.doneLate')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-psu-rejected bg-psu-rejected/10 px-2 py-1 rounded-full shrink-0">
          <Clock size={11} /> {slotLabel(m.slot)}
        </span>
      )}
    </div>
  );
}

export function MissedChecksList({ store, department }: { store: Store; department?: Dept }) {
  const { t } = useTranslation();
  const today = localDateISO();
  const misses = useVisibleMisses(store, department);
  const todays = misses.filter((m) => m.date === today);
  const earlier = misses.filter((m) => m.date !== today);
  const hasSchedules = store.checkSchedules.some((c) => userCanSeeSite(store.currentUser, c.siteId) && (!department || c.department === department));

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-[0.2em] px-1">{t('checks.missedTitle')}</h3>
      {todays.length > 0 ? (
        <div className="card p-0 divide-y divide-psu-gray/5 overflow-hidden">{todays.map((m) => <MissRow key={m.id} m={m} />)}</div>
      ) : (
        <div className="card flex items-center gap-3 text-psu-gray/50">
          <CheckCircle2 size={18} className="text-psu-green" />
          <span className="text-xs font-bold">{hasSchedules ? t('checks.allOnTime') : t('checks.noSchedules')}</span>
        </div>
      )}
      {earlier.length > 0 && (
        <>
          <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] px-1 pt-2">{t('checks.lastDays')}</h3>
          <div className="card p-0 divide-y divide-psu-gray/5 overflow-hidden">{earlier.map((m) => <MissRow key={m.id} m={m} />)}</div>
        </>
      )}
    </div>
  );
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const inputCls = 'w-full px-3 py-2.5 bg-white border border-psu-gray/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20';
const labelCls = 'text-[10px] font-black text-psu-gray/40 uppercase tracking-widest';

function ScheduleForm({ store, onDone }: { store: Store; onDone: () => void }) {
  const { t } = useTranslation();
  const { currentUser, sites } = store;
  const mySites = sites.filter((s) => userCanSeeSite(currentUser, s.id));
  const [siteId, setSiteId] = useState(mySites[0]?.id || '');
  const [type, setType] = useState<Submission['type']>('TEMP_CONTROL');
  const [assetId, setAssetId] = useState('');
  const [section, setSection] = useState('');
  const [slots, setSlots] = useState<string[]>([...(SLOTTED.TEMP_CONTROL || [])]);
  const [timesText, setTimesText] = useState('10:00');
  const [grace, setGrace] = useState(60);
  const [days, setDays] = useState<number[]>([]);

  const slotted = SLOTTED[type];
  const assets = type === 'TEMP_CONTROL'
    ? TEMP_CONTROL_ASSETS.filter((a) => a.siteId === siteId)
    : type === 'DISHWASH_TEMP' ? DISHWASH_LOCATIONS.filter((l) => l.siteId === siteId) : [];

  const changeType = (next: Submission['type']) => {
    setType(next);
    setAssetId('');
    setSlots([...(SLOTTED[next] || [])]);
  };

  const parsedTimes = timesText.split(',').map((x) => x.trim()).filter((x) => /^\d{1,2}:\d{2}$/.test(x))
    .map((x) => x.padStart(5, '0'));
  const finalSlots = slotted ? slots : parsedTimes;
  const department = departmentOf({ type, role: currentUser!.role }) as Dept | undefined;
  const formName = (() => { const k = titleKeyForChainType(type); return k ? t(k) : type; })();
  const canSave = !!siteId && finalSlots.length > 0 && !!department && (type !== 'RESTROOM' || section.trim().length > 0);

  const save = (perAsset: boolean) => {
    if (!canSave || !department) return;
    const site = sites.find((s) => s.id === siteId);
    const targets = perAsset && assets.length > 0 ? assets.map((a) => ({ id: a.id, name: a.name })) : [assets.find((a) => a.id === assetId)].filter(Boolean).map((a) => ({ id: a!.id, name: a!.name }));
    const base = {
      siteId, siteName: site?.name || siteId, type, department,
      slots: [...finalSlots], graceMinutes: Math.max(0, Math.round(grace)) || 0,
      days: days.length > 0 && days.length < 7 ? [...days].sort() : [],
      active: true,
    };
    if (targets.length === 0) {
      store.addCheckSchedule({ ...base, label: type === 'RESTROOM' ? `${formName} · ${section.trim().toUpperCase()}` : formName, ...(type === 'RESTROOM' ? { section: section.trim().toUpperCase() } : {}) });
    } else {
      targets.forEach((a) => store.addCheckSchedule({ ...base, assetId: a.id, label: `${formName} · ${a.name}` }));
    }
    onDone();
  };

  return (
    <div className="card space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={labelCls}>{t('checks.site')}</span>
          <select className={inputCls} value={siteId} onChange={(e) => { setSiteId(e.target.value); setAssetId(''); }}>
            <SiteOptions sites={mySites} />
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>{t('checks.form')}</span>
          <select className={inputCls} value={type} onChange={(e) => changeType(e.target.value as Submission['type'])}>
            {SCHEDULABLE_TYPES.map((ty) => { const k = titleKeyForChainType(ty); return <option key={ty} value={ty}>{k ? t(k) : ty}</option>; })}
          </select>
        </label>
        {assets.length > 0 && (
          <label className="space-y-1">
            <span className={labelCls}>{t('checks.asset')}</span>
            <select className={inputCls} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">—</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        )}
        {type === 'RESTROOM' && (
          <label className="space-y-1">
            <span className={labelCls}>{t('checks.section')}</span>
            <input className={inputCls} value={section} onChange={(e) => setSection(e.target.value)} placeholder="F" />
          </label>
        )}
      </div>

      <div className="space-y-1">
        <span className={labelCls}>{t('checks.times')}</span>
        {slotted ? (
          <div className="flex flex-wrap gap-2">
            {slotted.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                className={cn('px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest', slots.includes(s) ? 'bg-psu-gray text-white' : 'bg-white text-psu-gray/40 border border-psu-gray/10')}
              >
                {slotLabel(s)}
              </button>
            ))}
          </div>
        ) : (
          <>
            <input className={inputCls} value={timesText} onChange={(e) => setTimesText(e.target.value)} />
            <p className="text-[10px] text-psu-gray/40">{t('checks.timesHint')}</p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={labelCls}>{t('checks.grace')}</span>
          <input type="number" min={0} max={720} className={inputCls} value={grace} onChange={(e) => setGrace(Number(e.target.value))} />
        </label>
        <div className="space-y-1">
          <span className={labelCls}>{t('checks.days')}</span>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
                className={cn('w-8 h-8 rounded-full text-[10px] font-black', days.length === 0 || days.includes(i) ? 'bg-psu-gray text-white' : 'bg-white text-psu-gray/40 border border-psu-gray/10')}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-psu-gray/40">{days.length === 0 || days.length === 7 ? t('checks.everyDay') : ''}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onDone} className="px-4 py-2 rounded-xl text-xs font-bold text-psu-gray/60">{t('checks.cancel')}</button>
        {assets.length > 1 && !assetId && (
          <button type="button" disabled={!canSave} onClick={() => save(true)} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-psu-gray/10 disabled:opacity-40">
            {t('checks.allAssets')}
          </button>
        )}
        <button type="button" disabled={!canSave} onClick={() => save(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-psu-gray text-white disabled:opacity-40">
          {t('checks.save')}
        </button>
      </div>
    </div>
  );
}

export function CheckSchedulePanel({ store }: { store: Store }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const schedules: CheckSchedule[] = store.checkSchedules
    .filter((c) => userCanSeeSite(store.currentUser, c.siteId))
    .sort((a, b) => a.siteName.localeCompare(b.siteName) || a.label.localeCompare(b.label));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-[0.2em]">{t('checks.scheduleTitle')}</h3>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-psu-gray text-white text-[10px] font-black uppercase tracking-widest">
            <Plus size={12} /> {t('checks.addSchedule')}
          </button>
        )}
      </div>
      <p className="text-xs text-psu-gray/50 px-1">{t('checks.scheduleHint')}</p>
      {!isFirebaseConfigured && <p className="text-[10px] text-psu-gray/40 px-1">{t('checks.demoNote')}</p>}
      {adding && <ScheduleForm store={store} onDone={() => setAdding(false)} />}
      {schedules.length > 0 && (
        <div className="card p-0 divide-y divide-psu-gray/5 overflow-hidden">
          {schedules.map((c) => (
            <div key={c.id} className={cn('p-4 flex items-center justify-between gap-3', !c.active && 'opacity-50')}>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-psu-gray break-words">{c.label}</h4>
                <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5 truncate">
                  {c.siteName} • {c.slots.map(slotLabel).join(', ')}
                  {c.days && c.days.length > 0 ? ` • ${c.days.map((d) => DAY_LABELS[d]).join('')}` : ''}
                  {` • +${c.graceMinutes}m`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => store.updateCheckSchedule(c.id, { active: !c.active })}
                  aria-label={c.active ? t('checks.pause') : t('checks.resume')}
                  className="p-2 rounded-xl text-psu-gray/50 hover:text-psu-gray"
                >
                  {c.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => { if (window.confirm(`${t('checks.delete')}: ${c.label}?`)) store.deleteCheckSchedule(c.id); }}
                  aria-label={t('checks.delete')}
                  className="p-2 rounded-xl text-psu-rejected/60 hover:text-psu-rejected"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// The full Checks tab: what was missed, plus the schedule editor for
// those who can change it.
export function ChecksTab({ store, department, canEdit }: { store: Store; department?: Dept; canEdit: boolean }) {
  return (
    <div className="space-y-8">
      <MissedChecksList store={store} department={department} />
      {canEdit && <CheckSchedulePanel store={store} />}
    </div>
  );
}
