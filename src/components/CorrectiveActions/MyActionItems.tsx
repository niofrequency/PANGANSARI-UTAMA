// The assignee's side of a Corrective Action — dropped into each
// frontline (and Supervisor/Manager, via CorrectiveActionsTab above it)
// portal's existing TASKS tab, same placement convention as
// MyFieldReports.tsx. Only renders once there's something assigned,
// same as that component.
//
// Overdue is a visual flag only — sorted to the top, shown in red — never
// a push/email/SMS, since this app has no notification infrastructure at
// all (see App.tsx/Layout.tsx).

import { useState } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { cn } from '../../utils/cn';
import { CorrectiveAction } from '../../types';
import { Modal } from '../Modal';
import { ListCard } from '../ListCard';

const STATUS_STYLE: Record<CorrectiveAction['status'], string> = {
  OPEN: 'bg-psu-rejected/10 text-psu-rejected',
  DONE: 'bg-psu-warning/10 text-psu-warning',
  VERIFIED: 'bg-psu-green/10 text-psu-green',
};

function isOverdue(action: CorrectiveAction): boolean {
  return action.status === 'OPEN' && new Date(action.dueDate) < new Date(new Date().toDateString());
}

export function MyActionItems({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, correctiveActions, markCorrectiveActionDone } = store;
  const [doing, setDoing] = useState<CorrectiveAction | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const mine = correctiveActions
    .filter(a => a.assignedToId === currentUser?.id)
    .sort((a, b) => {
      // Overdue-and-still-open first, then by due date, done/verified last.
      const rank = (x: CorrectiveAction) => (x.status !== 'OPEN' ? 2 : isOverdue(x) ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  if (mine.length === 0) return null;

  const statusLabel = (status: CorrectiveAction['status']) =>
    status === 'OPEN' ? t('correctiveAction.statusOpen') : status === 'DONE' ? t('correctiveAction.statusDone') : t('correctiveAction.statusVerified');

  const openDoing = (a: CorrectiveAction) => {
    setDoing(a);
    setNote('');
    setNoteError('');
  };

  const submitDone = () => {
    if (!doing) return;
    if (!note.trim()) {
      setNoteError(t('correctiveAction.completionNoteRequired'));
      return;
    }
    markCorrectiveActionDone(doing.id, note.trim());
    setDoing(null);
    setNote('');
  };

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2 px-2">{t('correctiveAction.myItemsTitle')}</h3>
      <ListCard
        items={mine}
        emptyIcon={<ClipboardList size={48} className="mx-auto" />}
        emptyLabel={t('common.noData')}
        rowClassName={(a) => isOverdue(a) ? "bg-psu-rejected/5" : undefined}
        renderRow={(a) => {
          const overdue = isOverdue(a);
          return (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    overdue ? 'bg-psu-rejected/10 text-psu-rejected' : 'bg-psu-bg text-psu-gray/20'
                  )}>
                    <ClipboardList size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-psu-gray truncate">{a.comment}</p>
                    <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{t('correctiveAction.assignedByLabel', { name: a.createdByName })}</p>
                  </div>
                </div>
                <span className={cn('text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0', STATUS_STYLE[a.status])}>
                  {statusLabel(a.status)}
                </span>
              </div>

              <p className="text-[11px] text-psu-gray/60 font-medium pl-[52px]">{a.action}</p>

              <div className="flex items-center justify-between pl-[52px]">
                <span className={cn(
                  'text-[10px] font-bold flex items-center gap-1',
                  overdue ? 'text-psu-rejected' : 'text-psu-gray/40'
                )}>
                  {overdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                  {overdue ? t('correctiveAction.overdueLabel') : t('correctiveAction.dueLabel', { date: new Date(a.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
                </span>
                {a.status === 'OPEN' && (
                  <button
                    onClick={() => openDoing(a)}
                    className="text-[10px] font-black uppercase tracking-widest text-psu-green flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    {t('correctiveAction.markDoneButton')}
                  </button>
                )}
              </div>

              {a.status !== 'OPEN' && a.completionNote && (
                <div className="ml-[52px] bg-psu-bg rounded-xl p-3">
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest mb-1">{t('correctiveAction.completionNoteTitle')}</p>
                  <p className="text-[11px] text-psu-gray/60 font-medium">{a.completionNote}</p>
                </div>
              )}

              {a.status === 'OPEN' && a.reopenedNote && (
                <div className="ml-[52px] bg-psu-rejected/5 border border-psu-rejected/10 rounded-xl p-3">
                  <p className="text-[9px] font-black text-psu-rejected uppercase tracking-widest mb-1">{t('correctiveAction.reopenedNoticeTitle', { name: a.createdByName })}</p>
                  <p className="text-[11px] text-psu-gray/60 font-medium">{a.reopenedNote}</p>
                </div>
              )}
            </div>
          );
        }}
      />

      {doing && (
        <Modal size="sm" boxClassName="rounded-[32px] p-8 space-y-5">
            <h3 className="text-lg font-bold text-psu-gray">{t('correctiveAction.markDoneButton')}</h3>
            <p className="text-xs text-psu-gray/60 font-medium">{doing.action}</p>
            <div>
              <label className="block text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] mb-3">{t('correctiveAction.completionNoteLabel')}</label>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
                placeholder={t('correctiveAction.completionNotePlaceholder')}
                className={cn(
                  'w-full p-5 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 h-28',
                  noteError ? 'border-psu-rejected' : 'border-psu-gray/10'
                )}
              />
              {noteError && <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{noteError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDoing(null)} className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-psu-gray/50 bg-psu-bg">
                {t('common.cancel')}
              </button>
              <button onClick={submitDone} className="flex-[2] py-3.5 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all">
                {t('correctiveAction.submitDoneButton')}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
