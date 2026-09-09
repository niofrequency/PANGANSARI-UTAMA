// Source: UN.00.65, "Daily Check List — Room Cleaning", revisi 00/01 Juni
// 2010, Departemen Housekeeping. 28 activities across 6 areas, each with a
// cadence — most are daily, a handful are weekly (linens) or monthly
// (windows, stairs/fence, fan, blankets). Indonesian source wording is kept
// verbatim on labelId (including the source's own spelling, e.g. "Cuertain",
// "Washafel") — see PSU_QR_JobDeepLink_PRD.md. labelEn is a plain-English
// gloss, not a certified translation.
//
// This replaces HousekeeperPortal.tsx's old 4 generic placeholder
// questions. The paper form is a 31-day-per-room grid signed off by three
// tiers (Room Boy → Supervisor → Manager); this app deliberately doesn't
// reproduce that grid (see PRD "Out of scope") — one submission is "this
// room, today," and cadence (see cadence.ts helpers used by
// HousekeeperPortal.tsx) decides which non-daily items are actually due.

export type RoomCleaningCadence = 'daily' | 'weekly' | 'monthly';
export type RoomCleaningGroupKey = '1' | '2' | '3' | '4' | '5' | '6';

export interface RoomCleaningItem {
  id: string; // '1.1' .. '6.2', matches the source form's numbering
  group: RoomCleaningGroupKey;
  labelId: string;
  labelEn: string;
  cadence: RoomCleaningCadence;
}

export interface RoomCleaningGroupDef {
  key: RoomCleaningGroupKey;
  titleId: string;
  titleEn: string;
}

export const ROOM_CLEANING_GROUPS: RoomCleaningGroupDef[] = [
  { key: '1', titleId: 'Umum', titleEn: 'General' },
  { key: '2', titleId: 'Kamar Tidur', titleEn: 'Bed Room' },
  { key: '3', titleId: 'Kamar Mandi', titleEn: 'Bath Room' },
  { key: '4', titleId: 'Ruang Tamu', titleEn: 'Living Room' },
  { key: '5', titleId: 'Dapur', titleEn: 'Kitchen' },
  { key: '6', titleId: 'Linens & Blanket', titleEn: 'Linens & Blanket' },
];

// One proof photo per submission (not per section) — see
// HousekeeperPortal.tsx.

export const ROOM_CLEANING_ITEMS: RoomCleaningItem[] = [
  // 1 — Umum / General
  { id: '1.1', group: '1', labelId: 'Pengambilan Cucian', labelEn: 'Laundry pickup', cadence: 'daily' },
  { id: '1.2', group: '1', labelId: 'Membuang Sampah', labelEn: 'Trash removal', cadence: 'daily' },
  { id: '1.3', group: '1', labelId: 'Membersihkan Lantai & Carpet', labelEn: 'Clean floor & carpet', cadence: 'daily' },
  { id: '1.4', group: '1', labelId: 'Membersihkan Koridor - Teras - Tangga', labelEn: 'Clean corridor - porch - stairs', cadence: 'daily' },
  { id: '1.5', group: '1', labelId: 'Membersihkan Pintu & Dinding', labelEn: 'Clean door & wall', cadence: 'daily' },
  { id: '1.6', group: '1', labelId: 'Pengembalian Cucian', labelEn: 'Laundry return', cadence: 'daily' },
  { id: '1.7', group: '1', labelId: 'Membersihkan Jendela', labelEn: 'Clean window', cadence: 'monthly' },
  { id: '1.8', group: '1', labelId: 'GC Tangga & Pagar', labelEn: 'General clean stairs & fence', cadence: 'monthly' },
  // 2 — Kamar Tidur / Bed Room
  { id: '2.1', group: '2', labelId: 'Mengatur Tempat Tidur', labelEn: 'Make bed', cadence: 'daily' },
  { id: '2.2', group: '2', labelId: 'Membersihkan Furniture', labelEn: 'Clean furniture', cadence: 'daily' },
  { id: '2.3', group: '2', labelId: 'Membersihkan Lampu', labelEn: 'Clean lamp', cadence: 'daily' },
  { id: '2.4', group: '2', labelId: 'Membersihkan Wall Heater', labelEn: 'Clean wall heater', cadence: 'daily' },
  // 3 — Kamar Mandi / Bath Room
  { id: '3.1', group: '3', labelId: 'Membersihkan Bak Mandi & Tap', labelEn: 'Clean bathtub & tap', cadence: 'daily' },
  { id: '3.2', group: '3', labelId: 'Membersihkan Gorden / Cuertain', labelEn: 'Clean curtain', cadence: 'daily' },
  { id: '3.3', group: '3', labelId: 'Membersihkan Toilet', labelEn: 'Clean toilet', cadence: 'daily' },
  { id: '3.4', group: '3', labelId: 'Membersihkan Cermin & Drawer', labelEn: 'Clean mirror & drawer', cadence: 'daily' },
  { id: '3.5', group: '3', labelId: 'Membersihkan Wastafel & Tap', labelEn: 'Clean sink & tap', cadence: 'daily' },
  { id: '3.6', group: '3', labelId: 'Membersihkan Fan', labelEn: 'Clean fan', cadence: 'monthly' },
  // 4 — Ruang Tamu / Living Room
  { id: '4.1', group: '4', labelId: 'Membersihkan Sofa', labelEn: 'Clean sofa', cadence: 'daily' },
  { id: '4.2', group: '4', labelId: 'Membersihkan Furniture', labelEn: 'Clean furniture', cadence: 'daily' },
  { id: '4.3', group: '4', labelId: 'Membersihkan Lampu', labelEn: 'Clean lamp', cadence: 'daily' },
  { id: '4.4', group: '4', labelId: 'Membersihkan Wall Heater', labelEn: 'Clean wall heater', cadence: 'daily' },
  // 5 — Dapur / Kitchen
  { id: '5.1', group: '5', labelId: 'Membersihkan Kompor', labelEn: 'Clean stove', cadence: 'daily' },
  { id: '5.2', group: '5', labelId: 'Membersihkan Washafel/Sink', labelEn: 'Clean sink', cadence: 'daily' },
  { id: '5.3', group: '5', labelId: 'Membersihkan Kulkas / Refrigerator', labelEn: 'Clean refrigerator', cadence: 'daily' },
  { id: '5.4', group: '5', labelId: 'Membersihkan Mesin Cuci Piring', labelEn: 'Clean dishwasher', cadence: 'daily' },
  // 6 — Linens & Blanket
  { id: '6.1', group: '6', labelId: 'Pencucian Sprei & Sarung Bantal', labelEn: 'Wash bedsheet & pillowcase', cadence: 'weekly' },
  { id: '6.2', group: '6', labelId: 'Pencucian Selimut & Bed Cover', labelEn: 'Wash blanket & bed cover', cadence: 'monthly' },
];

export function itemsForGroup(group: RoomCleaningGroupKey): RoomCleaningItem[] {
  return ROOM_CLEANING_ITEMS.filter((i) => i.group === group);
}

export type TidakDikerjakanReason = 'occupied' | 'no_linen' | 'broken';

export const TIDAK_DIKERJAKAN_REASONS: TidakDikerjakanReason[] = ['occupied', 'no_linen', 'broken'];
