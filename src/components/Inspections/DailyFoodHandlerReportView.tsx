import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { DAILY_FOOD_HANDLER_GROUPS } from '../../data/dailyFoodHandlerData';
import { isGoodMark } from '../../data/dailyFoodHandlerScoring';
import { ChevronLeft, CheckCircle2, XCircle as XCircleIcon } from 'lucide-react';

export function DailyFoodHandlerReportView({ submission, onBack }: { submission: Submission; onBack: () => void }) {
  const { t } = useTranslation();
  const meta = submission.meta || {};
  const roster = meta.roster || [];
  const readyCount = roster.filter(r => r.readyToWork).length;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest">
        <ChevronLeft size={16} /> {t('inspection.backToList')}
      </button>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-psu-gray">{meta.areaAudited || t('dfh.formTitle')}</h2>
            <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">
              {new Date(submission.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {submission.userName}
            </p>
          </div>
          <div className={cn(
            "px-3 py-2 rounded-2xl flex flex-col items-center justify-center shrink-0",
            readyCount === roster.length ? "bg-psu-green/10 text-psu-green" : "bg-psu-warning/10 text-psu-warning"
          )}>
            <span className="text-sm font-black">{readyCount}/{roster.length}</span>
            <span className="text-[8px] font-black uppercase tracking-wide">{t('dfh.readyToWork')}</span>
          </div>
        </div>
        {(meta.checkedBy || meta.acknowledgedBy || meta.verifiedBy) && (
          <div className="text-[10px] text-psu-gray/40 font-bold border-t border-psu-gray/5 pt-3 space-y-1">
            {meta.checkedBy && <p>{t('dfh.checkedByLabel')}: <span className="text-psu-gray/70">{meta.checkedBy}</span></p>}
            {meta.acknowledgedBy && <p>{t('dfh.acknowledgedByLabel')}: <span className="text-psu-gray/70">{meta.acknowledgedBy}</span></p>}
            {meta.verifiedBy && <p>{t('dfh.verifiedByLabel')}: <span className="text-psu-gray/70">{meta.verifiedBy}</span></p>}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {roster.map(entry => (
          <div key={entry.no} className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-psu-blue/10 text-psu-blue flex items-center justify-center text-[11px] font-black">
                  {entry.no}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-psu-gray truncate">{entry.name}</h4>
                  {entry.position && <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest">{entry.position}</p>}
                </div>
              </div>
              <div className={cn("flex items-center gap-1.5 text-xs font-black shrink-0", entry.readyToWork ? "text-psu-green" : "text-psu-rejected")}>
                {entry.readyToWork ? <CheckCircle2 size={16} /> : <XCircleIcon size={16} />}
                {entry.readyToWork ? t('dfh.readyYes') : t('dfh.readyNo')}
              </div>
            </div>

            {!entry.readyToWork && (
              <div className="flex flex-wrap gap-1.5">
                {DAILY_FOOD_HANDLER_GROUPS.flatMap(g => g.criteria)
                  .filter(c => !isGoodMark(entry.marks[c.id]))
                  .map(c => (
                    <span key={c.id} className="text-[9px] font-black px-2 py-1 rounded-md bg-psu-rejected/10 text-psu-rejected">
                      {c.labelEn || c.labelId}
                    </span>
                  ))}
              </div>
            )}

            {entry.remark && <p className="text-[11px] text-psu-gray/50 font-medium italic">{t('dfh.remarkLabel')}: {entry.remark}</p>}
          </div>
        ))}

        {roster.length === 0 && (
          <div className="text-center py-12 opacity-20">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('dfh.emptyRoster')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
