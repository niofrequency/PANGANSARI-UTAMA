// UN.00.51 Monitoring Suhu Dishwashing Mesin — month x 3 rounds, each
// round records Bilas (rinse) and Cuci (wash) temperatures. Limits:
// pencucian (wash) min 60C, pembilasan (rinse) min 80C.
//
// Restored from git history (removed by request, then brought back per
// PSU_Paper_Speed_Forms_PRD.md — paper is still in live use). Seeded
// location from the source photo: STEWARD. Same "static catalog"
// tradeoff as tempControlAssets.ts — add more locations here as PSU
// shares them.

export const DISHWASH_MIN_CUCI_C = 60;   // wash
export const DISHWASH_MIN_BILAS_C = 80;  // rinse

export const DISHWASH_ROUNDS = ['07', '12', '18'] as const;
export type DishwashRound = typeof DISHWASH_ROUNDS[number];

export interface DishwashLocation {
  id: string;
  name: string;
  siteId: string;
}

export const DISHWASH_LOCATIONS: DishwashLocation[] = [
  { id: 'melati-steward', name: 'STEWARD', siteId: 'site-melatimess' },
];

export function dishwashLocationsForSite(siteId?: string): DishwashLocation[] {
  if (!siteId) return DISHWASH_LOCATIONS;
  const own = DISHWASH_LOCATIONS.filter(l => l.siteId === siteId);
  return own.length > 0 ? own : DISHWASH_LOCATIONS;
}

// Same "round up to the next round" logic as tempControlAssets.ts's
// currentTempSlot(), just against the 07/12/18 boundaries instead.
export function currentDishwashRound(): DishwashRound {
  const hour = new Date().getHours();
  if (hour < 7) return '07';
  if (hour < 12) return '12';
  return '18';
}
