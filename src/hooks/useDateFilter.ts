import { useMemo, useState } from 'react';

export type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// The preset/from/to state + matching logic behind every "filter a list of
// timestamped things by date" screen — first built for SubmissionHistoryList
// (a filer's own History tab), now shared with AdminPortal's Activity tab so
// a Supervisor/Manager/Admin gets the exact same date filter reviewing OTHER
// people's checklists as a filer gets browsing their own.
export function useDateFilter() {
  const [preset, setPreset] = useState<DatePreset>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Stable across re-renders within one filter pass — callers typically use
  // this inside a `.filter(...)` over a list, not per-keystroke.
  const matches = useMemo(() => {
    const now = new Date();
    return (timestamp: string | number | Date) => {
      if (preset === 'all') return true;
      const ts = new Date(timestamp);
      if (preset === 'today') return isSameLocalDay(ts, now);
      if (preset === '7d') return now.getTime() - ts.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (preset === '30d') return now.getTime() - ts.getTime() <= 30 * 24 * 60 * 60 * 1000;
      // custom: an empty from/to side leaves that side unbounded.
      if (from && ts < new Date(from)) return false;
      if (to && ts.getTime() > new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    };
  }, [preset, from, to]);

  return { preset, setPreset, from, setFrom, to, setTo, matches };
}
