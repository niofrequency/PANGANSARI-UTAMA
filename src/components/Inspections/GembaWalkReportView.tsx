import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { ChevronLeft } from 'lucide-react';

const EVAL_COLOR: Record<string, string> = {
  Conform: 'bg-psu-green/10 text-psu-green',
  'Not Conform': 'bg-psu-rejected/10 text-psu-rejected',
  'Non Observed': 'bg-psu-warning/10 text-psu-warning',
  'N/A': 'bg-psu-gray/10 text-psu-gray/50',
};

export function GembaWalkReportView({ submission, onBack }: { submission: Submission; onBack: () => void }) {
  const { t } = useTranslation();
  const meta = submission.meta || {};
  const counts = meta.evaluationCounts;
  const score = submission.score;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest">
        <ChevronLeft size={16} /> {t('inspection.backToList')}
      </button>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-psu-gray">{meta.areaAudited || t('gemba.formTitle')}</h2>
            <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">
              {new Date(submission.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {meta.inspectorName || submission.userName}
            </p>
            {(meta.project || meta.unit) && (
              <p className="text-[10px] text-psu-gray/40 font-bold mt-1">{[meta.project, meta.unit].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <div className={cn(
            "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0",
            score === undefined ? "bg-psu-gray/10 text-psu-gray/50" : score >= 90 ? "bg-psu-green/10 text-psu-green" : score >= 75 ? "bg-psu-blue/10 text-psu-blue" : score >= 50 ? "bg-psu-warning/10 text-psu-warning" : "bg-psu-rejected/10 text-psu-rejected"
          )}>
            <span className="text-lg font-black">{score !== undefined ? `${score}%` : '—'}</span>
            <span className="text-[8px] font-black uppercase tracking-wide">{t('gemba.complianceScore')}</span>
          </div>
        </div>
        {counts && (
          <p className="text-[11px] text-psu-gray/40 font-bold border-t border-psu-gray/5 pt-3">
            {t('gemba.evaluationCounts', { conform: counts.conform, notConform: counts.notConform, nonObserved: counts.nonObserved, na: counts.na })}
          </p>
        )}
      </div>

      {(meta.threeInARowNotes?.positives || meta.threeInARowNotes?.improvements) && (
        <div className="card space-y-3">
          <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{t('gemba.threeInARowTitle')}</h3>
          {meta.threeInARowNotes?.positives && (
            <div>
              <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('gemba.positivesLabel')}</p>
              <p className="text-xs text-psu-gray/70 font-medium mt-1">{meta.threeInARowNotes.positives}</p>
            </div>
          )}
          {meta.threeInARowNotes?.improvements && (
            <div>
              <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('gemba.improvementsLabel')}</p>
              <p className="text-xs text-psu-gray/70 font-medium mt-1">{meta.threeInARowNotes.improvements}</p>
            </div>
          )}
        </div>
      )}

      <div className="card space-y-1 p-0 divide-y divide-psu-gray/5">
        {submission.items.map(item => (
          <div key={item.id} className="p-5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-psu-gray leading-relaxed">{item.question}</p>
              <span className={cn("text-[9px] font-black px-2 py-1 rounded-md shrink-0 whitespace-nowrap", EVAL_COLOR[String(item.answer)] || 'bg-psu-gray/10 text-psu-gray/50')}>
                {String(item.answer)}
              </span>
            </div>
            {item.remarks && <p className="text-[11px] text-psu-gray/50 font-medium italic">{t('gemba.observationLabel')}: {item.remarks}</p>}
            {item.correctiveAction && <p className="text-[11px] text-psu-gray/50 font-medium italic">{t('gemba.correctiveActionLabel')}: {item.correctiveAction}</p>}
            {item.comment && <p className="text-[11px] text-psu-gray/50 font-medium italic">{t('gemba.commentLabel')}: {item.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
