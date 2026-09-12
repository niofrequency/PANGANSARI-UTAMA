import { Wrench } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { FieldReport } from '../../types';
import { ListCard } from '../ListCard';

const STATUS_STYLE: Record<FieldReport['status'], string> = {
  OPEN: 'bg-psu-rejected/10 text-psu-rejected',
  ACKNOWLEDGED: 'bg-psu-warning/10 text-psu-warning',
  RESOLVED: 'bg-psu-green/10 text-psu-green',
};

// A small read-back for whoever files a report (see ReportIssueButton) —
// so "it's fixed" actually reaches them, not just their supervisor's
// history. Dropped into each frontline portal's existing History tab
// rather than a tab of its own, since reports are usually few.
export function MyFieldReports({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, fieldReports } = store;
  const mine = fieldReports.filter(r => r.userId === currentUser?.id);

  if (mine.length === 0) return null;

  const statusLabel = (status: FieldReport['status']) =>
    status === 'OPEN' ? t('fieldReport.statusOpen') : status === 'ACKNOWLEDGED' ? t('fieldReport.statusAcknowledged') : t('fieldReport.statusResolved');

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2 px-2">{t('fieldReport.myReportsTitle')}</h3>
      <ListCard
        items={mine}
        renderRow={(r) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-psu-bg rounded-xl flex items-center justify-center text-psu-gray/20 shrink-0">
                  <Wrench size={18} />
                </div>
                <p className="text-xs font-medium text-psu-gray truncate">{r.message}</p>
              </div>
              <span className={cn("text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0", STATUS_STYLE[r.status])}>
                {statusLabel(r.status)}
              </span>
            </div>
            {r.status === 'RESOLVED' && r.resolutionNote && (
              <p className="text-[11px] text-psu-gray/50 font-medium pl-[52px]">{r.resolutionNote}</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
