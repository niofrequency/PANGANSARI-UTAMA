import { Submission, User, UserRole } from '../types';
import { SIGNOFF_CHAINS, SignoffChainType, SignoffStep } from '../data/opsLogsCatalog';

// One place for the rules of a log's life — who may stamp which step,
// and the activity history every log keeps. Used by the store (demo
// mode and before every Firestore write), by the review queues (so
// nobody is shown a stamp they can't make), and mirrored server-side by
// stampSubmissionTx (a Firestore transaction) and firestore.rules.

export type LogAction = 'submitted' | 'edited' | 'stamped' | 'sent_back' | 'resolved';

// One line of a log's activity history (meta.history, append-only).
export interface LogEvent {
  action: LogAction;
  at: string;
  by: { userId: string; name: string; role?: UserRole };
  step?: SignoffStep;
  note?: string;
  // sent_back: who has to fix it.
  to?: { name: string; role?: string; kind: 'filer' | 'reviewer' };
}

export function chainOf(s: Pick<Submission, 'type'>): SignoffStep[] {
  return (SIGNOFF_CHAINS as Record<string, SignoffStep[]>)[s.type as SignoffChainType] || [];
}

export function eventBy(user: Pick<User, 'id' | 'name' | 'role'>): LogEvent['by'] {
  return { userId: user.id, name: user.name, role: user.role };
}

export type StampProblem = 'not-pending' | 'own-log' | 'no-step' | 'already-stamped' | 'out-of-order' | 'stamped-other-step';

// Why `userId` may NOT stamp `step` on `s` (null = they may):
//   • only PENDING logs, never your own;
//   • steps in chain order, each once — a second reviewer arriving a
//     moment later gets 'already-stamped' instead of overwriting;
//   • separation of duties — one person never stamps two steps of the
//     same log (e.g. a Manager can't both approve and verify).
export function stampProblem(s: Submission, userId: string, step: SignoffStep): StampProblem | null {
  if (s.status !== 'PENDING') return 'not-pending';
  if (s.userId === userId) return 'own-log';
  const chain = chainOf(s);
  const i = chain.indexOf(step);
  if (i < 0) return 'no-step';
  const so = s.meta?.signoff || {};
  if (so[step]) return 'already-stamped';
  if (chain.slice(0, i).some(k => !so[k])) return 'out-of-order';
  if (chain.some(k => k !== step && so[k]?.userId === userId)) return 'stamped-other-step';
  return null;
}

// Older logs have no meta.history — rebuild what we can from the stamps
// and the last send-back so the activity list is never empty.
export function logTimeline(s: Submission): LogEvent[] {
  const h = s.meta?.history;
  if (h && h.length) return [...h].sort((a, b) => a.at.localeCompare(b.at));
  const out: LogEvent[] = [];
  const so = s.meta?.signoff;
  out.push({ action: 'submitted', at: so?.draftedBy?.at || s.timestamp, by: { userId: s.userId, name: so?.draftedBy?.name || s.userName, role: s.role } });
  const r = s.meta?.returned;
  if (r) {
    out.push({ action: 'sent_back', at: r.at, by: { userId: r.userId, name: r.name, role: r.role as UserRole }, note: r.note,
      to: r.to === 'reviewer' ? { name: r.toName || '', role: r.toRole, kind: 'reviewer' } : { name: s.userName, role: s.role, kind: 'filer' } });
    if (r.resolved) out.push({ action: 'resolved', at: r.resolved.at, by: { userId: r.resolved.userId, name: r.resolved.name }, note: r.resolved.note });
  }
  for (const step of chainOf(s)) {
    const st = so?.[step];
    if (st) out.push({ action: 'stamped', step, at: st.at, by: { userId: st.userId, name: st.name, role: st.role } });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
