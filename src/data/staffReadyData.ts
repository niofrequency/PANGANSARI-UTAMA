// Checklist Persiapan Diri Karyawan — a daily crew-readiness roster. Close
// to, but deliberately not merged with, the Daily Food Handler Assessment
// (Inspections tab) — different columns, different source sheet (PRD
// section 4.7 / "Persiapan Diri is close to DFH but not the same sheet").

export const STAFF_READY_POSITIONS = [
  { id: 'C', labelId: 'Cook (C)', labelEn: 'Cook (C)' },
  { id: 'AC', labelId: 'Asst Cook (AC)', labelEn: 'Asst Cook (AC)' },
  { id: 'MA', labelId: 'Mess Attendant (MA)', labelEn: 'Mess Attendant (MA)' },
  { id: 'GP', labelId: 'General Purpose (GP)', labelEn: 'General Purpose (GP)' },
] as const;
export type StaffReadyPosition = typeof STAFF_READY_POSITIONS[number]['id'];

export interface StaffReadyGroup {
  key: string;
  titleId: string;
  titleEn: string;
  // 'yn' = Y/T (Ya/Tidak) items; 'bcj' = B/C/J (Baik/Cukup/Jelek) items
  markType: 'yn' | 'bcj';
  items: { id: string; labelId: string; labelEn: string }[];
}

export const STAFF_READY_GROUPS: StaffReadyGroup[] = [
  {
    key: 'kelengkapan',
    titleId: 'Kelengkapan',
    titleEn: 'Equipment / Attire',
    markType: 'yn',
    items: [
      { id: 'uniform', labelId: 'Uniform', labelEn: 'Uniform' },
      { id: 'sepatu', labelId: 'Sepatu', labelEn: 'Shoes' },
      { id: 'topi', labelId: 'Topi', labelEn: 'Hat' },
      { id: 'dasi', labelId: 'Dasi', labelEn: 'Tie' },
      { id: 'apron', labelId: 'Apron', labelEn: 'Apron' },
      { id: 'gloves', labelId: 'Hand glove', labelEn: 'Hand glove' },
    ],
  },
  {
    key: 'hygiene',
    titleId: 'Hygiene & Sanitasi',
    titleEn: 'Hygiene & Sanitation',
    markType: 'bcj',
    items: [
      { id: 'bau_badan', labelId: 'Bau badan', labelEn: 'Body odor' },
      { id: 'rambut', labelId: 'Rambut', labelEn: 'Hair' },
      { id: 'jenggot', labelId: 'Jenggot', labelEn: 'Beard' },
      { id: 'kumis', labelId: 'Kumis', labelEn: 'Mustache' },
      { id: 'kuku_kotor', labelId: 'Kuku kotor', labelEn: 'Dirty nails' },
      { id: 'perhiasan', labelId: 'Perhiasan', labelEn: 'Jewelry' },
    ],
  },
  {
    key: 'penyakit',
    titleId: 'Penyakit',
    titleEn: 'Illness',
    markType: 'yn',
    items: [
      { id: 'batuk', labelId: 'Batuk', labelEn: 'Cough' },
      { id: 'pilek', labelId: 'Pilek', labelEn: 'Runny nose' },
      { id: 'mata', labelId: 'Mata (merah)', labelEn: 'Eyes (red)' },
      { id: 'telinga', labelId: 'Telinga (cairan)', labelEn: 'Ears (discharge)' },
      { id: 'diare', labelId: 'Diare', labelEn: 'Diarrhea' },
      { id: 'mual', labelId: 'Mual & muntah', labelEn: 'Nausea & vomiting' },
      { id: 'kuku_kulit', labelId: 'Kuku & kulit', labelEn: 'Nails & skin' },
    ],
  },
];

export interface StaffReadyRow {
  id: string;
  userId?: string; // set when pulled from active users at this site
  name: string;
  gender?: string;
  position: StaffReadyPosition | '';
  marks: Record<string, string>; // keyed by item id above -> 'Y'|'T' or 'B'|'C'|'J'
  fhCardValid: boolean;
  bodyTempC: string;
  remark?: string;
}

export function emptyStaffReadyRow(id: string, name = '', userId?: string): StaffReadyRow {
  return { id, userId, name, gender: '', position: '', marks: {}, fhCardValid: true, bodyTempC: '', remark: '' };
}
