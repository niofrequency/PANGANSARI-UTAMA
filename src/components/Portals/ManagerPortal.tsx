import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsDashboard } from '../Dashboard/AnalyticsDashboard';
import { LayoutDashboard, CheckSquare, Settings, User, CheckCircle2, ClipboardCheck, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { InspectionsTab } from '../Inspections/InspectionsTab';
import { OpsLogsTab } from '../OpsLogs/OpsLogsTab';
import { userCanSeeSite } from '../../lib/siteScope';

export function ManagerPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, warnings, sites, users, updateSubmissionStatus } = store;
  // GENERAL_MANAGER is site-wide leadership (GM, Deputy GM, HR & GA, COC,
  // SPCS, etc.) — it sits above both departments rather than inside one,
  // so it gets the Food Safety Manager's Inspections access *and* an
  // unscoped Escalations queue, below.
  const isGeneralManager = currentUser?.role === 'GENERAL_MANAGER';
  const isFoodSafety = currentUser?.role === 'FOOD_SAFETY_MANAGER' || isGeneralManager;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESCALATIONS' | 'OPS_LOGS' | 'INSPECTIONS'>('DASHBOARD');

  // Site-scoped (Home Site by default, or wider if the Admin gave this
  // Manager a Site Access override — see lib/siteScope.ts) *and*
  // department-scoped, same as the Supervisor's Field Queue — a
  // Housekeeping Manager's Escalations is HOUSEKEEPING submissions only,
  // a Food Safety Manager's is FOOD_SAFETY only. This used to filter by
  // status alone, which let either Manager approve or reject the other
  // department's — and every site's — pending work. GENERAL_MANAGER is
  // the deliberate exception: no department filter at all (site scope
  // still applies, but defaults to 'ALL' for that role — see
  // siteScope.ts), since that role is meant to see everything.
  const escalations = submissions.filter(
    s => s.status === 'PENDING' && userCanSeeSite(currentUser, s.siteId) && (isGeneralManager || s.type === (isFoodSafety ? 'FOOD_SAFETY' : 'HOUSEKEEPING'))
  );

  // The Dashboard tab used to get the raw, unfiltered store data — every
  // site's submissions, blended together, regardless of who was looking at
  // it. That meant a Housekeeping Manager at one site saw every other
  // site's scores too, not just their own, even though Escalations (above)
  // was already correctly site-scoped. Same site scope as Escalations,
  // minus the department filter (the Dashboard's whole point is one
  // combined score, not split by department yet — see the note in the
  // system-map artifact).
  const dashboardSubmissions = submissions.filter(s => userCanSeeSite(currentUser, s.siteId));
  const dashboardSites = sites.filter(s => userCanSeeSite(currentUser, s.id));
  // Warning has no siteId of its own (see types.ts) — it's tied to a
  // technician, so their site has to be looked up via the user list
  // instead of read straight off the warning.
  const dashboardWarnings = warnings.filter(w => userCanSeeSite(currentUser, users.find(u => u.id === w.technicianId)?.site));

  const tabs = [
    { id: 'DASHBOARD' as const, icon: LayoutDashboard, label: t('manager.tabAnalytics') },
    { id: 'ESCALATIONS' as const, icon: CheckSquare, label: t('manager.tabEscalations') },
    { id: 'OPS_LOGS' as const, icon: ClipboardList, label: t('ops.tabTitle') },
    ...(isFoodSafety ? [{ id: 'INSPECTIONS' as const, icon: ClipboardCheck, label: t('inspection.tabTitle') }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-psu-gray/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-psu-gray text-white shadow-md shadow-psu-gray/20" 
                : "text-psu-gray/40 hover:text-psu-gray"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'DASHBOARD' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-bold tracking-tight text-psu-gray">{t('manager.dashboardTitle')}</h2>
              <button className="w-10 h-10 flex items-center justify-center text-psu-gray/30 bg-white rounded-xl border border-psu-gray/5 shadow-sm">
                <Settings size={18} />
              </button>
            </div>
            <AnalyticsDashboard submissions={dashboardSubmissions} warnings={dashboardWarnings} sites={dashboardSites} users={users} />
          </motion.div>
        )}

        {activeTab === 'ESCALATIONS' && (
          <motion.div
            key="escalations"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-bold tracking-tight text-psu-gray px-2">{t('manager.escalationsTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {escalations.map(s => (
                <div key={s.id} className="card group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center">
                        <User size={22} className="text-psu-gray/20" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-psu-gray">{s.userName}</h4>
                        {/* Type shown alongside site so a GENERAL_MANAGER, whose
                            queue mixes both departments and every site, can
                            tell them apart at a glance — same info a
                            Supervisor's Field Queue card already shows. */}
                        <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">{s.type} &middot; {s.siteName}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-psu-blue bg-psu-blue/10 px-2 py-1 rounded uppercase tracking-tighter">{t('common.pending')}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => updateSubmissionStatus(s.id, 'REJECTED', 'Manager Override')}
                      className="flex-1 py-4 text-psu-rejected border-2 border-psu-rejected/10 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      {t('manager.deny')}
                    </button>
                    <button 
                      onClick={() => updateSubmissionStatus(s.id, 'APPROVED')}
                      className="flex-[2] py-4 bg-psu-green text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-psu-green/20 active:scale-95 transition-all"
                    >
                      {t('manager.approveArchive')}
                    </button>
                  </div>
                </div>
              ))}
              {escalations.length === 0 && (
                <div className="text-center py-20 opacity-30">
                  <CheckCircle2 size={48} className="mx-auto mb-2 text-psu-green" />
                  <p className="text-xs font-black uppercase tracking-widest text-psu-gray">{t('manager.allClear')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'INSPECTIONS' && isFoodSafety && (
          <motion.div
            key="inspections"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <InspectionsTab store={store} />
          </motion.div>
        )}

        {activeTab === 'OPS_LOGS' && (
          <motion.div
            key="ops-logs"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8"
          >
            {/* GENERAL_MANAGER sits above both departments (same exception
                as Escalations/Dashboard above) — sees both departments'
                ops logs, not just one. HOUSEKEEPING_MANAGER and
                FOOD_SAFETY_MANAGER each only see their own. */}
            {(isGeneralManager || !isFoodSafety) && (
              <div className="space-y-3">
                {isGeneralManager && <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] px-2">{t('roles.HOUSEKEEPING_MANAGER')}</h3>}
                <OpsLogsTab store={store} department="HOUSEKEEPING" tier="manager" />
              </div>
            )}
            {isFoodSafety && (
              <div className="space-y-3">
                {isGeneralManager && <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] px-2">{t('roles.FOOD_SAFETY_MANAGER')}</h3>}
                <OpsLogsTab store={store} department="FOOD_SAFETY" tier="manager" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
