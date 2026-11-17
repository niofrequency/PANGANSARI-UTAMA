import { AlertTriangle, CheckCircle2, ChevronRight, Clock, MessageSquareQuote } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { titleKeyForChainType } from '../../data/opsLogsCatalog';
import { openFixPage } from '../../lib/fixEditors';
import { Submission } from '../../types';
import { cn } from '../../utils/cn';

// "Rejected" tab on the frontline portals (Technician, Housekeeper,
// Janitor, Laundry): every log of theirs a Supervisor / Manager sent back,
// with the reviewer's comment.
//   • Needs fixing — still REJECTED; "Open & fix" opens the log page
//     (App.tsx) with Edit & resubmit / Fixed — send back for review.
//   • Fixed & resent — was sent back, since fixed; shows the comment, the
//     fix note and where it is now (waiting for review / approved).
export function useRejectedCount(store: ReturnType<typeof useAppStore>) {
  const me = store.currentUser?.id;
  return me ? store.submissions.filter(s => s.userId === me && s.status === 'REJECTED' && !s.deletedAt).length : 0;
}

export function RejectedLogsTab({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const me = store.currentUser?.id;
  const mine = me ? store.submissions.filter(s => s.userId === me && !s.deletedAt) : [];
  const byNewest = (a: Submission, b: Submission) =>
    (b.meta?.returned?.at || b.timestamp).localeCompare(a.meta?.returned?.at || a.timestamp);
  const toFix = mine.filter(s => s.status === 'REJECTED').sort(byNewest);
  const fixed = mine.filter(s => s.status !== 'REJECTED' && s.meta?.returned).sort(byNewest);

  const title = (s: Submission) => { const k = titleKeyForChainType(s.type); return k ? t(k) : s.type; };
  const when = (iso?: string) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  const Comment = ({ s }: { s: Submission }) => {
    const r = s.meta?.returned;
    const note = r?.note || s.rejectionReason;
    return (
      <div className="rounded-xl bg-psu-gray/[0.03] border border-psu-gray/10 p-3 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-psu-gray/50 flex items-center gap-1.5">
          <MessageSquareQuote size={13} />
          {r ? t('rejectedTab.commentFrom', { name: r.name, role: t(`rolesShort.${r.role}`) }) : t('rejectedTab.comment')}
          {r?.at && <span className="font-bold normal-case tracking-normal text-psu-gray/40">· {when(r.at)}</span>}
        </p>
        <p className="text-sm text-psu-gray font-medium whitespace-pre-wrap">{note ? `“${note}”` : t('rejectedTab.noComment')}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:max-w-3xl md:mx-auto">
      <div>
        <h2 className="text-lg font-black text-psu-gray">{t('rejectedTab.title')}</h2>
        <p className="text-xs font-medium text-psu-gray/50">{t('rejectedTab.subtitle')}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-psu-rejected flex items-center gap-1.5">
          <AlertTriangle size={14} /> {t('rejectedTab.toFix')} ({toFix.length})
        </h3>
        {toFix.length === 0 ? (
          <div className="card text-center py-8 text-psu-gray/40">
            <CheckCircle2 className="mx-auto mb-2" size={28} />
            <p className="text-xs font-black uppercase tracking-widest">{t('rejectedTab.allClear')}</p>
          </div>
        ) : toFix.map(s => (
          <div key={s.id} className="card !p-4 space-y-3 border-l-4 !border-l-psu-rejected">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-psu-gray">{title(s)}</p>
                <p className="text-[10px] font-bold text-psu-gray/40 uppercase tracking-widest">{s.siteName} · {when(s.timestamp)}</p>
              </div>
              <span className="shrink-0 px-2 py-1 rounded-lg bg-psu-rejected/10 text-psu-rejected text-[9px] font-black uppercase tracking-widest">{t('common.rejected')}</span>
            </div>
            <Comment s={s} />
            <button type="button" onClick={() => openFixPage(s.id)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-psu-rejected text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
              {t('rejectedTab.openFix')} <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </section>

      {fixed.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-psu-gray/50 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> {t('rejectedTab.fixedSection')} ({fixed.length})
          </h3>
          {fixed.map(s => (
            <div key={s.id} className="card !p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-psu-gray">{title(s)}</p>
                  <p className="text-[10px] font-bold text-psu-gray/40 uppercase tracking-widest">{s.siteName} · {when(s.timestamp)}</p>
                </div>
                <span className={cn('shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1',
                  s.status === 'APPROVED' ? 'bg-psu-green/10 text-psu-green' : 'bg-psu-blue/10 text-psu-blue')}>
                  {s.status === 'APPROVED' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  {s.status === 'APPROVED' ? t('common.approved') : t('rejectedTab.waitingReview')}
                </span>
              </div>
              <Comment s={s} />
              {s.meta?.fixNote && (
                <p className="text-xs text-psu-gray/70"><b>{t('ops.chain.fixNoteLabel')}:</b> {s.meta.fixNote}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
