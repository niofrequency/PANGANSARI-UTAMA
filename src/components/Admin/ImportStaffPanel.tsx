import { useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { functions, isFirebaseConfigured } from '../../lib/firebase';
import { readSpreadsheet } from '../../lib/spreadsheetReader';
import { extractEmployees, planImport, credentialsCsv, PlannedRow, SkipReason } from '../../lib/employeeImport';
import { User, UserRole } from '../../types';
import { cn } from '../../utils/cn';
import { localDateISO } from '../../utils/localDate';

type Store = ReturnType<typeof useAppStore>;
type Result = { staffId: string; status: 'created' | 'exists' | 'error'; password?: string; message?: string };

const BATCH = 100;

// Admin → Import Staff: upload PSU's HR employee list (.xlsx or .csv), see
// exactly who gets which role and location, then create every account in
// one go. Each new account gets a random password; the Admin downloads them
// once as a CSV to hand out. Staff log in with Staff ID (their HR number)
// + that password. See lib/employeeImport.ts for the role rules and
// bulkImportStaff in functions/src/index.ts for the server side.
export function ImportStaffPanel({ store }: { store: Store }) {
  const { t } = useTranslation();
  const { users, sites, addUser } = store;
  const [fileName, setFileName] = useState('');
  const [plan, setPlan] = useState<PlannedRow[] | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Result[] | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  const siteName = (id?: string) => sites.find(s => s.id === id)?.name || id || '';
  const toImport = useMemo(() => (plan || []).filter(p => !p.skip), [plan]);

  const onFile = async (file: File) => {
    setError(''); setPlan(null); setResults(null); setFileName(file.name);
    try {
      const sheets = await readSpreadsheet(file);
      const rows = extractEmployees(sheets);
      if (!rows) { setError(t('import.errorColumns')); return; }
      const existing = new Set<string>(users.map((u: User) => (u.staffCode || '').toUpperCase()).filter(Boolean));
      setPlan(planImport(rows, sites, existing));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(code === 'old-xls' ? t('import.errorOldXls') : t('import.errorRead'));
    }
  };

  const byRole = useMemo(() => {
    const m = new Map<UserRole, number>();
    for (const p of toImport) m.set(p.role!, (m.get(p.role!) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [toImport]);

  const skipped = useMemo(() => {
    const m = new Map<SkipReason, PlannedRow[]>();
    for (const p of plan || []) if (p.skip) m.set(p.skip, [...(m.get(p.skip) || []), p]);
    return m;
  }, [plan]);

  const noRoleTitles = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of skipped.get('no-role') || []) {
      const k = p.title.replace(/\s+(I{1,3}|IV|V)$/i, '');
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [skipped]);

  const run = async () => {
    if (toImport.length === 0) return;
    setRunning(true); setProgress(0); setError('');
    const all: Result[] = [];
    try {
      for (let i = 0; i < toImport.length; i += BATCH) {
        const batch = toImport.slice(i, i + BATCH);
        if (isFirebaseConfigured && functions) {
          const call = httpsCallable(functions, 'bulkImportStaff', { timeout: 540000 });
          const res = await call({ rows: batch.map(p => ({ staffId: p.staffId, name: p.name, site: p.siteId, role: p.role })) });
          all.push(...(res.data as { results: Result[] }).results);
        } else {
          // Demo mode (no Firebase): create them locally so the flow can be tried.
          for (const p of batch) {
            const password = Math.random().toString(36).slice(2, 10);
            const [firstName, ...rest] = p.name.split(/\s+/);
            const r = await addUser({ name: p.name, firstName, lastName: rest.join(' '), email: `${p.staffId.toLowerCase()}@staff.psu.local`, role: p.role!, site: p.siteId! }, password, { staffCode: p.staffId });
            all.push({ staffId: p.staffId, status: r.ok ? 'created' : 'error', password: r.ok ? password : undefined, message: r.error });
            await new Promise(resolve => setTimeout(resolve, 0)); // let React render between local updates
          }
        }
        setProgress(Math.min(toImport.length, i + BATCH));
      }
    } catch (err) {
      console.error('bulkImportStaff failed:', err);
      setError(t('import.errorServer'));
    }
    setResults(all);
    setRunning(false);
    if (all.some(r => r.status === 'created')) downloadCredentials(all);
  };

  const downloadCredentials = (res: Result[] = results || []) => {
    const byId = new Map<string, PlannedRow>(toImport.map(p => [p.staffId, p] as [string, PlannedRow]));
    const csv = credentialsCsv(res.filter(r => r.status === 'created' && r.password).map(r => {
      const p = byId.get(r.staffId)!;
      return { staffId: r.staffId, name: p.name, siteName: siteName(p.siteId), roleLabel: t(`roles.${p.role}`), password: r.password! };
    }));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `PSU_staff_logins_${localDateISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const created = results?.filter(r => r.status === 'created').length || 0;
  const existed = results?.filter(r => r.status === 'exists').length || 0;
  const failed = results?.filter(r => r.status === 'error') || [];

  return (
    <div className="space-y-6 md:max-w-4xl">
      <div className="card space-y-3">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="text-psu-green shrink-0" size={22} />
          <div className="text-xs text-psu-gray/70 leading-relaxed">
            <p className="font-bold text-psu-gray text-sm mb-1">{t('import.title')}</p>
            <p>{t('import.intro')}</p>
          </div>
        </div>
        <label className={cn('flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-psu-green/40 text-psu-green font-black text-[11px] uppercase tracking-widest cursor-pointer hover:bg-psu-green/5', running && 'opacity-50 pointer-events-none')}>
          <Upload size={16} /> {fileName || t('import.chooseFile')}
          <input type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        </label>
        {error && (
          <div className="flex items-start gap-2 p-3 bg-psu-rejected/5 text-psu-rejected text-xs rounded-xl font-medium">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
      </div>

      {plan && !results && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              [t('import.statRows'), plan.length],
              [t('import.statNew'), toImport.length],
              [t('import.statExisting'), skipped.get('exists')?.length || 0],
              [t('import.statSkipped'), plan.length - toImport.length - (skipped.get('exists')?.length || 0)],
            ].map(([label, n]) => (
              <div key={String(label)} className="card !p-4 text-center">
                <p className="text-2xl font-black text-psu-gray">{n}</p>
                <p className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="card space-y-2">
            <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('import.byRole')}</p>
            {byRole.map(([role, n]) => (
              <div key={role} className="flex justify-between text-sm border-b border-psu-gray/5 py-1.5">
                <span className="text-psu-gray font-medium">{t(`roles.${role}`)}</span>
                <span className="font-black text-psu-gray">{n}</span>
              </div>
            ))}
          </div>

          {plan.length - toImport.length > 0 && (
            <div className="card space-y-2">
              <button onClick={() => setShowSkipped(s => !s)} className="w-full flex justify-between items-center text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">
                <span>{t('import.skippedTitle')}</span><span>{showSkipped ? '−' : '+'}</span>
              </button>
              <p className="text-[11px] text-psu-gray/50">{t('import.skippedHint')}</p>
              {showSkipped && (
                <div className="space-y-3 text-xs">
                  {(['exists', 'no-role', 'unknown-location', 'duplicate-id', 'bad-id', 'no-id'] as SkipReason[]).filter(r => skipped.get(r)?.length).map(r => (
                    <div key={r}>
                      <p className="font-bold text-psu-gray">{t(`import.skip.${r}`)} — {skipped.get(r)!.length}</p>
                      {r === 'no-role' ? (
                        <p className="text-psu-gray/60 mt-1">{noRoleTitles.map(([title, n]) => `${title} (${n})`).join(' · ')}</p>
                      ) : r === 'unknown-location' ? (
                        <p className="text-psu-gray/60 mt-1">{[...new Set(skipped.get(r)!.map(p => p.locationText))].join(' · ')}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card !p-0 overflow-hidden">
            <p className="px-4 pt-4 text-[10px] font-black text-psu-gray/40 uppercase tracking-widest">{t('import.preview')}</p>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="text-[9px] font-black text-psu-gray/40 uppercase tracking-widest text-left">
                  <tr><th className="px-4 py-2">ID</th><th className="px-2 py-2">{t('admin.firstNameLabel')}</th><th className="px-2 py-2">{t('admin.siteLabel')}</th><th className="px-2 py-2">{t('import.jobTitle')}</th><th className="px-2 py-2">{t('admin.roleLabel')}</th></tr>
                </thead>
                <tbody>
                  {toImport.slice(0, 50).map(p => (
                    <tr key={p.staffId} className="border-t border-psu-gray/5">
                      <td className="px-4 py-1.5 font-mono">{p.staffId}</td>
                      <td className="px-2 py-1.5">{p.name}</td>
                      <td className="px-2 py-1.5">{siteName(p.siteId)}</td>
                      <td className="px-2 py-1.5 text-psu-gray/60">{p.title}</td>
                      <td className="px-2 py-1.5 font-bold">{t(`rolesShort.${p.role}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {toImport.length > 50 && <p className="px-4 py-2 text-[10px] text-psu-gray/40">{t('import.previewMore', { count: toImport.length - 50 })}</p>}
          </div>

          <div className="card space-y-3">
            <p className="text-[11px] text-psu-warning font-medium flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {t('import.passwordWarning')}</p>
            <button
              onClick={run}
              disabled={running || toImport.length === 0}
              className="w-full py-4 bg-psu-green text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-psu-green/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Users size={16} />
              {running ? t('import.running', { done: progress, total: toImport.length }) : t('import.createButton', { count: toImport.length })}
            </button>
            {running && (
              <div className="h-2 bg-psu-bg rounded-full overflow-hidden">
                <div className="h-full bg-psu-green transition-all" style={{ width: `${(progress / Math.max(1, toImport.length)) * 100}%` }} />
              </div>
            )}
          </div>
        </>
      )}

      {results && (
        <div className="card space-y-3">
          <p className="flex items-center gap-2 text-sm font-bold text-psu-gray"><CheckCircle2 className="text-psu-green" size={18} /> {t('import.doneTitle')}</p>
          <p className="text-xs text-psu-gray/70">{t('import.doneBody', { created, existed, failed: failed.length })}</p>
          {failed.length > 0 && (
            <p className="text-[11px] text-psu-rejected">{failed.slice(0, 20).map(f => `${f.staffId} (${f.message})`).join(', ')}</p>
          )}
          {created > 0 && (
            <button onClick={() => downloadCredentials()} className="w-full py-3 rounded-2xl bg-psu-blue text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
              <Download size={16} /> {t('import.downloadAgain')}
            </button>
          )}
          <p className="text-[11px] text-psu-warning font-medium">{t('import.passwordWarning')}</p>
        </div>
      )}
    </div>
  );
}
