import { Calendar } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { cn } from '../utils/cn';
import { DatePreset } from '../hooks/useDateFilter';

const PRESETS: { id: DatePreset; labelKey: string }[] = [
  { id: 'all', labelKey: 'history.filterAll' },
  { id: 'today', labelKey: 'history.filterToday' },
  { id: '7d', labelKey: 'history.filter7d' },
  { id: '30d', labelKey: 'history.filter30d' },
  { id: 'custom', labelKey: 'history.filterCustom' },
];

// The preset pills + custom range inputs half of useDateFilter — split out
// so any list (SubmissionHistoryList's own History tabs, AdminPortal's
// Activity tab) can drop in the same date filter chrome without owning the
// state itself.
export function DateFilterBar({
  preset, setPreset, from, setFrom, to, setTo,
}: {
  preset: DatePreset;
  setPreset: (p: DatePreset) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
}
