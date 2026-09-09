// UF.09000 Hot Packed Meal Checklist — same kitchen family and 75C rule as
// Cooking & Service (cookingServiceData.ts), different pack workflow:
// cooking -> holding/installation -> packing, each with its own time (and
// temp, except packing which is organoleptic only).

export const HOT_PACK_TYPES = [
  { id: '1', labelId: 'Wrapped', labelEn: 'Wrapped' },
  { id: '2', labelId: 'Paper Box', labelEn: 'Paper Box' },
  { id: '3', labelId: 'Gastronorm Pans', labelEn: 'Gastronorm Pans' },
  { id: '4', labelId: 'Combo Box', labelEn: 'Combo Box' },
] as const;
export type HotPackTypeId = typeof HOT_PACK_TYPES[number]['id'];

export const HOT_PACK_MEAL_PERIODS = [
  { id: 'breakfast', labelId: 'Sarapan', labelEn: 'Breakfast' },
  { id: 'lunch', labelId: 'Makan Siang', labelEn: 'Lunch' },
  { id: 'dinner', labelId: 'Makan Malam', labelEn: 'Dinner' },
  { id: 'supper', labelId: 'Supper', labelEn: 'Supper' },
] as const;
export type HotPackMealPeriodId = typeof HOT_PACK_MEAL_PERIODS[number]['id'];

export const HOT_PACK_ROWS = [
  { id: 'rice', labelId: 'Nasi', labelEn: 'Rice' },
  { id: 'meat', labelId: 'Maincourse - Daging', labelEn: 'Maincourse - Meat' },
  { id: 'chicken', labelId: 'Maincourse - Ayam', labelEn: 'Maincourse - Chicken' },
  { id: 'fish', labelId: 'Maincourse - Ikan', labelEn: 'Maincourse - Fish' },
  { id: 'vegetables', labelId: 'Maincourse - Sayuran', labelEn: 'Maincourse - Vegetables' },
] as const;
export type HotPackRowId = typeof HOT_PACK_ROWS[number]['id'];
