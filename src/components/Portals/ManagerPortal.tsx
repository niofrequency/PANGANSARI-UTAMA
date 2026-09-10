import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AnalyticsDashboard } from '../Dashboard/AnalyticsDashboard';
import { LayoutDashboard, Settings, ClipboardCheck, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';
import { InspectionsTab } from '../Inspections/InspectionsTab';
import { OpsLogsTab } from '../OpsLogs/OpsLogsTab';
import { userCanSeeSite } from '../../lib/siteScope';

// The daily Housekeeping/Food Safety Escalations queue used to live here
// as its own tab with a single Approve/Deny action, separate from Ops
// Logs' named sign-off chains. It's been merged into Ops Logs (see
// OpsLogsTab.tsx / opsLogsCatalog.ts's SIGNOFF_CHAINS): every submission
// — including Gemba Walk — now goes through a chain, with the same
// Stamp/Reject actions in one place, instead of two review screens for
// what a Manager experiences as the same job. OpsLogsTab already handles
// GENERAL_MANAGER seeing both departments (below), so nothing else here
// needed to change to absorb Escalations' old scope.
export function ManagerPortal({ store }: { store: ReturnType<typeof useAppStore> }) {
  const { t } = useTranslation();
  const { currentUser, submissions, warnings, sites, users } = store;
  // GENERAL_MANAGER is site-wide leadership (GM, Deputy GM, HR & GA, COC,
  // SPCS, etc.) — it sits above both departments rather than inside one,
  // so it gets the Food Safety Manager's Inspections access *and* both
  // departments' Ops Logs queue, below.
  const isGeneralManager = currentUser?.role === 'GENERAL_MANAGER';
  const isFoodSafety = currentUser?.role === 'FOOD_SAFETY_MANAGER' || isGeneralManager;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'OPS_LOGS' | 'INSPECTIONS'>('DASHBOARD');

  // The Dashboard tab used to get the raw, unfiltered store data — every
  // site's submissions, blended together, regardless of who was looking at
  // it. That meant a Housekeeping Manager at one site saw every other
  // site's scores too, not just their own, even though the review queue
  // was already correctly site-scoped. Same site scope, minus the
  // department filter (the Dashboard's whole point is one combined score,
  // not split by department yet — see the note in the system-map
  // artifact).
  const dashboardSubmissions = submissions.filter(s => userCanSeeSite(currentUser, s.siteId));
  const dashboardSites = sites.filter(s => userCanSeeSite(currentUser, s.id));
  // Warning has no siteId of its own (see types.ts) — it's tied to a
  // technician, so their site has to be looked up via the user list
  // instead of read straight off the warning.
  const dashboardWarnings = warnings.filter(w => userCanSeeSite(currentUser, users.find(u => u.id === w.technicianId)?.site));

  const tabs = [
    { id: 'DASHBOARD' as const, icon: LayoutDashboard, label: t('manager.tabAnalytics') },
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

        {activeTab === 'INSPECTIONS' && isFoodSafety && (
          <motion.div
            key="inspections"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <InspectionsTab store={store} department="FOOD_SAFETY" />
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
