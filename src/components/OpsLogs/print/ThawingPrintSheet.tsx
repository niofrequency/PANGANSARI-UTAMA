import { Submission } from '../../../types';
import { THAWING_METHODS, THAW_PRODUCT_TEMP_LIMIT_C } from '../../../data/thawingData';
import { OpsPrintHeader, OpsItemsTable, OpsPrintSignoff } from './opsPrintShared';

// UN.00.43 Checklist of Thawing Process. Rows are free-form batches, not a
// fixed catalog — no natural grouping beyond the one thawing method
// recorded for the whole submission (shown in the header).
export function ThawingPrintSheet({ submission }: { submission: Submission }) {
  const method = THAWING_METHODS.find((m) => m.id === submission.meta?.thawMethod);

  return (
    <div className="text-black" style={{ fontSize: '8px', lineHeight: 1.3 }}>
      <style>{`@page { size: portrait; margin: 10mm; }`}</style>
      <OpsPrintHeader
        title="Checklist of Thawing Process"
        formId="UN.00.43"
        submission={submission}
        extra={method ? [{ label: 'Method', value: `${method.labelId} / ${method.labelEn}` }] : undefined}
      />
      <p className="mb-1" style={{ fontSize: '7px' }}>Product temperature must be ≤{THAW_PRODUCT_TEMP_LIMIT_C}°C when the batch is used.</p>
      <OpsItemsTable submission={submission} />
      <p className="mt-1" style={{ fontSize: '7px', border: 0 }}>Reading = end temperature. Notes = time window · used for meal(s).</p>
      <OpsPrintSignoff submission={submission} />
    </div>
  );
}
