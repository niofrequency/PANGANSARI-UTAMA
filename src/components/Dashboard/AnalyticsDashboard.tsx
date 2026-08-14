import React, { useMemo } from 'react';
import { 
  XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { AlertCircle, Clock, BarChart3, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from '../../i18n/LanguageContext';

interface AnalyticsDashboardProps {
  submissions: any[];
  warnings: any[];
  sites: any[];
  users?: any[]; // optional so existing callers without it don't break; staffActive shows '—' if omitted
}

const ATTENTION_THRESHOLD = 85; // matches the "Optimal"/"Caution" cutoff used in the site list below

export function AnalyticsDashboard({ submissions, warnings, sites, users = [] }: AnalyticsDashboardProps) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const total = submissions.length;
    const avgScore = total ? submissions.reduce((acc, s) => acc + (s.score || 0), 0) / total : 0;
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      const daySubmissions = submissions.filter(s => new Date(s.timestamp).toDateString() === d.toDateString());
      const dayAvg = daySubmissions.length ? daySubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / daySubmissions.length : 0;
      return { name: dateStr, score: Math.round(dayAvg) };
    });

    const siteScores = sites.map(site => {
      const siteSubs = submissions.filter(s => s.siteId === site.id);
      const avg = siteSubs.length ? siteSubs.reduce((acc, s) => acc + (s.score || 0), 0) / siteSubs.length : 0;
      return { name: site.name, score: Math.round(avg), count: siteSubs.length };
    });

    const pendingCount = submissions.filter(s => s.status === 'PENDING').length;

    // Only flag sites that actually have data and are underperforming —
    // a site with zero submissions yet isn't "needs attention", it's just
    // "no data yet", so it's excluded here rather than shown as 0%/bad.
    const needsAttentionSites = siteScores
      .filter(s => s.count > 0 && s.score < ATTENTION_THRESHOLD)
      .sort((a, b) => a.score - b.score);

    return { total, avgScore, last7Days, siteScores, pendingCount, needsAttentionSites };
  }, [submissions, sites]);

  const activeStaffCount = users.filter(u => u.isActive).length;

  return (
    <div className="space-y-8">
      {/* High Level Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[28px] border border-psu-gray/5 shadow-xl shadow-psu-gray/5">
          <div className="w-10 h-10 bg-psu-green/10 rounded-xl flex items-center justify-center text-psu-green mb-4">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-1">{t('analytics.successRate')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-psu-gray">{Math.round(stats.avgScore)}</span>
            <span className="text-xs font-bold text-psu-green">%</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[28px] border border-psu-gray/5 shadow-xl shadow-psu-gray/5">
          <div className="w-10 h-10 bg-psu-rejected/10 rounded-xl flex items-center justify-center text-psu-rejected mb-4">
            <AlertCircle size={20} />
          </div>
          <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-1">{t('analytics.activeAlerts')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-psu-gray">{warnings.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[28px] border border-psu-gray/5 shadow-xl shadow-psu-gray/5">
          <div className="w-10 h-10 bg-psu-blue/10 rounded-xl flex items-center justify-center text-psu-blue mb-4">
            <Users size={20} />
          </div>
          <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-1">{t('analytics.staffActive')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-psu-gray">{users.length ? activeStaffCount : '—'}</span>
            {users.length > 0 && <span className="text-[10px] font-black text-psu-green ml-1 uppercase">{t('analytics.live')}</span>}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[28px] border border-psu-gray/5 shadow-xl shadow-psu-gray/5">
          <div className="w-10 h-10 bg-psu-gray/5 rounded-xl flex items-center justify-center text-psu-gray mb-4">
            <BarChart3 size={20} />
          </div>
          <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest mb-1">{t('analytics.totalLogs')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-psu-gray">{stats.total}</span>
            <span className="text-[10px] font-black text-psu-gray/30 ml-1 uppercase">{t('analyticsExtra.total')}</span>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="card p-8">
        <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] mb-8">{t('analytics.trendTitle')}</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.last7Days}>
              <XAxis dataKey="name" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
                  padding: '12px 16px'
                }}
                labelStyle={{ display: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#2C88D9" 
                strokeWidth={4} 
                dot={false}
                animationDuration={2000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-6 pt-6 border-t border-psu-gray/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-psu-blue"></div>
            <span className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('analytics.compliance')}</span>
          </div>
          <span className="text-[10px] font-black text-psu-gray/20 uppercase tracking-widest">{t('analytics.last7')}</span>
        </div>
      </div>

      {/* Site Comparison */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-psu-gray/30 uppercase tracking-[0.2em] px-2">{t('analytics.siteComparison')}</h3>
        <div className="grid gap-3">
          {stats.siteScores.map((site, idx) => (
            <div key={site.name} className="card flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-psu-bg rounded-2xl flex items-center justify-center text-psu-blue">
                  <span className="text-xs font-black">{idx + 1}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-psu-gray">{site.name}</h4>
                  <p className="text-[10px] text-psu-gray/40 font-bold uppercase tracking-widest">
                    {site.count > 0 ? t('analytics.systemActive') : t('analytics.noSubmissionsYet')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-psu-gray">{site.count > 0 ? `${site.score}%` : '—'}</div>
                {site.count > 0 && (
                  <div className={cn(
                    "text-[9px] font-black uppercase tracking-tighter",
                    site.score > ATTENTION_THRESHOLD ? "text-psu-green" : "text-psu-warning"
                  )}>
                    {site.score > ATTENTION_THRESHOLD ? t('analytics.optimal') : t('analytics.caution')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attention Panel — built from real data: underperforming sites
          (below ATTENTION_THRESHOLD, with actual submissions) and any
          submissions still awaiting review. */}
      {(stats.needsAttentionSites.length > 0 || stats.pendingCount > 0) ? (
        <div className="bg-psu-rejected/10 p-6 rounded-[32px] border border-psu-rejected/5">
          <h4 className="text-[10px] font-black text-psu-rejected uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {t('analytics.needsAttention')}
          </h4>
          <div className="space-y-3">
            {stats.needsAttentionSites.map(site => (
              <div key={site.name} className="bg-white p-4 rounded-2xl shadow-sm border border-psu-rejected/10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-psu-gray">{site.name}</p>
                  <p className="text-[10px] text-psu-gray/40 font-medium">{t('analytics.belowTarget', { threshold: ATTENTION_THRESHOLD })}</p>
                </div>
                <span className="text-xs font-black text-psu-rejected">{site.score}%</span>
              </div>
            ))}
            {stats.pendingCount > 0 && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-psu-gray/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-psu-gray">{t('analytics.pendingReview', { count: stats.pendingCount })}</p>
                </div>
                <Clock size={16} className="text-psu-warning" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-psu-green/5 p-6 rounded-[32px] border border-psu-green/10 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-psu-green shrink-0" />
          <p className="text-xs font-bold text-psu-gray">{t('analytics.allGood')}</p>
        </div>
      )}
    </div>
  );
}
