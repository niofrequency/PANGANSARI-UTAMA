// UF.10000 Temperature Control Checklist — master list of dry/freezer/
// chiller assets per site. The paper is one sheet per container for the
// whole month, five daily slots (08/12/16/20/24) each with a temp +
// paraf; the app keeps one submission per asset per DAY (see
// TempControlForm.tsx's header comment) and lets the desktop grid
// aggregate a month of those into the paper's own shape.
//
// Restored from git history (removed by request, then brought back per
// PSU_Paper_Speed_Forms_PRD.md — paper is still in live use). Seeded
// from the source photos (Melati site): Chiller 3, Chiller 05, Chiller
// 4, Freezer Box — all photographed at the same location. Add more
// assets/sites here as PSU shares them; this is a static catalog, not
// admin-editable in v1 (same tradeoff as SITES in mockData.ts).

export type StoreKind = 'dry' | 'freezer' | 'chiller';

export interface TempControlAsset {
  id: string;
  name: string;
  kind: StoreKind;
  siteId: string;
  locationLabel: string;
}

// Paper limits (PRD 4.1): Dry <=25C, Freezer -18C, Chiller <=4C. Freezer's
// limit is a target, not a ceiling — flag any reading *warmer* than -18.
export const TEMP_LIMITS: Record<StoreKind, { check: (c: number) => boolean; label: string }> = {
  dry: { check: (c) => c <= 25, label: '<=25C' },
  freezer: { check: (c) => c <= -18, label: '-18C' },
  chiller: { check: (c) => c <= 4, label: '<=4C' },
};

export const TEMP_CONTROL_SLOTS = ['08', '12', '16', '20', '24'] as const;
export type TempControlSlot = typeof TEMP_CONTROL_SLOTS[number];

export const TEMP_CONTROL_ASSETS: TempControlAsset[] = [
  { id: 'melati-chiller-3', name: 'Chiller 3', kind: 'chiller', siteId: 'site-melatimess', locationLabel: 'Melati Mess Hall' },
  { id: 'melati-chiller-05', name: 'Chiller 05', kind: 'chiller', siteId: 'site-melatimess', locationLabel: 'Melati Mess Hall' },
  { id: 'melati-chiller-4', name: 'Chiller 4', kind: 'chiller', siteId: 'site-melatimess', locationLabel: 'Melati Mess Hall' },
  { id: 'melati-freezer-box', name: 'Freezer Box', kind: 'freezer', siteId: 'site-melatimess', locationLabel: 'Melati Mess Hall' },
];

export function assetsForSite(siteId?: string): TempControlAsset[] {
  if (!siteId) return TEMP_CONTROL_ASSETS;
  const own = TEMP_CONTROL_ASSETS.filter(a => a.siteId === siteId);
  // Demo data seeds most accounts on generic site-1/site-2 ids that don't
  // match the photographed site — fall back to the full catalog rather
  // than showing an empty picker, same as the original TempControlForm.
  return own.length > 0 ? own : TEMP_CONTROL_ASSETS;
}

// The current hour maps to the nearest slot at or after it, so a reading
// taken at, say, 09:20 defaults to the 12:00 slot rather than 08:00 (the
// slot that's already passed). Falls back to '24' after 20:00.
export function currentTempSlot(): TempControlSlot {
  const hour = new Date().getHours();
  if (hour < 8) return '08';
  if (hour < 12) return '12';
  if (hour < 16) return '16';
  if (hour < 20) return '20';
  return '24';
}
