import { describe, expect, it } from 'vitest';
import { canChatRoles, canStillEdit } from '../../src/lib/chatPolicy';

describe('chat policy', () => {
  it('frontline ↔ supervisor yes, frontline ↔ frontline no', () => {
    expect(canChatRoles('FOOD_SAFETY_TECHNICIAN', 'FOOD_SAFETY_SUPERVISOR')).toBe(true);
    expect(canChatRoles('FOOD_SAFETY_TECHNICIAN', 'HOUSEKEEPER')).toBe(false);
  });
  it('no cross-department chat below the GM', () => {
    expect(canChatRoles('HOUSEKEEPING_SUPERVISOR', 'FOOD_SAFETY_TECHNICIAN')).toBe(false);
  });
  it('messages are editable for 15 minutes only', () => {
    const now = Date.now();
    expect(canStillEdit(new Date(now - 5 * 60e3).toISOString(), now)).toBe(true);
    expect(canStillEdit(new Date(now - 20 * 60e3).toISOString(), now)).toBe(false);
  });
});
