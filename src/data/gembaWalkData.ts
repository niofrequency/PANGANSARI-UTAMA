// AUTO-GENERATED from the source workbook "GEMBA_WALK__MASTER__EN__IDN.xlsx"
// (sheet: "GEMBA_WALK"), transcribed verbatim (English + Indonesian text for
// every section, category, and criterion). Section-level titles are hand-
// written below rather than auto-split, because the source is inconsistent
// about language order there: Section A's title is "Indonesian / English",
// but Section B's and C's are "English / Indonesian" — the reverse. Category
// and item text is consistently "English\nIndonesian" throughout, so those
// were split programmatically.
//
// Do not hand-edit item text here — fix it in the source workbook and
// re-run the generator (see scripts note in xlsx skill) so the two stay in sync.

export interface GembaItem {
  id: string; // e.g. "A-1-1"
  descEn: string;
  descId: string;
}

export interface GembaCategory {
  key: string; // e.g. "A-1"
  num: number;
  titleEn: string;
  titleId: string;
  items: GembaItem[];
}

export interface GembaSection {
  key: 'A' | 'B';
  titleEn: string;
  titleId: string;
  categories: GembaCategory[];
}

export const GEMBA_SECTION_TITLES: Record<'A' | 'B', { titleEn: string; titleId: string }> = {
  A: { titleEn: `Health & Safety Rules`, titleId: `Aturan Kesehatan & Keselamatan` },
  B: { titleEn: `Food Safety Rules`, titleId: `Aturan Keamanan Pangan` },
};

export const GEMBA_SECTIONS: GembaSection[] = [
  {
    key: "A",
    titleEn: GEMBA_SECTION_TITLES.A.titleEn,
    titleId: GEMBA_SECTION_TITLES.A.titleId,
    categories: [
      {
        key: "A-1",
        num: 1,
        titleEn: `CUTTING RISK`,
        titleId: `RESIKO TERPOTONG`,
        items: [
          {
            id: "A-1-1",
            descEn: `Only company equipment is in use`,
            descId: `Hanya peralatan milik perusahaan yang digunakan`,
          },
          {
            id: "A-1-2",
            descEn: `Company equipment is in good condition`,
            descId: `Peralatan perusahaan dalam kondisi baik.`,
          },
          {
            id: "A-1-3",
            descEn: `Safety gloves (Cut resistant) are in use in all areas, and for each activity`,
            descId: `Sarung tangan pengaman (tahan potong) digunakan di semua area, dan untuk setiap aktivitas.`,
          },
          {
            id: "A-1-4",
            descEn: `"Fire-line" concept is understood (no direct exposure to risk of cuts observed + people interviewed understand it)`,
            descId: `Konsep "garis api" dipahami (tidak ada paparan langsung terhadap risiko luka yang diamati + orang-orang yang diwawancarai memahaminya)`,
          },
        ],
      },
      {
        key: "A-2",
        num: 2,
        titleEn: `FALLING RISKS`,
        titleId: `RESIKO JATUH`,
        items: [
          {
            id: "A-2-1",
            descEn: `All employees wear appropriate safety shoes`,
            descId: `Semua karyawan wajib mengenakan sepatu keselamatan yang sesuai.`,
          },
          {
            id: "A-2-2",
            descEn: `Safety shoes are in good condition`,
            descId: `Sepatu keselamatan dalam kondisi baik.`,
          },
          {
            id: "A-2-3",
            descEn: `Traffic areas & ground are kept clear and dry`,
            descId: `Area lalu lintas dan permukaan tanah dijaga agar tetap bersih dan kering.`,
          },
          {
            id: "A-2-4",
            descEn: `People working at height use adequate & in good condition CPE and/or PPE`,
            descId: `Orang yang bekerja di ketinggian harus menggunakan CPE dan/atau PPE yang memadai dan dalam kondisi baik.`,
          },
        ],
      },
      {
        key: "A-3",
        num: 3,
        titleEn: `FIRE & EVACUATION RISK`,
        titleId: `RESIKO KEBAKARAN DAN PROSES EVAKUASI`,
        items: [
          {
            id: "A-3-1",
            descEn: `Fire protection equipments (extinguishers, fire horse, etc) are in good condition & easily accessible.`,
            descId: `Peralatan proteksi kebakaran (alat pemadam api, troli pemadam api, dll.) dalam kondisi baik dan mudah diakses.`,
          },
          {
            id: "A-3-2",
            descEn: `Emergency exits are identified and kept clear`,
            descId: `Pintu keluar darurat diidentifikasi dan dijaga agar tetap bebas hambatan.`,
          },
          {
            id: "A-3-3",
            descEn: `People smoking only in the identified dedicated smoking areas`,
            descId: `Perokok hanya diperbolehkan di area khusus merokok yang telah ditentukan.`,
          },
          {
            id: "A-3-4",
            descEn: `Hot work permits are in use for hot work maintenance activities`,
            descId: `Izin kerja panas digunakan untuk kegiatan pemeliharaan yang melibatkan pekerjaan panas.`,
          },
        ],
      },
      {
        key: "A-4",
        num: 4,
        titleEn: `CHEMICAL PRODUCT RISK`,
        titleId: `RESIKO PAPARAN BAHAN KIMIA`,
        items: [
          {
            id: "A-4-1",
            descEn: `PPE are in use when handling chemicals, SDS available and accessible`,
            descId: `APD (Alat Pelindung Diri) digunakan saat menangani bahan kimia, SDS (Lembar Data Keselamatan) tersedia dan mudah diakses.`,
          },
          {
            id: "A-4-2",
            descEn: `Chemicals are stored in a dedicated area, and in retention tanks`,
            descId: `Bahan kimia disimpan di area khusus, dan di dalam tangki penampung (Secondary Containment).`,
          },
          {
            id: "A-4-3",
            descEn: `Chemicals are stored according to their compatibility (segregation of alkaline, acids, etc)`,
            descId: `Bahan kimia disimpan berdasarkan kompatibilitasnya (pemisahan bahan basa, asam, dll.).`,
          },
        ],
      },
      {
        key: "A-5",
        num: 5,
        titleEn: `ELECTRICAL RISK & DANGEROUS ENERGIES`,
        titleId: `RESIKO PAPARAN ENERGI LISTRIK`,
        items: [
          {
            id: "A-5-1",
            descEn: `Mobile equipment is disconnected during intervention (cleaning, assembly, disassembly, etc)`,
            descId: `Peralatan bergerak dilepas sambungannya selama intervensi (pembersihan, perakitan, pembongkaran, dll.)`,
          },
          {
            id: "A-5-2",
            descEn: `No damaged electrical equipment in use`,
            descId: `Tidak ada peralatan listrik yang rusak yang masih digunakan.`,
          },
          {
            id: "A-5-3",
            descEn: `Electrical boxes/rooms are locked`,
            descId: `Kotak/ruangan listrik terkunci`,
          },
          {
            id: "A-5-4",
            descEn: `No intervention on electrical boxes/rooms without proper training`,
            descId: `Dilarang melakukan intervensi pada kotak/ruangan listrik tanpa pelatihan yang memadai.`,
          },
        ],
      },
      {
        key: "A-6",
        num: 6,
        titleEn: `DRIVING RISK`,
        titleId: `RESIKO MENGEMUDI`,
        items: [
          {
            id: "A-6-1",
            descEn: `Employees wear seat belt while driving equipment`,
            descId: `Karyawan wajib mengenakan sabuk pengaman saat mengoperasikan peralatan.`,
          },
          {
            id: "A-6-2",
            descEn: `Employees do not use phone while driving equipment`,
            descId: `Karyawan dilarang menggunakan telepon saat mengoperasikan peralatan.`,
          },
          {
            id: "A-6-3",
            descEn: `No behaviour at risk observed with people driving equipment (respect of applicable traffic rules).`,
            descId: `Tidak ditemukan perilaku berisiko pada orang yang mengemudikan peralatan (menghormati peraturan lalu lintas yang berlaku).`,
          },
          {
            id: "A-6-4",
            descEn: `People operating mobile equipment are trained, authorized and have valid license (check at least one person details).`,
            descId: `Orang-orang yang mengoperasikan peralatan bergerak telah dilatih, diberi wewenang, dan memiliki lisensi yang sah (periksa setidaknya detail satu orang).`,
          },
        ],
      },
      {
        key: "A-7",
        num: 7,
        titleEn: `MUSCULO-SKELETAL DISORDER RISK`,
        titleId: `RISIKO GANGGUAN OTOT DAN RANGKA`,
        items: [
          {
            id: "A-7-1",
            descEn: `All handling is done after proper analysis of the situation (no rush) and proper positioning.`,
            descId: `Semua penanganan dilakukan setelah analisis situasi yang tepat (tanpa terburu-buru) dan penempatan yang tepat.`,
          },
          {
            id: "A-7-2",
            descEn: `Appropriate handling equipment is in use, and being used only by trained employees.`,
            descId: `Menggunakan peralatan yang sesuai , dan hanya digunakan oleh karyawan yang terlatih.`,
          },
          {
            id: "A-7-3",
            descEn: `Employees are aware that they must seek for help for complex handling operations.`,
            descId: `Para karyawan menyadari bahwa mereka harus mencari bantuan untuk menangani operasi yang kompleks.`,
          },
        ],
      },
      {
        key: "A-8",
        num: 8,
        titleEn: `DAILY FRM MONITORING`,
        titleId: `PEMANTAUAN HARIAN FRM`,
        items: [
          {
            id: "A-8-1",
            descEn: `Specific FRM for location shared with crew during daily TBM`,
            descId: `FRM spesifik untuk lokasi tersebut disosialisasikan kepada kru selama Toolbox Meeting harian.`,
          },
          {
            id: "A-8-2",
            descEn: `FRM Board updated with date, applicable risks and control measures`,
            descId: `Papan FRM diupdate sesuai tanggal, risiko yang berlaku, dan langkah-langkah pengendalian.`,
          },
          {
            id: "A-8-3",
            descEn: `CCC and CCFV controlled by supervisors`,
            descId: `CCC dan CCFV dikendalikan oleh pengawas.`,
          },
        ],
      },
    ],
  },
  {
    key: "B",
    titleEn: GEMBA_SECTION_TITLES.B.titleEn,
    titleId: GEMBA_SECTION_TITLES.B.titleId,
    categories: [
      {
        key: "B-1",
        num: 1,
        titleEn: `HYGIENE: HANDS WASHING & DISINFECTION`,
        titleId: `KEBERSIHAN: MENCUCI TANGAN dan MENDISINFEKSI`,
        items: [
          {
            id: "B-1-1",
            descEn: `Handwashing facilities are available & in good conditions`,
            descId: `Fasilitas cuci tangan tersedia dan dalam kondisi baik (dilengkapi sabun, tisu, pengering, dan sanitizer)`,
          },
          {
            id: "B-1-2",
            descEn: `Employees wash and disinfect hands before starting work & handling food.`,
            descId: `Karyawan mencuci dan mendisinfeksi tangan sebelum memulai pekerjaan dan menangani makanan.`,
          },
          {
            id: "B-1-3",
            descEn: `Observed proper hand washing of employees according to the rules (after break time, eating, smoking, coughing, touching nose, touching waste or raw food).`,
            descId: `Mengamati bahwa karyawan mencuci tangan dengan benar sesuai aturan (setelah istirahat, makan, merokok, batuk, menyentuh hidung, menyentuh sampah atau makanan mentah).`,
          },
        ],
      },
      {
        key: "B-2",
        num: 2,
        titleEn: `RESPECT OF APPLICABLE PROHIBITIONS`,
        titleId: `MENTAATI LARANGAN YANG BERLAKU`,
        items: [
          {
            id: "B-2-1",
            descEn: `No employee eating, chewing, drinking or smoking observed in production areas`,
            descId: `Tidak ada karyawan yang terlihat makan, mengunyah, minum, atau merokok di area produksi.`,
          },
          {
            id: "B-2-2",
            descEn: `No employee wearing jewellery, false or polish nails observed in production areas.`,
            descId: `Tidak ada karyawan yang mengenakan perhiasan, kuku palsu, atau kuku yang dipoles di area produksi.`,
          },
          {
            id: "B-2-3",
            descEn: `No employee using personal phone in production areas.`,
            descId: `Tidak ada karyawan yang menggunakan / bermain handphone di area produksi.`,
          },
          {
            id: "B-2-4",
            descEn: `No storage directly on the floor.`,
            descId: `Tidak diperbolehkan menyimpan barang langsung di lantai.`,
          },
          {
            id: "B-2-5",
            descEn: `There is no wood or external packaging materials in the production area including sacks, cartons and egg trays.`,
            descId: `Tidak ada kayu atau bahan kemasan eksternal di area produksi termasuk karung, karton dan try telur.`,
          },
          {
            id: "B-2-6",
            descEn: `Segregation between raw & cooked food is respected, color code cutting boards respected.`,
            descId: `Menerapkan pemisahan antara makanan mentah dan matang,serta penerapan kode warna talenan.`,
          },
          {
            id: "B-2-7",
            descEn: `No storage of cold/hot products/meal at room temperature.`,
            descId: `Produk/makanan dingin/panas tidak boleh disimpan pada suhu ruangan.`,
          },
          {
            id: "B-2-8",
            descEn: `Dangerous or forbidden food ingredients are not in use`,
            descId: `Bahan makanan berbahaya atau terlarang tidak digunakan.`,
          },
        ],
      },
      {
        key: "B-3",
        num: 3,
        titleEn: `WORKWEAR`,
        titleId: `PAKAIAN KERJA`,
        items: [
          {
            id: "B-3-1",
            descEn: `All employees wear clean and appropriate uniform (covering arms and personal clothes).`,
            descId: `Semua karyawan mengenakan seragam yang bersih dan sesuai (menutupi lengan dan pakaian pribadi).`,
          },
          {
            id: "B-3-2",
            descEn: `Hairnets are in use and wear properly (covering all hairs and ears)`,
            descId: `Jaring rambut digunakan dan dikenakan dengan benar (menutupi seluruh rambut dan telinga).`,
          },
          {
            id: "B-3-3",
            descEn: `"Hairnet first" principle is understood and in place.`,
            descId: `Prinsip "pakai jaring rambut dulu" sudah dipahami dan diterapkan.`,
          },
          {
            id: "B-3-4",
            descEn: `Non clean-shaved employees wear a beardnet.`,
            descId: `Karyawan yang tidak bercukur bersih mengenakan jaring janggut.`,
          },
          {
            id: "B-3-5",
            descEn: `Employees handling food with direct exposure wear mask (covering mouth and nose to avoid droplets risk into food).`,
            descId: `Karyawan yang menangani makanan dengan kontak langsung wajib mengenakan masker (menutupi mulut dan hidung untuk menghindari risiko tetesan air liur masuk ke dalam makanan).`,
          },
        ],
      },
      {
        key: "B-4",
        num: 4,
        titleEn: `KEEPT IT CLEAN`,
        titleId: `JAGALAH KEBERSIHAN`,
        items: [
          {
            id: "B-4-1",
            descEn: `"Clean as you go" principle is respected in all areas`,
            descId: `Prinsip "bersihkan sebelum pergi"dilakukan di semua area.`,
          },
          {
            id: "B-4-2",
            descEn: `Cleaning schedules exist and are respected in all areaswith available checklist`,
            descId: `Jadwal pembersihan tersedia dan dipatuhi di semua area, dengan daftar periksa yang tersedia.`,
          },
        ],
      },
      {
        key: "B-5",
        num: 5,
        titleEn: `CONTROL & RECORDS`,
        titleId: `PENGENDALIAN CATATAN`,
        items: [
          {
            id: "B-5-1",
            descEn: `Temperatures & exposure times are controled and recorded legibly.`,
            descId: `Suhu dan waktu paparan dikontrol dan dicatat dengan jelas.`,
          },
          {
            id: "B-5-2",
            descEn: `All records are filled properly as per the frequency required (verify at least 2 CCPs or oPRPs), daily meal grammage is monitored and recorded.`,
            descId: `Semua catatan diisi dengan benar sesuai frekuensi yang dibutuhkan (verifikasi setidaknya 2 CCP atau oPRP), gramasi makanan harian dipantau dan dicatat.`,
          },
          {
            id: "B-5-3",
            descEn: `Staff file available in location Managers keeping with required certifications ( Basic Training, MCU, Food Handler certificates, ETC).`,
            descId: `Berkas kepegawaian tersedia di lokasi. Manajer menyimpan sertifikasi yang dibutuhkan (Pelatihan Dasar, MCU, sertifikat Penanganan Makanan, dll.).`,
          },
        ],
      },
      {
        key: "B-6",
        num: 6,
        titleEn: `LABELING & COVERING`,
        titleId: `PELABELAN & PENUTUPAN`,
        items: [
          {
            id: "B-6-1",
            descEn: `Open products are labeled properly to ensure traceability`,
            descId: `Produk yang sudah dibuka diberi label dengan benar untuk memastikan ketelusuran.`,
          },
          {
            id: "B-6-2",
            descEn: `All products/materials used during the production process are covered and labeled properly; shelf-lifes as per PSU standards are respected.`,
            descId: `Semua produk/bahan yang digunakan selama proses produksi ditutup dan diberi label dengan benar; masa simpan sesuai standar PSU dipatuhi.`,
          },
        ],
      },
      {
        key: "B-7",
        num: 7,
        titleEn: `STOCK ROTATION`,
        titleId: `PENGENDALIAN PERPUTARAN STOK`,
        items: [
          {
            id: "B-7-1",
            descEn: `No expired products found in stock.`,
            descId: `Tidak ditemukan produk dan bahan kadaluwarsa.`,
          },
          {
            id: "B-7-2",
            descEn: `FEFO is understood and in place.`,
            descId: `FEFO dipahami dan sudah diterapkan.`,
          },
          {
            id: "B-7-3",
            descEn: `Expired & non conform products are isolated (quarantine).`,
            descId: `Produk kadaluarsa dan tidak sesuai standar diisolasi (Dikarantina).`,
          },
        ],
      },
      {
        key: "B-8",
        num: 8,
        titleEn: `COLD CHAIN MANAGEMENT`,
        titleId: `MANAJEMEN RANTAI DINGIN`,
        items: [
          {
            id: "B-8-1",
            descEn: `Corrective actions are recorded when cold storage malfunction`,
            descId: `Tindakan perbaikan dicatat ketika terjadi kerusakan pada penyimpanan dingin.`,
          },
          {
            id: "B-8-2",
            descEn: `Cold products are stored in a chilled environment (no prolongated stoarge at room temperature)`,
            descId: `Produk dingin disimpan di lingkungan yang dingin (tidak disimpan terlalu lama pada suhu ruangan).`,
          },
          {
            id: "B-8-3",
            descEn: `Storage temperature are respected`,
            descId: `Suhu penyimpanan diperhatikan.`,
          },
          {
            id: "B-8-4",
            descEn: `Thawing process is compliant with the standards.`,
            descId: `Proses pelumeran bahan sesuai dengan standar.`,
          },
        ],
      },
    ],
  },
];

// The four Evaluation values from the source's "Database" sheet dropdown
// list (Database!A2:B5), in the order they're listed there.
export const GEMBA_EVALUATION_OPTIONS = ['Conform', 'Not Conform', 'Non Observed', 'N/A'] as const;
export type GembaEvaluation = (typeof GEMBA_EVALUATION_OPTIONS)[number];

// Section C — "3 in a Row Site Management Field Interaction" — is a
// reference/discussion guide, not a scored checklist (the source's own
// COMPLIANCE % formula only reads Section A and B's Evaluation columns).
// Transcribed verbatim from GEMBA_WALK!C77:G95, including the source's own
// wording quirks (e.g. "positives behavior", the doubled "daftar daftar").
export interface ThreeInARowRole {
  level: string;
  position: string;
}

export const THREE_IN_A_ROW_TITLE = {
  en: '3 in a Row  Site Management field interaction with crew',
  id: 'Interaksi lapangan dengan kru dalam pengelolaan lokasi',
};

export const THREE_IN_A_ROW_ROLES: ThreeInARowRole[] = [
  { level: 'QHSE Representative ( Adviser)', position: 'QHSE' },
  { level: 'Coach of Coach (N+3)', position: 'Senior Manager / Dep GM/ GM' },
  { level: 'Coach (N+2)', position: 'Area Manager/ Assistant manager' },
  { level: 'Team Leader (N+1)', position: 'Lead hand or supervisor' },
  { level: 'Field Operators ( N)', position: 'Food Production Staff / Maintenance Staff /  Housekeeping or GCS staff' },
];

export const THREE_IN_A_ROW_PROMPTS: { en: string; id: string }[] = [
  {
    en: 'What are the positives behavior to be reinforced ( safe practices)',
    id: 'Perilaku positif apa yang perlu diperkuat (praktik aman)?',
  },
  {
    en: 'What are the points for improvement behavior to be changed ( less safe practices)',
    id: 'Apa saja poin-poin perbaikan yang perlu diubah (praktik yang kurang aman)?',
  },
  {
    en: 'If the list of points for improvement is long, which ones will the team focus on during discussions for immediate improvement ?',
    id: 'Jika daftar daftar poin untuk perbaikan terlalu lama, poin mana yang akan difokuskan oleh tim selama Diskusi untuk perbaikan segera?',
  },
];
