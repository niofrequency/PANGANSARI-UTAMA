import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, RefreshCw } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { useTranslation } from '../../i18n/LanguageContext';

// Admin > Analytics: errors the app and Cloud Functions reported, grouped
// by kind (functions/src/monitoring.ts builds errorFingerprints hourly).
// Read on open + on refresh, not live — it's a status page, not a feed.

interface Fingerprint {
  id: string;
  message: string;
  source: string;
  path?: string;
  count: number;
  firstSeen?: Timestamp;
  lastSeen?: Timestamp;
  lastAppVersion?: string;
}

function ago(ts?: Timestamp): string {
  if (!ts) return '';
  const mins = Math.round((Date.now() - ts.toMillis()) / 60000);
  if (mins < 60) return `${mins}m`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export function AppHealthPanel() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Fingerprint[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'errorFingerprints'), orderBy('lastSeen', 'desc'), limit(15)));
      setRows(snap.docs.map((d) => ({ ...(d.data() as Omit<Fingerprint, 'id'>), id: d.id })));
    } catch (err) {
      console.error('AppHealthPanel load failed:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  if (!isFirebaseConfigured) return null;

  const recent = (rows || []).filter((r) => r.lastSeen && Date.now() - r.lastSeen.toMillis() < 24 * 3600 * 1000);

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity size={14} /> {t('health.title')}
        </h3>
        <button type="button" onClick={load} disabled={loading} aria-label={t('health.refresh')} className="p-1.5 rounded-lg text-psu-gray/40 hover:text-psu-gray disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {rows !== null && recent.length === 0 && (
        <p className="text-xs font-bold text-psu-gray/50 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-psu-green" /> {t('health.allGood')}
        </p>
      )}
      {(rows || []).length > 0 && (
        <div className="divide-y divide-psu-gray/5">
          {(rows || []).map((r) => (
            <div key={r.id} className="py-2.5">
              <p className="text-xs font-bold text-psu-gray break-words">{r.message}</p>
              <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest mt-0.5">
                {r.source === 'server' ? t('health.server') : t('health.app')} • ×{r.count} • {t('health.lastSeen', { ago: ago(r.lastSeen) })}
                {r.path ? ` • ${r.path}` : ''}{r.lastAppVersion ? ` • ${r.lastAppVersion}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-psu-gray/40">{t('health.hint')}</p>
    </div>
  );
}
