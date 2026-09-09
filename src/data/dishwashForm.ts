// UN.00.51 Monitoring Suhu Dishwashing Mesin — month x 3 shifts, each shift
// records Bilas (rinse) and Cuci (wash) temperatures. Limits: Pencucian
// (wash) min 60C, Pembilasan (rinse) min 80C.
//
// Seeded location from the source photo: STEWARD. Same "static catalog"
// tradeoff as tempControlAssets.ts — add more locations here as PSU shares
// them.

export const DISHWASH_MIN_CUCI_C = 60;   // wash
export const DISHWASH_MIN_BILAS_C = 80;  // rinse

export const DISHWASH_SHIFTS = ['07', '12', '18'] as const;
export type DishwashShift = typeof DISHWASH_SHIFTS[number];

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
  return DISHWASH_LOCATIONS.filter(l => l.siteId === siteId);
}

// Same "round up to the next shift" logic as tempControlAssets.ts's
// currentSlot(), just against the 07/12/18 shift boundaries instead.
export function currentDishwashShift(): DishwashShift {
  const hour = new Date().getHours();
  if (hour < 7) return '07';
  if (hour < 12) return '12';
  return '18';
}
