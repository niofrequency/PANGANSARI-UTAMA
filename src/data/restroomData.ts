// UN.00.45 Pembersihan Toilet (restroom). Three slots per calendar day —
// 08:00, 11:00, 16:00. Two groups of points with different mark sets: the
// cleanliness items (Bersih/Tidak/Rusak) and the supply items (Tersedia/
// Tidak/Rusak).

export const RESTROOM_SLOTS = ['08', '11', '16'] as const;
export type RestroomSlot = typeof RESTROOM_SLOTS[number];

export type RestroomConditionMark = 'bersih' | 'tidak' | 'rusak';
export type RestroomSupplyMark = 'tersedia' | 'tidak' | 'rusak';

export interface RestroomItem {
  id: string;
  labelId: string;
  labelEn: string;
}

export interface RestroomGroup {
  key: 'kondisi' | 'persediaan';
  titleId: string;
  titleEn: string;
  marks: readonly string[];
  items: RestroomItem[];
}

export const RESTROOM_GROUPS: RestroomGroup[] = [
  {
    key: 'kondisi',
    titleId: 'Kondisi Kebersihan',
    titleEn: 'Cleanliness Condition',
    marks: ['bersih', 'tidak', 'rusak'],
    items: [
      { id: 'wastafel', labelId: 'Wastafel', labelEn: 'Sink' },
      { id: 'closet', labelId: 'Closet', labelEn: 'Toilet bowl' },
      { id: 'lantai', labelId: 'Lantai', labelEn: 'Floor' },
      { id: 'pintu', labelId: 'Pintu', labelEn: 'Door' },
      { id: 'urinal', labelId: 'Urinal', labelEn: 'Urinal' },
      { id: 'shower', labelId: 'Shower', labelEn: 'Shower' },
      { id: 'dinding', labelId: 'Dinding/Fan/Cermin/Penerangan', labelEn: 'Wall / Fan / Mirror / Lighting' },
    ],
  },
  {
    key: 'persediaan',
    titleId: 'Persediaan',
    titleEn: 'Supplies',
    marks: ['tersedia', 'tidak', 'rusak'],
    items: [
      { id: 'tissue', labelId: 'Toilet paper & toilet ball', labelEn: 'Toilet paper & toilet ball' },
      { id: 'handsoap', labelId: 'Handsoap', labelEn: 'Hand soap' },
    ],
  },
];

// Restrooms/sections are typed free-text (e.g. "F", per the filled photo
// example) rather than a fixed catalog — the paper form itself has an
// open "Lokasi" field, not a dropdown of known sections.
export const RESTROOM_EXAMPLE_SECTION = 'F';
