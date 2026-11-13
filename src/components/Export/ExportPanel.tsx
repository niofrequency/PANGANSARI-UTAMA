import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { Submission } from '../../types';
import { sitesForScope, userCanSeeSite } from '../../lib/siteScope';
import { OPS_LOG_DEFS, departmentOf, titleKeyForChainType } from '../../data/opsLogsCatalog';
import { SiteOptions } from '../SiteOptions';
import { isFirebaseConfigured } from '../../lib/firebase';
import { fetchSubmissionsInRange } from '../../services/exportService';
import { buildXlsx, toCsv, downloadBytes, Cell } from '../../lib/xlsxWriter';
import { localDateISO } from '../../utils/localDate';

type Store = ReturnType<typeof useAppStore>;
type Dept = 'HOUSEKEEPING' | 'FOOD_SAFETY';

// Bulk export of submissions for a date range — what an auditor or client
// asks for ("all temperature logs for October at Melati"). Two sheets:
// one row per submission (who, when, status, sign-offs), and one row per
// answered item (the actual readings/answers, with photo links). The
// per-form paper print sheets (OpsLogs/print/*) still exist for a single
// day's paper replica; this is the "give me everything" counterpart.

const ALL_TYPES: Submission['type'][] = [
  ...OPS_LOG_DEFS.map((d) => d.type), 'FOOD_SAFETY', 'HOUSEKEEPING', 'GEMBA_WALK', 'FOOD_SAFETY_INSPECTION', 'DAILY_FOOD_HANDLER',
];

function localDateTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return { date: localDateISO(d), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` };
}

function stampCols(st?: { name: string; at: string }): Cell[] {
  if (!st) return ['', ''];
  const { date, time } = localDateTime(st.at);
  return [st.name, `${date} ${time}`.trim()];
}

function answerCell(a: Submission['items'][number]['answer']): Cell {
  if (typeof a === 'boolean') return a ? 'Yes' : 'No';
  if (typeof a === 'number') return a;
  const n = Number(a);
  return a !== '' && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(String(a).trim()) ? n : a;
}

export function buildExportSheets(subs: Submission[], formName: (s: Submission) => string): { summary: Cell[][]; answers: Cell[][] } {
  const summary: Cell[][] = [[
    'Date', 'Time', 'Site', 'Form', 'Form ID', 'Asset / Section / Room', 'Filed by', 'Role', 'Status',
    'Score', 'Out of range', 'Checked by', 'Checked at', 'Approved by', 'Approved at', 'Verified by', 'Verified at',
    'Rejection reason', 'Remarks', 'Photo', 'Submission ID',
  ]];
  const answers: Cell[][] = [[
    'Date', 'Time', 'Site', 'Form', 'Asset / Section / Room', 'Filed by', 'Question', 'Answer', 'Remarks', 'Photo', 'Submission ID',
  ]];
  for (const s of subs) {
    if (s.deletedAt) continue;
    const { date, time } = localDateTime(s.timestamp);
    const m = s.meta || {};
    const where = [m.assetName, m.section ? `Section ${m.section}` : '', m.slot ? `${m.slot}:00` : '', m.barak, m.roomId, m.areaAudited]
      .filter(Boolean).join(' · ');
    const sign = m.signoff || {};
    const form = formName(s);
    summary.push([
      m.date || date, time, s.siteName, form, m.formId || '', where, s.userName, s.role, s.status,
      s.score ?? '', m.outOfRange ? 'Yes' : '',
      ...stampCols(sign.checkedBy), ...stampCols(sign.approvedBy), ...stampCols(sign.verifiedBy),
      s.rejectionReason || '', [m.dayRemarks, s.notes].filter(Boolean).join(' · '),
      m.photoUrl && !m.photoUrl.startsWith('data:') ? m.photoUrl : '', s.id,
    ]);
    for (const it of s.items || []) {
      answers.push([
        m.date || date, time, s.siteName, form, where, s.userName,
        it.question, answerCell(it.answer), [it.remarks, it.comment, it.correctiveAction].filter(Boolean).join(' · '),
        it.photoUrl && !it.photoUrl.startsWith('data:') ? it.photoUrl : '', s.id,
      ]);
    }
  }
  return { summary, answers };
}

const inputCls = 'w-full px-3 py-2.5 bg-white border border-psu-gray/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-psu-blue/20';
const labelCls = 'text-[10px] font-black text-psu-gray/40 uppercase tracking-widest';

export function ExportPanel({ store, department }: { store: Store; department?: Dept }) {
  const { t } = useTranslation();
  const { currentUser, sites } = store;
  const mySites = sites.filter((s) => userCanSeeSite(currentUser, s.id));
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState('ALL');
  const [type, setType] = useState<'ALL' | Submission['type']>('ALL');
  const [from, setFrom] = useState(localDateISO(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(localDateISO(now));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  if (!currentUser) return null;
  const types = ALL_TYPES.filter((ty) => !department || departmentOf({ type: ty, role: currentUser.role }) === department || ty === 'GEMBA_WALK');
  const formName = (s: Submission) => { const k = titleKeyForChainType(s.type); return k ? t(k) : s.type; };

  const run = async (format: 'xlsx' | 'csv') => {
    if (!from || !to || from > to) return;
    setBusy(true);
    setStatus('');
    try {
      // Local-day bounds → ISO instants.
      const fromISO = new Date(`${from}T00:00:00`).toISOString();
      const toISO = new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 3600 * 1000).toISOString();
      const scope = siteId === 'ALL' ? sitesForScope(currentUser) : [siteId];
      let subs: Submission[];
      let truncated = false;
      if (isFirebaseConfigured) {
        const res = await fetchSubmissionsInRange(scope, fromISO, toISO);
        subs = res.submissions;
        truncated = res.truncated;
      } else {
        subs = store.submissions.filter((s) => s.timestamp >= fromISO && s.timestamp < toISO);
      }
      subs = subs.filter((s) =>
        userCanSeeSite(currentUser, s.siteId)
        && (siteId === 'ALL' || s.siteId === siteId)
        && (type === 'ALL' || s.type === type)
        && (!department || departmentOf(s) === department)
      );
      const { summary, answers } = buildExportSheets(subs, formName);
      const site = siteId === 'ALL' ? 'all-sites' : (sites.find((x) => x.id === siteId)?.name || siteId);
      const base = `PSU_${type === 'ALL' ? 'submissions' : type}_${site}_${from}_to_${to}`.replace(/[^\w.-]+/g, '_');
      if (format === 'xlsx') {
        downloadBytes(buildXlsx([{ name: 'Submissions', rows: summary }, { name: 'Answers', rows: answers }]), `${base}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        downloadBytes(toCsv(answers), `${base}.csv`, 'text/csv;charset=utf-8');
      }
      setStatus(t('export.done', { count: summary.length - 1 }) + (truncated ? ` ${t('export.truncated')}` : ''));
    } catch (err) {
      console.error('Export failed:', err);
      setStatus(t('export.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-psu-gray/10 text-[10px] font-black uppercase tracking-widest text-psu-gray/70 hover:text-psu-gray">
        <FileSpreadsheet size={14} /> {t('export.open')}
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-psu-gray/40 uppercase tracking-[0.2em]">{t('export.title')}</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-psu-gray/50">{t('export.close')}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={labelCls}>{t('export.site')}</span>
          <select className={inputCls} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="ALL">{t('export.allSites')}</option>
            <SiteOptions sites={mySites} />
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>{t('export.form')}</span>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="ALL">{t('export.allForms')}</option>
            {types.map((ty) => { const k = titleKeyForChainType(ty); return <option key={ty} value={ty}>{k ? t(k) : ty}</option>; })}
          </select>
        </label>
        <label className="space-y-1">
          <span className={labelCls}>{t('history.fromLabel')}</span>
          <input type="date" className={inputCls} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className={labelCls}>{t('history.toLabel')}</span>
          <input type="date" className={inputCls} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {status && <span className="text-xs text-psu-gray/60 mr-auto">{status}</span>}
        <button type="button" disabled={busy} onClick={() => run('csv')} className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-psu-gray/10 disabled:opacity-40">
          CSV
        </button>
        <button type="button" disabled={busy} onClick={() => run('xlsx')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-psu-gray text-white disabled:opacity-40">
          <Download size={14} /> {busy ? t('export.working') : t('export.excel')}
        </button>
      </div>
    </div>
  );
}
