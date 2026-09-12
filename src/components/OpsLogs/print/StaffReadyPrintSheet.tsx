import { Submission } from '../../../types';
import { OpsPrintHeader, OpsItemsTable, OpsPrintSignoff } from './opsPrintShared';

// Checklist Persiapan Diri Karyawan — a daily crew-readiness roster. Only
// the aggregate ready/not-ready flag per worker survives on `items` (the
// fill form doesn't keep each of the 19 individual marks — see
// StaffReadyForm.tsx), so this prints one row per worker rather than the
// paper's own per-criterion columns.
export function StaffReadyPrintSheet({ submission }: { submission: Submission }) {
  const shift = submission.meta?.shift;

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader
        title="Checklist Persiapan Diri Karyawan"
        formId="STAFF_READY"
        submission={submission}
        extra={shift ? [{ label: 'Shift', value: shift === 'day' ? 'Day' : 'Night' }] : undefined}
      />
      <OpsItemsTable submission={submission} />
      <p className="mt-1" style={{ fontSize: '7px' }}>Reading: OK = ready to work on every point checked; X = at least one point failed (see Notes).</p>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
