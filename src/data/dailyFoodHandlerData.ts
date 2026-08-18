// Transcribed verbatim from the source workbook
// "Form_Daily_Food_Handler_Assessment_Checklist.xlsx" (Sheet1, header row 8,
// group headers row 6). Two columns (Jumlah Jam Tidur, Mengkonsumsi Obat)
// have no English label in the source, so `labelEn` is left unset for those
// rather than invented; every other column gives its own English term with
// the Indonesian gloss in parentheses, which is what's captured as
// `labelId` here (parentheses stripped, whitespace collapsed — the source
// pads several of these with long runs of spaces, e.g. "WOUNDED<...>( LUKA)"
// — that padding isn't meaningful content, so it's not preserved). Spelling
// quirks in the source (e.g. "JEWERLY") are kept as-is.
//
// The source's own mark convention (row 32): "(v) Good/ appropriate as
// standard , (x) not appropriate with standard" — a plain two-state mark
// per cell, unlike the 3/4-way ratings in the other two checklists.

export interface DailyFoodHandlerCriterion {
  id: string;
  labelEn?: string;
  labelId: string;
}

export interface DailyFoodHandlerGroup {
  key: 'wellness' | 'personalHygiene' | 'ppe';
  titleEn: string;
  criteria: DailyFoodHandlerCriterion[];
}

export const DAILY_FOOD_HANDLER_GROUPS: DailyFoodHandlerGroup[] = [
  {
    key: 'wellness',
    titleEn: 'Wellness',
    criteria: [
      { id: 'sleepHours', labelId: 'Jumlah Jam Tidur' },
      { id: 'medication', labelId: 'Mengkonsumsi Obat' },
      { id: 'itching', labelEn: 'ITCHING', labelId: 'gatal' },
      { id: 'nauseaVomiting', labelEn: 'NAUSEA/ VOMITING', labelId: 'mual/ muntah' },
      { id: 'diarrhea', labelEn: 'DIARRHEA', labelId: 'diare' },
      { id: 'commonCold', labelEn: 'COMMON COLD', labelId: 'flu biasa' },
      { id: 'cough', labelEn: 'COUGH', labelId: 'batuk' },
      { id: 'wounded', labelEn: 'WOUNDED', labelId: 'LUKA' },
      { id: 'soreEyes', labelEn: 'SORE EYES', labelId: 'sakit mata' },
    ],
  },
  {
    key: 'personalHygiene',
    titleEn: 'Personal Hygiene',
    criteria: [
      { id: 'bodyOdor', labelEn: 'BODY ODOR', labelId: 'aroma badan normal' },
      { id: 'hair', labelEn: 'HAIR', labelId: 'pendek, bersih' },
      { id: 'mustacheBeard', labelEn: 'Mustache/ Beard', labelId: 'tidak berkumis/ jenggot' },
      { id: 'skin', labelEn: 'SKIN', labelId: 'kulit' },
      { id: 'nails', labelEn: 'NAILS', labelId: 'kuku pendek, bersih' },
      { id: 'jewelry', labelEn: 'JEWERLY', labelId: 'tidak bercincin, bergelang, berjam tangan' },
    ],
  },
  {
    key: 'ppe',
    titleEn: 'PPE',
    criteria: [
      { id: 'hairnet', labelEn: 'HAIRNET', labelId: 'ber hairnet/ bertopi kerja' },
      { id: 'shirtTrousers', labelEn: 'SHIRT & TROUSERS', labelId: 'pakaian kerja bersih rapih' },
      { id: 'apron', labelEn: 'APRON', labelId: 'apronbersih' },
      { id: 'shoes', labelEn: 'SHOES', labelId: 'sepatu kerja bersih, terawat, baik' },
    ],
  },
];

export const DAILY_FOOD_HANDLER_ALL_CRITERIA: DailyFoodHandlerCriterion[] =
  DAILY_FOOD_HANDLER_GROUPS.flatMap(g => g.criteria);
