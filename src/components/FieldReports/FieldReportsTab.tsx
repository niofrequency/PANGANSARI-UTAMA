import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AlertTriangle, ChevronLeft, XCircle, CheckCircle2, User, Clock, Wrench } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { userCanSeeSite } from '../../lib/siteScope';
import { cn } from '../../utils/cn';
import { cloudinaryUrl } from '../../utils/cloudinaryUrl';
import { FieldReport } from '../../types';
import { Modal } from '../Modal';
import { Lightbox } from '../Lightbox';
import { ListCard } from '../ListCard';

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const renderRow = (r: FieldReport) => (
    <div onClick={() => setSelected(r)} className="flex items-center justify-between gap-3 cursor-pointer">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-gray/20 shrink-0">
          <Wrench size={20} />
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
    </div>
  );

  // Desktop-only (lg and up) full-width page instead of a popup — the
  // list is hidden entirely while this is open (see the render below),
  // same "list page ↔ detail page" navigation as OpsLogsTab.tsx. Below
  // lg this never renders; the mobile popup further down is what shows
  // instead.
  const renderDesktopPage = (selected: FieldReport) => (
    <div className="space-y-6">
      <button onClick={closeModal} className="flex items-center gap-2 text-xs font-black text-psu-gray/40 uppercase tracking-widest hover:text-psu-gray transition-colors">
        <ChevronLeft size={16} /> {t('inspection.backToList')}
      </button>

      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="col-span-2 space-y-6">
          <div className="card space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-black text-psu-gray">{t('fieldReport.title')}</h2>
              <span className={cn("inline-block text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md", STATUS_STYLE[selected.status])}>
                {statusLabel(selected.status)}
              </span>
            </div>

            <p className="text-sm font-medium text-psu-gray leading-relaxed">{selected.message}</p>

            {selected.photoUrl && (
              <button
                type="button"
                onClick={() => setLightboxUrl(cloudinaryUrl(selected.photoUrl, 1600) ?? null)}
                className="block w-full rounded-2xl overflow-hidden border border-psu-gray/5"
              >
                <img src={cloudinaryUrl(selected.photoUrl, 1000)} className="w-full h-72 object-cover" alt="" />
              </button>
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
        </div>

        <div className="col-span-1 sticky top-6 space-y-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center shrink-0">
              <User className="text-psu-warning" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest">{selected.siteName}</p>
              <p className="text-sm font-bold text-psu-gray truncate">{selected.userName}</p>
            </div>
          </div>

          {selected.status !== 'RESOLVED' && (
            <div className="card space-y-3">
              {selected.status === 'OPEN' && (
                <button
                  onClick={() => handleAcknowledge(selected.id)}
                  className="w-full py-4 bg-white border-2 border-psu-warning text-psu-warning rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle size={16} />
                  {t('fieldReport.acknowledgeButton')}
                </button>
              )}
              <button
                onClick={handleResolve}
                className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                {t('fieldReport.resolveButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Desktop full page (lg and up) — replaces the list entirely while
          open; see the list's own lg:hidden below. */}
      {selected && (
        <div className="hidden lg:block">
          {renderDesktopPage(selected)}
        </div>
      )}

      <div className={cn("space-y-6", selected && "lg:hidden")}>
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('fieldReport.openTitle')}</h2>
        {open.length > 0 && (
          <div className="bg-psu-rejected/10 text-psu-rejected px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            {open.length}
          </div>
        )}
      </div>

      <ListCard
        items={open}
        emptyIcon={<CheckCircle2 size={56} className="mx-auto" />}
        emptyLabel={t('fieldReport.allClear')}
        renderRow={renderRow}
      />

      {history.length > 0 && (
        <>
          <h3 className="text-sm font-black text-psu-gray/30 uppercase tracking-[0.2em] border-b border-psu-gray/5 pb-2 px-2">{t('fieldReport.historyTitle')}</h3>
          <ListCard items={history} renderRow={renderRow} />
        </>
      )}
      </div>

      {/* Mobile/tablet only (below lg) — the desktop full page above
          takes over from lg up. */}
      <AnimatePresence>
        {selected && (
          <Modal size="md" backdropClassName="lg:hidden" boxClassName="rounded-[32px] overflow-hidden flex flex-col max-h-[85vh]">
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
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(cloudinaryUrl(selected.photoUrl, 1600) ?? null)}
                    className="block w-full rounded-2xl overflow-hidden border border-psu-gray/5"
                  >
                    <img src={cloudinaryUrl(selected.photoUrl, 800)} className="w-full h-48 object-cover" alt="" />
                  </button>
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
          </Modal>
        )}
      </AnimatePresence>

      <Lightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}
