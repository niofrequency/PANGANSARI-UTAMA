// Daily Check List — Laundryshop. NOT UN.00.65 section 6 (the linen-wash
// item on the room-cleaning sheet) — this is the laundry SHOP's own
// receiving log: one row per room dropped off that day, a count per
// garment type, and a free-text note. Garment columns match the paper
// left-to-right exactly (PRD 4.8) — do not reorder or rename them.

export const LAUNDRY_GARMENT_COLUMNS = [
  { id: 'celana_panjang', labelId: 'Celana Panjang', labelEn: 'Long Pants' },
  { id: 'celana_pendek', labelId: 'Celana Pendek', labelEn: 'Short Pants' },
  { id: 'celana_dalam', labelId: 'Celana Dalam', labelEn: 'Underwear' },
  { id: 'kemeja', labelId: 'Kemeja', labelEn: 'Shirt' },
  { id: 'kaos', labelId: 'Kaos', labelEn: 'T-Shirt' },
  { id: 'handuk', labelId: 'Handuk', labelEn: 'Towel' },
  { id: 'training', labelId: 'Training', labelEn: 'Training Wear' },
  { id: 'sweater', labelId: 'Sweater', labelEn: 'Sweater' },
  { id: 'jaket', labelId: 'Jaket', labelEn: 'Jacket' },
  { id: 'baju_overall', labelId: 'Baju Overall', labelEn: 'Overall' },
  { id: 'rompi', labelId: 'Rompi', labelEn: 'Vest' },
  { id: 'rok', labelId: 'Rok', labelEn: 'Skirt' },
  { id: 'blus', labelId: 'Blus', labelEn: 'Blouse' },
  { id: 'baju_tidur', labelId: 'Baju Tidur', labelEn: 'Sleepwear' },
  { id: 'sapu_tangan', labelId: 'Sapu Tangan', labelEn: 'Handkerchief' },
  { id: 'kain_sarung', labelId: 'Kain Sarung', labelEn: 'Sarong' },
  { id: 'sajadah', labelId: 'Sajadah', labelEn: 'Prayer Mat' },
  { id: 'mukena', labelId: 'Mukena', labelEn: 'Prayer Garment' },
  { id: 'selendang_syal', labelId: 'Selendang/Syal', labelEn: 'Shawl/Scarf' },
  { id: 'seprei', labelId: 'Seprei', labelEn: 'Bedsheet' },
  { id: 'sarung_bantal', labelId: 'Sarung Bantal', labelEn: 'Pillowcase' },
  { id: 'selimut', labelId: 'Selimut', labelEn: 'Blanket' },
  { id: 'bed_cover', labelId: 'Bed Cover', labelEn: 'Bed Cover' },
  { id: 'kain_gorden', labelId: 'Kain Gorden', labelEn: 'Curtain' },
  { id: 'taplak_meja', labelId: 'Taplak Meja', labelEn: 'Tablecloth' },
  { id: 'cover_kursi', labelId: 'Cover Kursi', labelEn: 'Chair Cover' },
  { id: 'serbet', labelId: 'Serbet', labelEn: 'Napkin' },
  { id: 'kaos_kaki', labelId: 'Kaos Kaki', labelEn: 'Socks' },
] as const;
export type LaundryGarmentId = typeof LAUNDRY_GARMENT_COLUMNS[number]['id'];

export interface LaundryRoomRow {
  id: string;
  roomNumber: string;
  counts: Record<LaundryGarmentId, string>; // typed as text, blank = 0
  keterangan: string;
}

export function emptyLaundryRow(id: string): LaundryRoomRow {
  const counts = {} as Record<LaundryGarmentId, string>;
  for (const g of LAUNDRY_GARMENT_COLUMNS) counts[g.id] = '';
  return { id, roomNumber: '', counts, keterangan: '' };
}
