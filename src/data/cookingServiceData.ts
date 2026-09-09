// UF.09001 Cooking & Service Checklist rev 06. Cooked meal must reach
// >=75C; holding >=20 seconds (not separately tracked as a field — the
// paper treats it as a rule for the cook, not a number to record). Rows
// are shown per meal period, only for the meals actually cooked that day.

export const COOK_MIN_TEMP_C = 75;

export const MEAL_PERIODS = [
  { id: 'breakfast', labelId: 'Sarapan', labelEn: 'Breakfast' },
  { id: 'lunch', labelId: 'Makan Siang', labelEn: 'Lunch' },
  { id: 'dinner', labelId: 'Makan Malam', labelEn: 'Dinner' },
  { id: 'late_supper', labelId: 'Makan Malam Larut', labelEn: 'Late Supper' },
] as const;
export type MealPeriodId = typeof MEAL_PERIODS[number]['id'];

export const COOKING_SERVICE_ROWS = [
  { id: 'soups', labelId: 'Sup (Appetizer)', labelEn: 'Soups (Appetizer)' },
  { id: 'meat', labelId: 'Daging/Pork (Maincourse)', labelEn: 'Meat/Pork (Maincourse)' },
  { id: 'poultry', labelId: 'Unggas (Maincourse)', labelEn: 'Poultry (Maincourse)' },
  { id: 'egg', labelId: 'Olahan Telur (Maincourse)', labelEn: 'Egg Dish (Maincourse)' },
  { id: 'fish', labelId: 'Ikan (Maincourse)', labelEn: 'Fish (Maincourse)' },
  { id: 'vegetables', labelId: 'Sayuran (Maincourse)', labelEn: 'Vegetables (Maincourse)' },
  { id: 'potatoes', labelId: 'Kentang (Maincourse)', labelEn: 'Potatoes (Maincourse)' },
  { id: 'rice', labelId: 'Nasi', labelEn: 'Rice' },
  { id: 'bubur', labelId: 'Bubur', labelEn: 'Porridge (Bubur)' },
  { id: 'pasta', labelId: 'Pasta', labelEn: 'Pasta' },
] as const;
export type CookingServiceRowId = typeof COOKING_SERVICE_ROWS[number]['id'];

// Installation code — circled on the paper, one per row.
export const INSTALLATION_CODES = [
  { id: '1', labelId: 'Bainmarie', labelEn: 'Bainmarie' },
  { id: '2', labelId: 'Chafing Dish', labelEn: 'Chafing Dish' },
  { id: '3', labelId: 'Table Top', labelEn: 'Table Top' },
] as const;
export type InstallationCode = typeof INSTALLATION_CODES[number]['id'];
