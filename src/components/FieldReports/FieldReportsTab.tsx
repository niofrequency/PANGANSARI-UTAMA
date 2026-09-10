import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, XCircle, CheckCircle2, User, Clock, Wrench } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { userCanSeeSite } from '../../lib/siteScope';
import { cn } from '../../utils/cn';
import { FieldReport } from '../../types';

interface FieldReportsTabProps {
  store: ReturnType<typeof useAppStore>;
  // Same site+department scoping as the Supervisor's Queue tab — a
  // Housekeeping Supervisor sees Housekeeper/Janitor/Laundry reports, a
  // Food Safety Supervisor sees Technician reports.
  department: 'HOUSEKEEPING' | 'FOOD_SAFETY';
}

const STATUS_STYLE: Record<FieldReport['status'], string> = {
  OPEN: 'bg-psu-rejected/10 text-psu-rejected',
  ACKNOWLEDGED: 'bg-psu-warning/10 text-psu-warning',
  RESOLVED: 'bg-psu-green/10 text-psu-green',
};

export function FieldReportsTab({ store, department }: FieldReportsTabProps) {
  const { t } = useTranslation();
  const { currentUser, fieldReports, acknowledgeFieldReport, resolveFieldReport } = store;
  const [selected, setSelected] = useState<FieldReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const scoped = fieldReports.filter(r => userCanSeeSite(currentUser, r.siteId) && r.department === department);
  const open = scoped.filter(r => r.status !== 'RESOLVED');
  const history = scoped.filter(r => r.status === 'RESOLVED');

  const statusLabel = (status: FieldReport['status']) =>
    status === 'OPEN' ? t('fieldReport.statusOpen') : status === 'ACKNOWLEDGED' ? t('fieldReport.statusAcknowledged') : t('fieldReport.statusResolved');

  const handleAcknowledge = (id: string) => {
    acknowledgeFieldReport(id);
    setSelected(prev => prev && prev.id === id ? { ...prev, status: 'ACKNOWLEDGED' } : prev);
  };

  const handleResolve = () => {
    if (!selected) return;
    if (!resolutionNote.trim()) {
      setNoteError(t('fieldReport.resolveNoteRequired'));
      return;
    }
    resolveFieldReport(selected.id, resolutionNote.trim());
    setSelected(null);
    setResolutionNote('');
    setNoteError('');
  };

  const closeModal = () => {
    setSelected(null);
    setResolutionNote('');
    setNoteError('');
  };

  const renderCard = (r: FieldReport) => (
    <motion.div
      key={r.id}
      layoutId={r.id}
      onClick={() => setSelected(r)}
      className="card flex items-center justify-between active:scale-98 transition-all cursor-pointer group hover:border-psu-warning/20"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-14 h-14 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
          <Wrench size={24} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-psu-gray truncate">{r.userName}</h4>
          <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
            {r.siteName} • {new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-psu-gray/60 font-medium mt-1 truncate">{r.message}</p>
        </div>
      </div>
      <span className={cn("text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shrink-0 ml-2", STATUS_STYLE[r.status])}>
        {statusLabel(r.status)}
      </span>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('fieldReport.openTitle')}</h2>
        {open.length > 0 && (
          <div className="bg-psu-rejected/10 text-psu-rejected px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {open.length}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {open.map(renderCard)}
        {open.length === 0 && (
          <div className="text-center py-16 opacity-20 col-span-full">
            <CheckCircle2 size={56} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('fieldReport.allClear')}</p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <h3 className="text-sm font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2 px-2">{t('fieldReport.historyTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map(renderCard)}
          </div>
        </>
      )}

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
                    <h3 className="text-xl font-bold tracking-tight text-psu-gray">{t('fieldReport.title')}</h3>
                    <span className={cn("inline-block mt-2 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md", STATUS_STYLE[selected.status])}>
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                  <button onClick={closeModal} className="p-2 text-psu-gray/30 hover:text-psu-rejected transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="bg-psu-bg p-5 rounded-2xl border border-psu-gray/5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <User className="text-psu-warning" size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{selected.siteName}</p>
                    <p className="text-sm font-bold text-psu-gray truncate">{selected.userName}</p>
                  </div>
                </div>

                <p className="text-sm font-medium text-psu-gray leading-relaxed">{selected.message}</p>

                {selected.photoUrl && (
                  <div className="rounded-2xl overflow-hidden border border-psu-gray/5">
                    <img src={selected.photoUrl} className="w-full h-48 object-cover" alt="" />
                  </div>
                )}

                {selected.status === 'RESOLVED' ? (
                  <div className="bg-psu-green/10 border border-psu-green/20 rounded-2xl p-4 space-y-1">
                    <p className="text-[10px] font-black text-psu-green uppercase tracking-widest">{t('fieldReport.resolvedBy', { name: selected.resolvedBy || '' })}</p>
                    <p className="text-xs text-psu-gray/70 font-medium">{selected.resolutionNote}</p>
                  </div>
                ) : (
                  <>
                    {selected.status === 'ACKNOWLEDGED' && selected.acknowledgedBy && (
                      <p className="text-[10px] font-black text-psu-warning uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} /> {t('fieldReport.acknowledgedBy', { name: selected.acknowledgedBy })}
                      </p>
                    )}
                    <div>
                      <label className="block text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] mb-3">{t('fieldReport.resolveNoteLabel')}</label>
                      <textarea
                        value={resolutionNote}
                        onChange={(e) => { setResolutionNote(e.target.value); setNoteError(''); }}
                        placeholder={t('fieldReport.resolveNotePlaceholder')}
                        className={cn(
                          "w-full p-5 bg-psu-bg border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-green/20 h-28",
                          noteError ? "border-psu-rejected" : "border-psu-gray/10"
                        )}
                      />
                      {noteError && <p className="text-[10px] text-psu-rejected font-bold mt-1.5">{noteError}</p>}
                    </div>
                  </>
                )}
              </div>

              {selected.status !== 'RESOLVED' && (
                <div className="p-8 bg-psu-bg/30 border-t border-psu-gray/5 flex gap-4">
                  {selected.status === 'OPEN' && (
                    <button
                      onClick={() => handleAcknowledge(selected.id)}
                      className="flex-1 py-4 bg-white border-2 border-psu-warning text-psu-warning rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <AlertTriangle size={16} />
                      {t('fieldReport.acknowledgeButton')}
                    </button>
                  )}
                  <button
                    onClick={handleResolve}
                    className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    {t('fieldReport.resolveButton')}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
