import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { useTranslation } from '../../../i18n/LanguageContext';
import { Submission, User } from '../../../types';
import { cn } from '../../../utils/cn';

// "Print form" button for a fill form: prints that form's paper-replica
// sheet (see print/*PrintSheet.tsx), filled with whatever has been entered
// so far — not a screenshot of the app screen. On click, the sheet is
// portalled next to #root and index.css's print rules hide the app itself,
// so only the paper sheet reaches the printer. The sheet is only mounted
// while printing.
export function PaperPrintButton({ renderSheet, className }: {
  renderSheet: () => ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener('afterprint', done);
    // Let the portal paint (and the logo image load) before the dialog opens.
    const timer = setTimeout(() => window.print(), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPrinting(true)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-full bg-psu-blue/10 text-psu-blue text-[10px] font-black uppercase tracking-wider hover:bg-psu-blue/20 transition-colors shrink-0 print:hidden',
          className,
        )}
      >
        <Printer size={15} />
        {t('layout.printForm')}
      </button>
      {printing && createPortal(
        <div className="psu-print-portal hidden print:block">{renderSheet()}</div>,
        document.body,
      )}
    </>
  );
}

// A not-yet-submitted Submission built from a form's current state, so a
// print sheet can render it exactly like a saved one.
export function draftSubmission(opts: {
  user: User | null;
  type: Submission['type'];
  siteId: string;
  siteName: string;
  items?: Submission['items'];
  meta?: Submission['meta'];
  base?: Submission; // an existing submission being edited/continued
  id?: string;
}): Submission {
  const now = new Date().toISOString();
  const { user, base } = opts;
  return {
    ...(base || {}),
    id: base?.id || opts.id || 'draft',
    userId: base?.userId || user?.id || '',
    userName: base?.userName || user?.name || '',
    role: base?.role || (user?.role as Submission['role']),
    siteId: opts.siteId,
    siteName: opts.siteName,
    timestamp: base?.timestamp || now,
    type: opts.type,
    status: base?.status || 'PENDING',
    items: opts.items ?? base?.items ?? [],
    meta: {
      ...(base?.meta || {}),
      ...(opts.meta || {}),
      signoff: base?.meta?.signoff || (user ? { draftedBy: { userId: user.id, name: user.name, staffCode: user.staffCode, at: now } } : undefined),
    },
  } as Submission;
}
