// The creator's side of Corrective Actions — a Supervisor, Manager, or GM
// raises one, assigns it to anyone in their own site/department scope,
// and later verifies (or sends back) whatever the assignee marks done.
// Dropped in as its own tab on SupervisorPortal/ManagerPortal, mirroring
// FieldReportsTab.tsx's shape (card list + detail modal). Also renders
// MyActionItems at the top, since a Supervisor/Manager/GM can just as
// easily be someone ELSE's assignee, not only a creator — same component
// every frontline portal uses for that.

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ClipboardList, XCircle, CheckCircle2, AlertTriangle, Undo2, User as UserIcon, Clock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { userCanSeeSite } from '../../lib/siteScope';
import { cn } from '../../utils/cn';
import { CorrectiveAction, UserRole } from '../../types';
import { MyActionItems } from './MyActionItems';

interface CorrectiveActionsTabProps {
  store: ReturnType<typeof useAppStore>;
  department: 'HOUSEKEEPING' | 'FOOD_SAFETY';
  // GENERAL_MANAGER sits above both departments — sees (and can assign
  // into) both, same exception as everywhere else this shows up
  // (Escalations, Ops Logs, Dashboard).
  isGeneralManager?: boolean;
}

const STATUS_STYLE: Record<CorrectiveAction['status'], string> = {
  OPEN: 'bg-psu-rejected/10 text-psu-rejected',
  DONE: 'bg-psu-warning/10 text-psu-warning',
  VERIFIED: 'bg-psu-green/10 text-psu-green',
};

function departmentOfRole(role: UserRole): 'HOUSEKEEPING' | 'FOOD_SAFETY' | null {
  if (role.startsWith('HOUSEKEEPING')) return 'HOUSEKEEPING';
  if (role.startsWith('FOOD_SAFETY')) return 'FOOD_SAFETY';
  return null;
}

// Same definition as MyActionItems.tsx's isOverdue — only a still-OPEN
// item (the assignee hasn't marked it done yet) counts as overdue. Once
// it's DONE, it's waiting on the creator's verification, not "late" in
// the same sense, even if that happens after the original due date.
function isOverdue(action: CorrectiveAction): boolean {
  return action.status === 'OPEN' && new Date(action.dueDate) < new Date(new Date().toDateString());
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CorrectiveActionsTab({ store, department, isGeneralManager }: CorrectiveActionsTabProps) {
  const { t } = useTranslation();
  const { currentUser, users, sites, correctiveActions, addCorrectiveAction, verifyCorrectiveAction, reopenCorrectiveAction } = store;
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<CorrectiveAction | null>(null);
  const [reopenNote, setReopenNote] = useState('');
  const [reopenError, setReopenError] = useState('');

  const [comment, setComment] = useState('');
  const [action, setAction] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');

  // Anyone the creator can already see (their site scope), in the same
  // department they operate in — a GM operates across both. Never
  // assignable to yourself: the two-step closure assumes a different
  // person does the work than the one who verifies it.
  const assignableUsers = users.filter(u =>
    u.id !== currentUser?.id
    && u.isActive
    && userCanSeeSite(currentUser, u.site)
    && (isGeneralManager || departmentOfRole(u.role) === department)
  );

  const createdByMe = correctiveActions
    .filter(a => a.createdById === currentUser?.id)
    .sort((a, b) => {
      const rank = (x: CorrectiveAction) => (x.status === 'VERIFIED' ? 2 : x.status === 'DONE' ? 0 : isOverdue(x) ? 0 : 1);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const statusLabel = (status: CorrectiveAction['status']) =>
    status === 'OPEN' ? t('correctiveAction.statusOpen') : status === 'DONE' ? t('correctiveAction.statusDone') : t('correctiveAction.statusVerified');

  const resetForm = () => {
    setComment('');
    setAction('');
    setAssignedToId('');
    setDueDate('');
    setFormError('');
  };

  const handleCreate = () => {
    const assignee = users.find(u => u.id === assignedToId);
    if (!comment.trim() || !action.trim() || !assignee || !dueDate || !currentUser) {
      setFormError(t('correctiveAction.errorFieldsRequired'));
      return;
    }
    addCorrectiveAction({
      comment: comment.trim(),
      action: action.trim(),
      assignedToId: assignee.id,
      assignedToName: assignee.name,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      siteId: assignee.site,
      siteName: sites.find(s => s.id === assignee.site)?.name ?? assignee.site,
      department: departmentOfRole(assignee.role) ?? department,
      dueDate,
    });
    setShowNew(false);
    resetForm();
  };

  const closeDetail = () => {
    setSelected(null);
    setReopenNote('');
    setReopenError('');
  };

  const handleReopen = () => {
    if (!selected) return;
    if (!reopenNote.trim()) {
      setReopenError(t('correctiveAction.reopenNoteRequired'));
      return;
    }
    reopenCorrectiveAction(selected.id, reopenNote.trim());
    closeDetail();
  };

  const handleVerify = () => {
    if (!selected) return;
    verifyCorrectiveAction(selected.id);
    closeDetail();
  };

  return (
    <div className="space-y-6">
      <MyActionItems store={store} />

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('correctiveAction.createdByMeTitle')}</h2>
        <button
          onClick={() => { resetForm(); setShowNew(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-psu-gray text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
        >
          <Plus size={14} />
          {t('correctiveAction.newButton')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {createdByMe.map(a => {
          const overdue = isOverdue(a);
          return (
            <motion.div
              key={a.id}
              layoutId={a.id}
              onClick={() => setSelected(a)}
              className={cn(
                'card flex items-center justify-between active:scale-98 transition-all cursor-pointer group hover:border-psu-blue/20',
                overdue && 'border-psu-rejected/30'
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
                  <ClipboardList size={24} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-psu-gray truncate">{a.assignedToName}</h4>
                  <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
                    {overdue ? t('correctiveAction.overdueLabel') : t('correctiveAction.dueLabel', { date: new Date(a.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
                  </p>
                  <p className="text-xs text-psu-gray/60 font-medium mt-1 truncate">{a.comment}</p>
                </div>
              </div>
              <span className={cn('text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0 ml-2', STATUS_STYLE[a.status])}>
                {statusLabel(a.status)}
              </span>
            </motion.div>
          );
        })}
        {createdByMe.length === 0 && (
          <div className="text-center py-16 opacity-20 col-span-full">
            <ClipboardList size={56} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('correctiveAction.noneCreated')}</p>
          </div>
        )}
      </div>

      {/* Detail / verify / reopen modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('correctiveAction.tabTitle')}</h3>
                    <span className={cn('inline-block mt-2 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md', STATUS_STYLE[selected.status])}>
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                  <button onClick={closeDetail} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="bg-psu-bg p-5 rounded-2xl border border-psu-gray/5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <UserIcon className="text-psu-blue" size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{t('correctiveAction.assignedToDisplay', { name: selected.assignedToName })}</p>
                    <p className="text-sm font-bold text-psu-gray flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} className={isOverdue(selected) ? 'text-psu-rejected' : 'text-psu-gray/30'} />
                      {isOverdue(selected) ? t('correctiveAction.overdueLabel') : t('correctiveAction.dueLabel', { date: new Date(selected.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest">{t('correctiveAction.commentLabel')}</p>
                  <p className="text-sm font-medium text-psu-gray leading-relaxed">{selected.comment}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-psu-gray/30 uppercase tracking-widest">{t('correctiveAction.actionLabel')}</p>
                  <p className="text-sm font-medium text-psu-gray leading-relaxed">{selected.action}</p>
                </div>

                {selected.status !== 'OPEN' && selected.completionNote && (
                  <div className="bg-psu-warning/10 border border-psu-warning/20 rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] font-black text-psu-warning uppercase tracking-widest">{t('correctiveAction.completionNoteTitle')}</p>
                    <p className="text-xs text-psu-gray/70 font-medium">{selected.completionNote}</p>
                  </div>
                )}

                {selected.status === 'DONE' && (
                  <div>
                    <label className="block text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] mb-3">{t('correctiveAction.reopenNoteLabel')}</label>
                    <textarea
                      value={reopenNote}
                      onChange={(e) => { setReopenNote(e.target.value); setReopenError(''); }}
                      placeholder={t('correctiveAction.reopenNotePlaceholder')}
                      className={cn(
                        'w-full p-5 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 h-24',
                        reopenError ? 'border-psu-rejected' : 'border-psu-gray/10'
                      )}
                    />
                    {reopenError && <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{reopenError}</p>}
                  </div>
                )}

                {selected.status === 'VERIFIED' && (
                  <div className="flex items-center gap-2 text-psu-green">
                    <CheckCircle2 size={16} />
                    <p className="text-xs font-bold">{t('correctiveAction.statusVerified')}</p>
                  </div>
                )}
              </div>

              {selected.status === 'DONE' && (
                <div className="p-8 bg-psu-bg/30 border-t border-psu-gray/5 flex gap-3">
                  <button
                    onClick={handleReopen}
                    className="flex-1 py-4 bg-white border-2 border-psu-rejected text-psu-rejected rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Undo2 size={16} />
                    {t('correctiveAction.reopenButton')}
                  </button>
                  <button
                    onClick={handleVerify}
                    className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    {t('correctiveAction.verifyButton')}
                  </button>
                </div>
              )}

              {selected.status === 'OPEN' && (
                <div className="px-8 pb-6 -mt-2 flex items-center gap-2 text-psu-rejected/70">
                  <AlertTriangle size={14} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">{t('correctiveAction.statusOpen')}</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-psu-gray/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-8 overflow-y-auto space-y-5">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('correctiveAction.modalTitle')}</h3>
                  <button onClick={() => setShowNew(false)} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('correctiveAction.commentLabel')}</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('correctiveAction.commentPlaceholder')}
                    className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 h-20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('correctiveAction.actionLabel')}</label>
                  <textarea
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder={t('correctiveAction.actionPlaceholder')}
                    className="w-full p-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 h-20"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('correctiveAction.assignedToLabel')}</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-4 py-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20"
                  >
                    <option value="">{t('correctiveAction.assignedToPlaceholder')}</option>
                    {assignableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {assignableUsers.length === 0 && (
                    <p className="text-[10px] text-psu-warning font-bold mt-1.5">{t('correctiveAction.noAssignees')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-psu-gray/50 uppercase tracking-widest mb-2">{t('correctiveAction.dueDateLabel')}</label>
                  <input
                    type="date"
                    value={dueDate}
                    min={todayISO()}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-4 bg-psu-bg border border-psu-gray/10 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20"
                  />
                </div>

                {formError && <p className="text-[10px] text-psu-rejected font-bold">{formError}</p>}
              </div>

              <div className="p-8 bg-psu-bg/30 border-t border-psu-gray/5">
                <button
                  onClick={handleCreate}
                  className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                >
                  {t('correctiveAction.createButton')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
