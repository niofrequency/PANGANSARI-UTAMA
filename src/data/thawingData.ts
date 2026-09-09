// UN.00.43 Checklist of Thawing Process. Product temperature must be
// <=4C when the batch is used. Source photo is blank (a template, not a
// filled example) — no sample numbers to carry over.

export const THAWING_METHODS = [
  { id: '1', labelId: '<=4 jam air mengalir (max 21C)', labelEn: '<=4 hrs running water (max 21C)' },
  { id: '2', labelId: 'Max 3 hari ruang chiller', labelEn: 'Max 3 days chiller room' },
  { id: '3', labelId: 'Kombinasi chiller + air mengalir (<=4 jam)', labelEn: 'Combination chiller + running water (<=4 hrs)' },
  { id: '4', labelId: 'Mesin defrosting', labelEn: 'Defrosting machine' },
] as const;
export type ThawMethodId = typeof THAWING_METHODS[number]['id'];

export const THAW_PRODUCT_CATEGORIES = [
  { id: 'poultry', labelId: 'Unggas', labelEn: 'Poultry' },
  { id: 'meat', labelId: 'Daging', labelEn: 'Meat' },
  { id: 'fish', labelId: 'Ikan dan Seafood', labelEn: 'Fish and Seafood' },
  { id: 'precooked', labelId: 'Pre-cooked', labelEn: 'Pre-cooked' },
  { id: 'other', labelId: 'Lain-lain', labelEn: 'Other' },
] as const;
export type ThawProductCategoryId = typeof THAW_PRODUCT_CATEGORIES[number]['id'];

export const THAW_USED_FOR = [
  { id: 'B', labelId: 'Sarapan (B)', labelEn: 'Breakfast (B)' },
  { id: 'L', labelId: 'Makan Siang (L)', labelEn: 'Lunch (L)' },
  { id: 'D', labelId: 'Makan Malam (D)', labelEn: 'Dinner (D)' },
] as const;

export const THAW_PRODUCT_TEMP_LIMIT_C = 4;
