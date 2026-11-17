import { describe, expect, it } from 'vitest';
import { hasProblem } from '../../src/lib/problemRate';
import { log } from './fixtures';

describe('hasProblem', () => {
  it('a clean log has no problem', () => {
    expect(hasProblem(log({ items: [{ id: '1', question: 'q', answer: true }] }))).toBe(false);
  });
  it('a sent-back log is a problem', () => {
    expect(hasProblem(log({ status: 'REJECTED' }))).toBe(true);
  });
  it('a failed item is a problem', () => {
    expect(hasProblem(log({ items: [{ id: '1', question: 'q', answer: false }] }))).toBe(true);
    expect(hasProblem(log({ items: [{ id: '1', question: 'q', answer: 'Tidak' }] }))).toBe(true);
  });
  it('room cleaning: unticked with a reason is a logged exception, not a failure', () => {
    expect(hasProblem(log({ type: 'HOUSEKEEPING', items: [{ id: '1', question: 'q', answer: false, remarks: 'Room occupied' }] }))).toBe(false);
  });
  it('an out-of-range chiller reading is a problem', () => {
    const at = new Date().toISOString();
    expect(hasProblem(log({ type: 'TEMP_CONTROL', meta: { storeKind: 'chiller', tempReadings: { '08': { temp: '12', at, by: 'x' } } } as never }))).toBe(true);
  });
});
