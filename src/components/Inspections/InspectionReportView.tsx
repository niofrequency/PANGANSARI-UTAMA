import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { ChevronLeft } from 'lucide-react';

const CATEGORY_COLOR: Record<string, string> = {
  A: 'text-psu-green bg-psu-green/10',
  B: 'text-psu-blue bg-psu-blue/10',
  C: 'text-psu-warning bg-psu-warning/10',
  D: 'text-psu-rejected bg-psu-rejected/10',
};

const CONFORMITY_COLOR: Record<string, string> = {
  A: 'bg-psu-green/10 text-psu-green',
  B: 'bg-psu-blue/10 text-psu-blue',
  C: 'bg-psu-rejected/10 text-psu-rejected',
  NA: 'bg-psu-gray/10 text-psu-gray/50',
};

export function InspectionReportView({ submission, onBack }: { submission: Submission; onBack: () => void }) {
  const { t } = useTranslation();
  const meta = submission.meta || {};
  const category = meta.category || 'D';

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest">
        <ChevronLeft size={16} /> {t('inspection.backToList')}
      </button>

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-psu-gray">{meta.areaAudited || '—'}</h2>
            <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-1">
              {new Date(submission.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {meta.inspectorName || submission.userName}
            </p>
          </div>
          <div className={cn("w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0", CATEGORY_COLOR[category])}>
            <span className="text-xl font-black">{category}</span>
            <span className="text-[9px] font-black">{Math.round(submission.score || 0)}%</span>
          </div>
        </div>
        {meta.categoryStatus && <p className="text-xs font-bold text-psu-gray/60">{meta.categoryStatus}</p>}
        {meta.areaOwner && (
          <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest border-t border-psu-gray/5 pt-3">
            {t('inspection.areaOwnerLabel')}: <span className="text-psu-gray/70">{meta.areaOwner}</span>
          </p>
        )}
      </div>

      {meta.sectionScores && meta.sectionScores.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em]">{t('inspection.sectionBreakdown')}</h3>
          <div className="space-y-2">
            {meta.sectionScores.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-psu-gray/70 truncate">{s.titleEn}</span>
                <div className="flex items-center gap-2 shrink-0 w-32">
                  <div className="flex-1 h-1.5 bg-psu-gray/10 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", s.scorePct >= 85 ? "bg-psu-green" : s.scorePct >= 75 ? "bg-psu-blue" : s.scorePct >= 50 ? "bg-psu-warning" : "bg-psu-rejected")}
                      style={{ width: `${s.scorePct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-psu-gray/50 w-8 text-right">{s.scorePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-1 p-0 divide-y divide-psu-gray/5">
        {submission.items.map(item => (
          <div key={item.id} className="p-5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-bold text-psu-gray leading-relaxed">{item.question}</p>
              <span className={cn("text-[9px] font-black px-2 py-1 rounded-md shrink-0", CONFORMITY_COLOR[String(item.answer)] || 'bg-psu-gray/10 text-psu-gray/50')}>
                {item.answer === 'NA' ? 'N/A' : String(item.answer)}
              </span>
            </div>
            {item.remarks && <p className="text-[11px] text-psu-gray/50 font-medium italic">{item.remarks}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
