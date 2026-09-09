// UWL10001 Checklist Kebersihan dan Perawatan Area Mess Hall. Marks: B =
// Bersih/Baik, R = Rusak. The photos only cover section D — Area Gudang
// (Dry, Chiller, Freezer) — so that's the only area shipped here.
//
// Areas are data-driven on purpose (PRD 4.3): the physical pad almost
// certainly has more sections (A/B/C...) that just weren't in this photo
// set. Adding one is pasting a new entry into MESS_HALL_AREAS below with
// its own item list — no component changes needed — once PSU shares the
// rest of the pad. Do not invent A/B/C line items in the meantime.

export type MessHallMark = 'B' | 'R';

export interface MessHallItem {
  id: string;
  labelId: string;
  labelEn: string;
}

export interface MessHallArea {
  key: string;
  titleId: string;
  titleEn: string;
  items: MessHallItem[];
}

export const MESS_HALL_AREAS: MessHallArea[] = [
  {
    key: 'D',
    titleId: 'Area Gudang (Dry, Chiller, Freezer)',
    titleEn: 'Storage Area (Dry, Chiller, Freezer)',
    items: [
      { id: 'D.1', labelId: 'Meja', labelEn: 'Table' },
      { id: 'D.2', labelId: 'Kursi', labelEn: 'Chair' },
      { id: 'D.3', labelId: 'Rak tempat penyimpanan barang', labelEn: 'Storage rack' },
      { id: 'D.4', labelId: 'Langit-langit Ruangan/Plafon', labelEn: 'Ceiling' },
      { id: 'D.5', labelId: 'Lantai', labelEn: 'Floor' },
      { id: 'D.6', labelId: 'Dinding', labelEn: 'Wall' },
      { id: 'D.7', labelId: 'Penerangan/Lampu emergency', labelEn: 'Lighting / emergency lamp' },
      { id: 'D.8', labelId: 'Pintu', labelEn: 'Door' },
      { id: 'D.9', labelId: 'Jendela', labelEn: 'Window' },
      { id: 'D.10', labelId: 'Pallet Plastik', labelEn: 'Plastic pallet' },
      { id: 'D.11', labelId: 'Plastic Curtain', labelEn: 'Plastic curtain' },
      { id: 'D.12', labelId: 'Tempat Sampah', labelEn: 'Trash bin' },
      { id: 'D.13', labelId: 'Kebersihan kemasan/barang', labelEn: 'Cleanliness of packaging / goods' },
      { id: 'D.14', labelId: 'Kebersihan/kerapihan Ruang Chiller', labelEn: 'Chiller room cleanliness / tidiness' },
      { id: 'D.15', labelId: 'Kebersihan/kerapihan Ruang Freezer', labelEn: 'Freezer room cleanliness / tidiness' },
      { id: 'D.16', labelId: 'Temperature/Suhu', labelEn: 'Temperature' },
    ],
  },
];

export function messHallArea(key: string): MessHallArea | undefined {
  return MESS_HALL_AREAS.find(a => a.key === key);
}
