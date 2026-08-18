// AUTO-GENERATED from the source workbook "GUIDELINES_FOOD_SAFETY_INSPECTION.xls"
// (sheet: "Audit Check List"), transcribed verbatim (Indonesian + English text,
// regulatory references, section/item numbering) — including the source's own
// numbering quirk where the Roman numeral "III" is reused for two different
// categories ("Quality Control Process area" and "Storage"); each gets its own
// `key` here so the app can tell them apart while still displaying the original
// "III" label the auditor expects to see.
//
// Do not hand-edit item text here — fix it in the source workbook and
// re-run the generator (see scripts note in xlsx skill) so the two stay in sync.

export interface InspectionItem {
  id: string; // unique key, e.g. "I-1"
  no?: string; // the source's own item code, e.g. "I.1" — absent on continuation rows
  labelId?: string;
  labelEn?: string;
  descId: string;
  descEn: string;
  reference?: string;
}

export interface InspectionSection {
  key: string; // unique key, e.g. "III-QC"
  no?: string; // the source's Roman-numeral code, e.g. "III"
  titleId: string;
  titleEn: string;
  items: InspectionItem[];
}

export const INSPECTION_SECTIONS: InspectionSection[] = [
  {
    key: "I",
    no: undefined,
    titleId: `Tata Letak dan Fasilitas`,
    titleEn: `Layout and Facilities`,
    items: [
      {
        id: "I-1",
        no: "I.1",
        labelId: `Lokasi`,
        labelEn: `Location`,
        descId: `Bebas dari bau tak sedap, asap, debu, kontaminan lainnya dan tidak terkena banjir.`,
        descEn: `Free from bad odour, smoke, dust, other contaminants and not subject to flooding.`,
        reference: `CAC/RCP 39 no. 4.1`,
      },
      {
        id: "I-2",
        no: "I.2",
        labelId: `Drainase`,
        labelEn: `Drainage`,
        descId: `Drainase mencukupi dan mudah untuk dibersihkan`,
        descEn: `Drainage is sufficient and easy to clean`,
        reference: `CAC/RCP 39 no. 4.2`,
      },
      {
        id: "I-3",
        no: undefined,
        descId: `Tidak ada genangan air dan kotoran dalam drainase.`,
        descEn: `No stagnant water and debris in the drainage`,
        reference: `CAC/RCP 39 no. 4.2`,
      },
      {
        id: "I-4",
        no: "I.3",
        labelId: `Bangunan`,
        labelEn: `Building`,
        descId: `kondisi terawat dan tidak berpotensi menyebabkan terjadinya kontaminasi kepada makanan.`,
        descEn: `Conditions are maintained and do not have the potential to cause contamination to food`,
        reference: `CAC/RCP 39 no. 4.3.1`,
      },
      {
        id: "I-5",
        no: undefined,
        descId: `Luas area kerja mencukupi untuk bekerja dengan nyaman`,
        descEn: `The space area is sufficient to work comfortably`,
        reference: `CAC/RCP 39 No. 4.3.2`,
      },
      {
        id: "I-6",
        no: undefined,
        descId: `Tidak ada akses untuk masuk nya hama maupun debu ke dalam failitas.`,
        descEn: `No access for pest or dust to enter the facility`,
        reference: `CAC/RCP 39 No. 4.3.4`,
      },
      {
        id: "I-7",
        no: undefined,
        descId: `Terdapat sekat pemisah antar proses untuk mencegah terjadinya kontaminasi silang.`,
        descEn: `There is a separation partition between processes to prevent cross-contamination`,
        reference: `CAC/RCP 39 No. 4.3.5`,
      },
      {
        id: "I-8",
        no: "I.4",
        labelId: `Lantai`,
        labelEn: `Floor`,
        descId: `Lantai terbuat dari bahan yang tahan air, tidak menyerap  cairan, mudah dibersihkan, tidak licin, rata (tidak ada retakan), serta kemiringannya cukup mudah untuk air mengalir ke saluran pembuangan.`,
        descEn: `The floor is made of materials that are waterproof, do not absorb liquids, are easy to clean, non-slip, flat (no cracks), and the slope is easy enough for water to flow into the drain.`,
        reference: `CAC/RCP 39 No. 4.3.7
ISO/TS 22002-2:2013 No. 4.1.2.2
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-9",
        no: "I.5",
        labelId: `Dinding`,
        labelEn: `Wall`,
        descId: `Terbuat dari bahan yang tahan air, tidak menyerap cairan, mudah dibersihkan, dan berwarna terang.`,
        descEn: `Made of waterproof, non-absorbent, easy-to-clean, light-coloured material`,
        reference: `CAC/RCP 39 No. 4.3.7
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-10",
        no: undefined,
        descId: `Dinding dalam kondisi rata/halus, tidak ada retakan, sudut nya berbentuk konus`,
        descEn: `The wall is in a flat/smooth condition, no cracks, the corner is conus-shaped`,
        reference: `CAC/RCP 39 No. 4.3.7
ISO/TS 22002-2:2013 No. 4.1.2.2
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-11",
        no: "I.6",
        labelId: `Langit-Langit`,
        labelEn: `Ceiling`,
        descId: `tidak terdapat kotoran, kondensasi, serta mudah dibersihkan, berwarna terang, dan ketinggian langit-langit minimal 2.4 meter.`,
        descEn: `no dirt, condensation, and easy to clean, light colour, and a minimum ceiling height of 2.4 metres`,
        reference: `CAC/RCP 39 No. 4.3.7
ISO/TS 22002-2:2013 No. 4.1.2.2
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-12",
        no: "I.7",
        labelId: `Jendela`,
        labelEn: `Window`,
        descId: `Harus dilengkapi dengan lapisan anti serangga.`,
        descEn: `Must be fitted with insect repellent coating`,
        reference: `CAC/RCP 39 No. 4.3.7`,
      },
      {
        id: "I-13",
        no: undefined,
        descId: `Lapisan anti serangga ini harus mudah dibersihkan.`,
        descEn: `This insect repellent should be easy to clean`,
        reference: `CAC/RCP 39 No. 4.3.7
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-14",
        no: "I.8",
        labelId: `Pintu`,
        labelEn: `Door`,
        descId: `Kondisi rata/halus, tidak terbuat dari bahan yang mudah menyerap, dilengkapi dengan alat penutup mandiri (self-clossing), serta tertutup sempurna (tidak ada celah).`,
        descEn: `Flat/smooth condition, not made of absorbent material, equipped with a self-closing device, and perfectly closed (no gaps)`,
        reference: `CAC/RCP 39 No. 4.3.7
ISO/TS 22002-2:2013 No. 4.1.2.2
Permenkes 2 Tahun 2023`,
      },
      {
        id: "I-15",
        no: "I.9",
        labelId: `Tangga, lift, alat bantu lainnya.`,
        labelEn: `Stairs, lifts, other assistive devices`,
        descId: `Kondisi bersih dan tidak menyebabkan kontaminasi`,
        descEn: `Clean condition and no potential contamination`,
        reference: `CAC/RCP 39 No. 4.3.7`,
      },
      {
        id: "I-16",
        no: "I.10",
        labelId: `Kondisi Keseluruhan`,
        labelEn: `Over all Condition`,
        descId: `Tidak ada kondisi yang dapat menyebabkan kontaminasi langsung/tidak langsung kepada bahan baku/maupun hasil produk makanan, seperti adanya tetesan air, kotoran, jamur, kondensasi dan kondisi lainnya.`,
        descEn: `There are no potential direct/indirect contamination of raw materials/ or food products, such as water droplets, dirt, mould, condensation and other conditions.`,
        reference: `CAC/RCP 39 No. 4.3.8`,
      },
      {
        id: "I-17",
        no: "I.11",
        labelId: `Tempat tinggal dan toilet.`,
        labelEn: `Living quarters and toilets.`,
        descId: `Tempat tinggal dan toilet  harus terpisah dari area penanganan makanan serta tidak membuka langsung ke area penanganan makanan.`,
        descEn: `Living quarters and toilets should be separate from the food handling area and there should be no open space to the food handling area.`,
        reference: `CAC/RCP 39 No. 4.3.9`,
      },
      {
        id: "I-18",
        no: "I.12",
        labelId: `Perkakas Kerja`,
        labelEn: `Tools`,
        descId: `Tidak ada perkakas kerja yang terbuat dari bahan yang susah dibersihkan dan disanitasi seperti bahan kayu.`,
        descEn: `No tools are made from materials that are difficult to clean and sanitise such as wood.`,
        reference: `CAC/RCP 39 No. 4.3.11`,
      },
      {
        id: "I-19",
        no: "I.13",
        labelId: `Ruang Ganti`,
        labelEn: `Change Room`,
        descId: `Tersedia fasilitas ruang ganti untuk karyawan dengan jumlah yang mencukupi.`,
        descEn: `Available change room for staff with proper number and condition.`,
        reference: `ISO/TS 22002-2:2013 No. 4.1.4`,
      },
      {
        id: "I-20",
        no: "I.14",
        labelId: `Toilet`,
        labelEn: `Toilet`,
        descId: `Jumlah mencukupi, penerangan dan ventilasi baik, tidak terbuka langsung ke arah penanganan makanan.`,
        descEn: `The number of toilets, lighting, and ventilation properly and no directly open to food handling area.`,
        reference: `CAC/RCP 39 No. 4.3.15`,
      },
      {
        id: "I-21",
        no: undefined,
        descId: `Ruang ganti dan toilet harus terjaga kebersihannya setiap saat.`,
        descEn: `Change room and toilets keep clean every time.`,
        reference: `CAC/RCP 39 No. 5.2.6`,
      },
      {
        id: "I-22",
        no: "I.15",
        labelId: `Fasilitas Cuci Tangan`,
        labelEn: `Hand Wash Basin`,
        descId: `Tersedia fasilitas cuci tangan yang berbeda dengan sink untuk mencuci bahan makanan atau peralatan.`,
        descEn: `Handwashing facilities are available  and Separate with  food  sink or a dishwasher/potwasher station.`,
        reference: `ISO/TS 22002-2:2013 No. 4.1.4`,
      },
      {
        id: "I-23",
        no: undefined,
        descId: `Dilengkapi dengan sabun cuci tangan, pengeringan tangan (hand dryer/tissue), dan air panas/hangat jika memungkinkan.`,
        descEn: `Are available hand soap  with hand dryer/tissue.`,
        reference: `CAC/RCP 39 No. 4.3.15
CAC/RCP 39 No. 6.5`,
      },
      {
        id: "I-24",
        no: undefined,
        descId: `Terletak di dekat toilet, agar karyawan mudah mencuci tangan setelah dari toilet.`,
        descEn: `Located near the toilet, so that employees can easily wash their hands after using the toilet.`,
        reference: `CAC/RCP 39 No. 4.3.15
CAC/RCP 39 No. 6.5`,
      },
      {
        id: "I-25",
        no: undefined,
        descId: `Terdapat petunjuk cara mencuci tangan yang baik.`,
        descEn: `There are instructions on how to wash hands properly`,
        reference: `CAC/RCP 39 No. 4.3.15
CAC/RCP 39 No. 6.5`,
      },
      {
        id: "I-26",
        no: undefined,
        descId: `Fasilitas cuci tangan yang terletak di area penangan makanan dilengkapi dengan penangkap sampah (saringan sampah) agar tidak ada sumbatan pada pipa.`,
        descEn: `Handwashing facilities located in the food handling area are equipped with a waste catcher (waste filter) so that there is no blockage in the pipe.`,
        reference: `CAC/RCP 39 No. 4.3.15
CAC/RCP 39 No. 6.5`,
      },
      {
        id: "I-27",
        no: undefined,
        descId: `Karyawan melakukan cuci tangan
- Sebelum bekerja 
- setelah dari toilet 
 - setelah menangani bahan mentah/setengah proses
- Maupun kegiatan lain yang membutuhkan cuci tangan`,
        descEn: `Employees wash their hands:
1. Before Food Handling or work
2. After to the toilet
3. After raw material handling.
4. Or all Activity need to hand wash`,
        reference: `CAC/RCP 39 No. 6.5`,
      },
      {
        id: "I-28",
        no: "I.16",
        labelId: `Pencahayaan`,
        labelEn: `Lighting`,
        descId: `Tingkat pencahayaan penerangan harus memenuhi:

540 Lux: area penanganan makanan
220 Lux: area kerja 
110 Lux: area lainnya`,
        descEn: `The illuminance level of the lighting must be fulfilled:
540 Lux: Food Handling area
220 Lux: Work Area
110 Lux: Others Area`,
        reference: `PerMenkes No.2 Tahun 2023`,
      },
      {
        id: "I-29",
        no: undefined,
        descId: `Lampu yang berada di area produksi makanan harus terlindungi untuk mencegah kontaminasi makanan.`,
        descEn: `Lamp at food production area should be cover to prevent potential contamination.`,
        reference: `CAC/RCP 39 No. 4.3.18
ISO/TS 22002-2:2013 No. 4.1.3`,
      },
      {
        id: "I-30",
        no: "I.17",
        labelId: `Ventilasi`,
        labelEn: `Ventilation`,
        descId: `Arah aliran udara ventilasi dari area bersih ke area kotor, tidak boleh sebaliknya.`,
        descEn: `Air flow should be from clean area to dirty area, not the other way round.`,
        reference: `CAC/RCP 39 No. 4.3.19`,
      },
      {
        id: "I-31",
        no: undefined,
        descId: `Ventilasi harus dilengkapi dengan pelindung yang dapat di lepas pasang untuk memudahkan pembersihan, seperti air curtain, pintu dobel, laminar air flow, dll.`,
        descEn: `Ventilation should covering by cover it can install and uninstall for easyly cleaning, such us air curtain, double door, laminar air flow, etc.`,
        reference: `CAC/RCP 39 No. 4.3.19
ISO/TS 22002-2:2013 No. 4.1.3`,
      },
      {
        id: "I-32",
        no: undefined,
        descId: `Exhaust hood harus tersedia di area pengolahan makanan untuk mengurangi suhu udara dan uap secara efektif.`,
        descEn: `Exhaust hood are avialable at food production area for reducing air temperature and vapour efectively.`,
        reference: `ISO/TS 22002-2:2013 No. 4.1.3`,
      },
    ],
  },
  {
    key: "II",
    no: "II.",
    titleId: `Kebersihan Diri dan Persyaratan Kebersihan`,
    titleEn: `Personal Hygiene and Clean Requirements`,
    items: [
      {
        id: "II-1",
        no: "II.1",
        labelId: `Pelatihan Hygiene`,
        labelEn: `Hygiene Course`,
        descId: `Semua karyawan telah diberikan pelatihan terkait higiene penangan makanan yang terencana, tersimpan catatan pelaksanaan pelatihan, termasuk evaluasi pelatihan.`,
        descEn: `Every staff has trained hygiene and food handling, and the records are avialable.`,
        reference: `CAC/RCP 39 No.6.1
ISO/TS 22002-2:2013 No. 4.4.2
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "II-2",
        no: "II.2",
        labelId: `Pemeriksaan Kesehatan`,
        labelEn: `Medical Checkup`,
        descId: `Semua pekerja yang menangani makanan mempunyai sertifikat pemeriksaan kesehatan yang masih berlaku, termasuk pemeriksaan kesehatan khusus penjamah makanan Tahunan.`,
        descEn: `All food handlers have a valid medical check certificate, including the Annual food handler medical check`,
        reference: `CAC/RCP 39 No.6.2
ISO/TS 22002-2:2013 No. 4.4.3.2`,
      },
      {
        id: "II-3",
        no: "II.3",
        labelId: `Penyakit Menular`,
        labelEn: `Infectious Diseases`,
        descId: `Karyawan yang diduga menderita atau pembawa penyakit yang dapat di tularkan melalui makanan (seperti tipus, kolera, TBC, Hepatitis, dll) dilarang untuk bekerja di area penyimpanan dan penanganan makanan, termasuk sakit kulit yang dapat menular, luka pada kulit yang dapat menular, muntah dan diare.`,
        descEn: `Employees suspected of suffering from or carriers of food-borne diseases (such as typhoid, cholera, tuberculosis, hepatitis, etc.) are prohibited from working in food storage and handling areas, including communicable skin diseases, communicable skin wounds, vomiting and diarrhoea.`,
        reference: `CAC/RCP 39 No.6.3
ISO/TS 22002-2:2013 No. 4.4.3.3
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "II-4",
        no: undefined,
        descId: `Karyawan wajib melaporkan kepada atasannya apabila mereka menderita penyakit menular dan menyerahkan surat pernyataan sehat dari dokter apabila telah sembuh (sebelum bekerja kembali).`,
        descEn: `Employees are required to report to their supervisors if they suffer from infectious diseases and submit a doctor's certificate of health when recovered (before returning to work).`,
        reference: `CAC/RCP 39 No.6.3
ISO/TS 22002-2:2013 No. 4.4.3.3`,
      },
      {
        id: "II-5",
        no: "II.4",
        labelId: `Luka/Cidera`,
        labelEn: `Wounds/Injuries`,
        descId: `Terdapat perangkat P3K di area penanganan makanan.`,
        descEn: `There is a first aid kit in the food handling area.`,
        reference: `CAC/RCP 39 No.6.4`,
      },
      {
        id: "II-6",
        no: undefined,
        descId: `Penjamah makanan yang mempunyai luka, harus membalut luka dengan plester yang tahan air dan berwarna terang.`,
        descEn: `Food handlers who have wounds, must bandage the wound with a waterproof, light-coloured plaster.`,
        reference: `CAC/RCP 39 No.6.4
ISO/TS 22002-2:2013 No. 4.4.3.4`,
      },
      {
        id: "II-7",
        no: "II.5",
        labelId: `Kebersihan Diri Personal Hygiene`,
        labelEn: `Kebersihan Diri Personal Hygiene`,
        descId: `Setiap penjamah makanan wajib menjaga kebersihan diri, memakai APD khusus penjamah makanan (seperti celemek, penutup rambut, sepatu safety, sarung tangan, masker, dll), tidak memakai perhiasan (cincin, gelang, jam tangan), termasuk kebersihan seragam dan celemeknya.`,
        descEn: `Every food handler must maintain personal hygiene, wear special PPE for food handlers (such as aprons, hair covers, safety shoes, gloves, masks, etc.), not wear jewellery (rings, bracelets, watches), including the cleanliness of uniforms and aprons.`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "II-8",
        no: undefined,
        descId: `Penjamah makanan tidak melakukan
- makan & minum di area kerja 
- merokok di area kerja 
- meludah sembarangan
- batuk dan bersin di area kerja tanpa masker 
- menggaruk rambut, hidung, telinga, wajah
- praktek tidak hygiene lainnya`,
        descEn: `Food handlers do not do:
-  Eat, drink in the work area.
- Smoking in the work area
- Spit carelessly
- Coughing and sneezing in the work area without a mask.
- Scratching hair, nose, ears, face
- Other non-hygiene practices`,
        reference: `CAC/RCP 39 No.6.7
ISO/TS 22002-2:2013 No. 4.4.5
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "II-9",
        no: "II.6",
        labelId: `Sarung Tangan`,
        labelEn: `Hand Gloves`,
        descId: `Sarung tangan digunakan saat menangani makanan.`,
        descEn: `Gloves are used when handling food`,
        reference: `CAC/RCP 39 No.6.8`,
      },
      {
        id: "II-10",
        no: undefined,
        descId: `Sarung tangan dalam keadaan bersih. Disarankan menggunakan sarung tangan sekali pakai.`,
        descEn: `Gloves are clean. Disposable gloves are recommended.`,
        reference: `CAC/RCP 39 No.6.8`,
      },
      {
        id: "II-11",
        no: "II.7",
        labelId: `Pengunjung/ Tamu`,
        labelEn: `Visitor`,
        descId: `Terdapat aturan yang mengatur apabila ada pengunjung/tamu yang masuk ke area pengolahan makanan.`,
        descEn: `There are rules governing when visitors/guests enter the food processing area.`,
        reference: `CAC/RCP 39 No.6.9`,
      },
      {
        id: "II-12",
        no: undefined,
        descId: `Tersedia APD yang disediakan untuk pengunjung yang masuk ke area pengolahan pangan.`,
        descEn: `PPE is provided for visitors who enter the food processing area.`,
        reference: `CAC/RCP 39 No.6.9`,
      },
      {
        id: "II-13",
        no: undefined,
        descId: `Pengunjung yang masuk ke area pengolahan makanan harus menggunakan APD yang sesuai.`,
        descEn: `Visitors who enter the food processing area must use appropriate PPE.`,
        reference: `CAC/RCP 39 No.6.9`,
      },
    ],
  },
  {
    key: "III",
    no: "III",
    titleId: `Quality Control Process area`,
    titleEn: `Quality Control Process area`,
    items: [
      {
        id: "III-1",
        no: "III.1",
        labelId: `Receiving Material (Frozen, Fresh & Dry)`,
        labelEn: `Receiving Material (Frozen, Fresh & Dry)`,
        descId: `Check dukument pendukung pada saat kedatangan bahan (DO, COA, Halal Certificate, NKV).`,
        descEn: `Check supporting documents upon arrival of ingredients (DO, COA, Halal Certificate, NKV).`,
        reference: `Buku standar penerimaan Bahan Baku`,
      },
      {
        id: "III-2",
        no: undefined,
        descId: `Apakah Inspection kelengkapan & kesesuaian semua documen bahan pada saat kedatangan di lokasi (DO, PO, COA, Halal Certificate, NKV/ Avian Infuenza) dilakukan?`,
        descEn: `Is Inspection of completeness & suitability of all material documents upon arrival at site (DO, PO, COA, Halal Certificate, NKV / Avian Infuenza) conducted?`,
        reference: `CAC/RCP 39 No. 7.1.1`,
      },
      {
        id: "III-3",
        no: undefined,
        descId: `Apakah dilakukan inspeksi kondisi kendaraan & semua bahan pada saat kedatangan di lokasi.`,
        descEn: `Is an inspection of the condition of the vehicle & all materials upon arrival at the site conducted?`,
        reference: `CAC/RCP 39 No. 7.9.2`,
      },
      {
        id: "III-4",
        no: undefined,
        descId: `Apakah Temperature kendaraan bahan frozen dan chiller (Termometer di truck/ thermoking ) sesuai standard (Minimal -15 °C untuk frozen dan 7 °C untuk bahan dingin)  atau apakah ada tanda2 pelelehan/ defroz bahan?. Semua kegiatan inspeksi penerimaan  tercatat.`,
        descEn: `Is the vehicle temperature of frozen and chiller materials (Thermometer in truck / thermoking) according to the standard (Minimum -15 ° C for frozen and 7 ° C for cold materials) or are there signs of melting / defrosting materials? All receiving ativities are recorded.`,
        reference: `1. Guidance on Temperature Control Legislation in the United Kingdom Food Standards Agency
September 2007.

2. Guide to the Storage & Handling of Frozen Foods, The British Frozen Food Federation, 2017`,
      },
      {
        id: "III-5",
        no: undefined,
        descId: `Apakah setiap bahan yang datang dilakukan pengecekan Expire date bahan? (Slow Moving Max 6 bulan dari Expire date & Fast Moving Max 3 bulan dari Expire date) dan tercatat.`,
        descEn: `Do you check the expiry date of every material that arrives? (Slow Moving Max 6 months from Expire date & Fast Moving Max 3 months from Expire date), and recorded`,
        reference: `CAC/RCP 39 No. 7.1.1`,
      },
      {
        id: "III-6",
        no: "III.2",
        labelId: `Proses Pre-wash`,
        labelEn: `Proses Pre-wash`,
        descId: `Apakah Sortasi & proses pre-wash untuk semua buah & sayuran pada saat kedatangan di lokasi dilakukan?.`,
        descEn: `Is sorting & pre-wash process done for all fruits & vegetables upon arrival at site?`,
        reference: `CAC/RCP 39 No. 7.1.1`,
      },
      {
        id: "III-7",
        no: undefined,
        descId: `Apakah Pencucian & sortasi Telur  dilakukan?`,
        descEn: `Is egg washing & sorting done?`,
        reference: `CAC/RCP 39 No. 7.1.1`,
      },
    ],
  },
  {
    key: "III-1",
    no: "III.",
    titleId: `Penyimpanan Barang`,
    titleEn: `Storage`,
    items: [
      {
        id: "III-1-1",
        no: "III.2",
        labelId: `Penyimpanan Barang.`,
        labelEn: `Material Storage`,
        descId: `Gudang senantiasa terjaga kebersihan, kerapihan dan menerapkan sistem FIFO/FEFO untuk mencegah kerusakan.`,
        descEn: `The warehouse/Store is kept clean, tidy and FIFO/FEFO system is applied to prevent damage.`,
        reference: `CAC/RCP 39 No.7.1.3
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "III-1-2",
        no: undefined,
        descId: `Penyimpanan pada chiller maksimal pada suhu  7◦C dan tersedia catatan suhu terkini .`,
        descEn: `Storage in chillers is at a maximum of 7◦C and temperature records are available and up to date.`,
        reference: `CAC/RCP 39 No.7.1.4`,
      },
      {
        id: "III-1-3",
        no: undefined,
        descId: `Penyimpanan pada Freezer minimal pada suhu  -15 ◦C dan tersedia catatan suhu terkini .`,
        descEn: `Storage in freezers is at a mainimum of -15◦C and temperature records are available and up to date.`,
        reference: `CAC/RCP 39 No.7.1.5; 7.8.2
ISO/TS 22002-2:2013 No. 4.6.1; 5.6`,
      },
      {
        id: "III-1-4",
        no: undefined,
        descId: `Gudang kering juga terjaga dan terpantau suhu dan kelembabannya,  monitoring  suhu dan kelembaban dry stiorage.`,
        descEn: `Dry storages are also maintained and monitored for temperature and humidity data, monitoring the temperature and humidity of dry storages.`,
        reference: `ISO/TS 22002-2:2013 No. 4.6.1`,
      },
      {
        id: "III-1-5",
        no: undefined,
        descId: `Penyusunan barang di gudang memperhatikan jarak dari dinding, lantai, dan langit-langit:
Jarak dari lantai 15 cm
Jarak dari dinding 5 cm
Jarak dari langit-langit 60 cm.`,
        descEn: `The arrangement of goods in the warehouse takes into account the distance from the walls, floor, and ceiling:
Distance from the floor 15 cm
Distance from the wall 5 cm
Distance from the ceiling 60 cm`,
        reference: `ISO/TS 22002-2:2013 No. 4.6.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "III-1-6",
        no: undefined,
        descId: `Penyimpanan bahan makanan dalam bentuk re-packing harus dilengkapi dengan identitas pada kemasan awal untuk memudahkan penelusuran.`,
        descEn: `Storage of food re-packing must be equipped with an identity /label on the original packaging to facilitate traceability.`,
        reference: `ISO/TS 22002-2:2013 No. 4.6.1`,
      },
      {
        id: "III-1-7",
        no: undefined,
        descId: `Tidak ada potensi terjadinya kontaminasi silang antar bahan yang disimpan dalam chiller atau freezer
Note: 
Pastikan penyimpanan bahan mentah, daging, ayam, telur, ikan, dan seafood disimpan terpisah dengan bahan setengah proses dan makanan matang.`,
        descEn: `There is no potential for cross-contamination between ingredients stored in the chiller or freezer.
Notes: 
Ensure that raw materials, meat, chicken, eggs, fish, and seafood are stored separately from semi-processed ingredients and cooked food.`,
        reference: `CAC/RCP 39 No. 4.3.14.1`,
      },
      {
        id: "III-1-8",
        no: undefined,
        descId: `Semua lemari pen alat pemantau suhu yang mudah di pantau. Dilakukan kalibrasi terhadap alat pemantauan suhu minimal 1x setahun.`,
        descEn: `All cabinets have temperature monitoring devices that are easy to monitor. Calibration of temperature monitoring devices is carried out at least 1x a year.`,
        reference: `CAC/RCP 39 No. 4.3.14.4`,
      },
      {
        id: "III-1-9",
        no: undefined,
        descId: `Inspeksi Expired Date & Kondisi Bahan pada saat proses penyimpanan dilakukan routine setiap 1x/ minggu?`,
        descEn: `Inspection of Expired Date & Condition of Ingredients during the storage process is carried out routine every 1x/week?`,
        reference: `CAC/RCP 39 No. 7.1.3`,
      },
      {
        id: "III-1-10",
        no: undefined,
        descId: `Terdapat sistem color code pada proses penyimpanan untuk memisahkan berdasarkan kategori expired date. Hijau expired date lebih dari sama dengan 3 bulan, kuning expired date Kurang dari 2 bulan, Merah expired date kurang dari sma dengan 1 bulan, hitam expired (pisahkan di area khusus).`,
        descEn: `There is a colour code system in the storage process to separate by expiration date category. Green expired date more than equal to 3 months, yellow expired date less than 2 months, red expired date less than equal to 1 month, black expired (separate in special area).`,
        reference: `CAC/RCP 39 No. 7.1.3`,
      },
      {
        id: "III-1-11",
        no: "III.3",
        labelId: `Wadah Penyimpanan Bukan Makanan (Non Food)`,
        labelEn: `Wadah Penyimpanan Bukan Makanan (Non Food)`,
        descId: `Wadah penampungan bahan yang tidak dapat di makan (non food), termasuk penampungan sampah harus terbuat dari bahan yang kuat, anti bocor, tidak berkarat, tidak menyerap air, mudah dibersihkan, dan tertutup rapat/aman untuk mencegah kontaminasi`,
        descEn: `Containers for non-food items, including waste containers, must be made of strong, leak-proof, non-rusting, non-absorbent of water, easy to clean, and tightly closed/secure to prevent`,
        reference: `CAC/RCP 39 No. 4.4.2.2`,
      },
      {
        id: "III-1-12",
        no: undefined,
        descId: `Terdapat identifikasi/penanda yang jelas untuk wadah penyimpanan bukan makanan (non food) untuk menghindari kesalahan penggunaan`,
        descEn: `There is clear identification/marking for non-food storage containers to avoid misuse.`,
        reference: `CAC/RCP 39 No. 4.4.3`,
      },
      {
        id: "III-1-13",
        no: "III.4",
        labelId: `Penyimpanan Bahan Kimia Berbahaya`,
        labelEn: `Penyimpanan Bahan Kimia Berbahaya`,
        descId: `Bahan kimia harus diberi label tingkat racunnya, cara penggunaan, disimpan ditempat terpisah, terkunci, dan hanya dapat diakses oleh pihak yang telah ditetapkan`,
        descEn: `Chemicals must be labelled with the level of toxicity, how to use, stored in a separate place, locked, and can only be accessed by designated parties`,
        reference: `CAC/RCP 39 No.5.7.1
ISO/TS 22002-2:2013 No. 4.6.3`,
      },
      {
        id: "III-1-14",
        no: undefined,
        descId: `Tidak ditemukan bahan kimia berbahaya di area penanganan makanan`,
        descEn: `No hazardous chemicals were found in the food handling area`,
        reference: `ISO/TS 22002-2:2013 No. 4.6.3`,
      },
      {
        id: "III-1-15",
        no: undefined,
        descId: `Penyimpanan bahan kimia selalu dengan kemasan asli nya (tidak menggunakan wadah bekas lain)`,
        descEn: `Chemical storage is always with its original packaging (not using other used containers)`,
        reference: `ISO/TS 22002-2:2013 No. 4.6.3`,
      },
    ],
  },
  {
    key: "IV",
    no: "IV.",
    // Source title is "Preparation/ Persiapan awal Bahan Makanan" — the only
    // section where the English label comes before the Indonesian one
    // (every other section is "Indonesian / English"). Fixed by hand rather
    // than by the generator's positional split, which assumes the common
    // ordering.
    titleId: `Persiapan awal Bahan Makanan`,
    titleEn: `Preparation`,
    items: [
      {
        id: "IV-1",
        no: "IV.1",
        labelId: `Proses Penerimaan Bahan dari store / Material Receiving From Store`,
        labelEn: `Proses Penerimaan Bahan dari store / Material Receiving From Store`,
        descId: `Apakah dilakukan Inspection semua bahan makanan pada saat penerimaan dari store & tidak ditemukan bahan makanan yang expired & Kualitas Bahan Makanan masih layak (tidak ada tanda-tanda kerusakan & tidak ada kontaminasi benda asing/ Jamur, ulat dan serangga lainnya)?`,
        descEn: `Is Inspection of all food ingredients at the time of receipt from the store & no expired food ingredients were found & the quality of food ingredients is still appropriate (no signs of damage & no foreign object contamination / mould, caterpillars and other insects)?`,
        reference: `CAC/RCP 39 No.7.1.1`,
      },
      {
        id: "IV-2",
        no: "IV.2",
        labelId: `Proses Persiapan Buah & Sayuran (RTE & Non RTE) .`,
        labelEn: `Fruit & Vegetable Preparation`,
        descId: `Apakah dilakukan proses sortasi, cleaning & sanitasi untuk semua bahan (buah & sayuran) sesuai dengan WSI Sanitasi Buah dan Sayur.`,
        descEn: `Is the sorting, cleaning & sanitisation process carried out for all ingredients (fruit & vegetables) in accordance with the Fruit and Vegetable Sanitation WSI.`,
        reference: `CAC/RCP 39 No.7.1.1`,
      },
      {
        id: "IV-3",
        no: undefined,
        descId: `Apakah form Inspection kondisi peralatan tersedia? & dilakukan Inspection secara routine untuk melihat kondisi peralatan apakah masih layak digunakan sebelum proses lebih lanjut (Cutting board kondisi bersih & tidak ada potensi serpihan plastic & Personal yg bertugas dalam penanganan bahan harus menggunakan APD yang lengkap (menempelkan STD Personal Hygiene diarea preparation buah & sayuran)`,
        descEn: `Is the equipment condition inspection form available and routine inspection is carried out to see whether the condition of the equipment is still suitable for use before further processing (Cutting board is clean and there is no potential for plastic debris & Personal in charge of handling materials must use complete PPE (sticking STD Personal Hygiene in the fruit & vegetable preparation area).`,
        reference: `CAC/RCP 39 No.4.4.1`,
      },
      {
        id: "IV-4",
        no: undefined,
        descId: `Apakah Personal yg bertugas dalam penanganan bahan sudah menggunakan APD yang lengkap dalam menangani bahan2 yang RTE?`,
        descEn: `Are the personnel in charge of handling ingredients already using complete PPE in handling RTE ingredients?`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "IV-5",
        no: undefined,
        descId: `Apakah pada saat sanitasi buah & sayuran RTE menggunakan Titan Chlor & dicatat dalam form penggunaan Titan Chlor?`,
        descEn: `When sanitising RTE fruits & vegetables, do you use Titan Chlor and record it in the Titan Chlor usage form?`,
        reference: `Permenkes No 2 Tahun 2023`,
      },
      {
        id: "IV-6",
        no: "IV.3",
        labelId: `Thawing & Butcher Frozen FoodThawing`,
        labelEn: `Thawing & Butcher Frozen FoodThawing`,
        descId: `Apakah kondisi area thawing dalam kondisi bersih & sudah dilakukan sanitasi)? (Ruang Thawing tidak berbau & kondisi bersih, tidak terdapat Hama/ pest & bahan2 chemical & benda2 asing yang akan berpotensi mengkontaminasi kedalam bahan makanan)`,
        descEn: `Is the condition of the thawing area clean & sanitised (Thawing room is odourless & clean, there are no pests & chemicals & foreign objects that will potentially contaminate food ingredients)?`,
        reference: `CAC/RCP 39 No.4.4.2.1`,
      },
      {
        id: "IV-7",
        no: undefined,
        descId: `Proses thawing dilakukan dengan cara yang tepat, dengan salah satu metode dibawah ini:
- Di suhu ruang  sampai suhu inti mencapai 0 - 4 °C
- Di dalam chiller dengan suhu inti 0- 4°C`,
        descEn: `The thawing process is carried out in an appropriate manner, with one of the following methods:
- At room temperature until the core temperature reaches 0 - 4 °C
- In a chiller with a core temperature of 0 - 4°C`,
        reference: `CAC/RCP 39 No.7.4.2
ISO/TS 22002-2:2013 No. 5.1`,
      },
      {
        id: "IV-8",
        no: undefined,
        descId: `Terdapat pencatatan pemantuan proses thawing untuk memastikan proses thawing sempurna ( Suhu inti bahan 4 °C)`,
        descEn: `There are records of monitoring the thawing process to ensure the thawing process is complete (Core temperature of ingredients 4°C)`,
        reference: `CAC/RCP 39 No.7.4.2
ISO/TS 22002-2:2013 No. 5.1`,
      },
      {
        id: "IV-9",
        no: undefined,
        descId: `Apakah selama proses thawing kemasan luar bahan dilepas & disusun kedalam keranjang Thawing & dan tersedia alat keranjang untuk menampung tetesan darah?`,
        descEn: `During the thawing process, is the outer packaging removed and placed into the thawing basket and is there a basket to catch drips?`,
        reference: `CAC/RCP 39 No.7.4.2`,
      },
      {
        id: "IV-10",
        no: undefined,
        descId: `Apakah Bahan yang akan dithawing dipisahkan dengan bahan2 yang tidak sejenis?`,
        descEn: `Is the material to be thawed separated from incompatible materials?`,
        reference: `CAC/RCP 39 No.7.4.2`,
      },
      {
        id: "IV-11",
        no: undefined,
        descId: `Apakah kondisi peralatan butcher (cutting board, pisau & metal glove) masih layak digunakan? (Cutting board tidak berserat & dalam kondisi bersih) pisau & metal glove masih dalam kondisi layak pakai (tidak gompal & bolong?)`,
        descEn: `Is the condition of butcher equipment (cutting board, knife & metal glove) still suitable for use? (Cutting board is not fibrous & in clean condition) knife & metal glove are still in suitable condition (not chipped & perforated?).`,
        reference: `CAC/RCP 39 No.4.4.2.1`,
      },
      {
        id: "IV-12",
        no: undefined,
        descId: `Apakah dilakukan pengujian Organolpetic Test (Bau/ Aroma, warna & tekstur) untuk semua bahan setelah proses thawing & butcher?`,
        descEn: `Is an Organolpetic Test (Odour/Smell, colour & texture) conducted for all ingredients after the thawing & butcher process?`,
        reference: `CAC/RCP 39 No.7.1.1`,
      },
      {
        id: "IV-13",
        no: "IV.4",
        labelId: `Pencucian & penyimpanan bahan setelah butcher.`,
        labelEn: `Washing & storage of material after butcher`,
        descId: `Apakah diLakukan pencucian bahan setelah di butcher menggunakan potable water?`,
        descEn: `Is there washing of ingredients after butcher using potable water?`,
        reference: `CAC/RCP 39 No7.3`,
      },
      {
        id: "IV-14",
        no: undefined,
        descId: `Apakah diLakukan pencucian bahan setelah di butcher menggunakan potable water?`,
        descEn: `Is the washing of ingredients after butcher using potable water?`,
        reference: `CAC/RCP 39 No7.3`,
      },
      {
        id: "IV-15",
        no: undefined,
        descId: `Apakah Suhu penyimpanan ≤ 4oC selama max 3 hari, tertutup rapat dan terpisah dengan bahan2 yang RTE?`,
        descEn: `Is the storage temperature ≤ 4oC for max 3 days, tightly closed and separated from RTE ingredients?`,
        reference: `CAC/RCP 39 No7.4.2`,
      },
    ],
  },
  {
    key: "V",
    no: "V.",
    titleId: `Bakery Process`,
    titleEn: `Bakery Process`,
    items: [
      {
        id: "V-1",
        no: "V.1",
        labelId: `Preparation/ Persiapan awal Bahan Bakery.`,
        labelEn: `Preparation of Bakery Material`,
        descId: `Apakah semua peralatan untuk proses bakery sudah dilakukan cleaning & sanitasi`,
        descEn: `Has all equipment for the bakery process been cleaned & sanitised?`,
        reference: `CAC/RCP 39 No.4.4.2.1`,
      },
      {
        id: "V-2",
        no: undefined,
        descId: `Apaklah Pengayakan tepung dilakukan  untuk menghilangkan potensi kontaminasi benda asing (serpihan logam, kutu & hama lainnya)? & kondisi ayakan dalam kondisi layak pakai? Tidak rusak/ sobek & bersih?`,
        descEn: `Is flour sieving done to eliminate potential foreign contamination (metal flakes, bugs & other pests)? & is the sieve in good condition? Not damaged/torn & clean?`,
        reference: `CAC/RCP 39 No.7.1.1`,
      },
      {
        id: "V-3",
        no: "V.2",
        labelId: `Roasting`,
        labelEn: `Roasting`,
        descId: `Apakah selama proses Roasting suhu oven di set 
 > 150 °c & dilakukan pengukuran suhu inti bakery?`,
        descEn: `Is the oven temperature during the roasting process set to  > 150 °c & bakery core temperature measurements are taken?`,
        reference: `CAC/RCP 39 No.7.5.1
ISO/TS 22002-2:2013 No. 5.3`,
      },
      {
        id: "V-4",
        no: "V.3",
        labelId: `Penyimpanan produk bakery`,
        labelEn: `Storage of bakery products`,
        descId: `Apakah penyimpanan produk bakery dalam chiller/ show case, tertutup rapat, terpisah dengan bahan2 mentah & diberi /daily label/ day dot disetiap produk makanan?`,
        descEn: `Is the storage of bakery products in a chiller / show case, tightly closed, separate from raw materials & given / daily label / day dot for each food product?`,
        reference: `CAC/RCP 39 No.7.7.3`,
      },
      {
        id: "V-5",
        no: undefined,
        descId: `Apakah suhu penyimpanan product bakery dicatat dan didokumentasikan? & Suhu penyimpanan product bakery ≤ 5 °C max 3 hari, kondisi tidak berjamur, terpisah dari bahan mentah, penyimpanan dengan wadah stainless yg bersih?`,
        descEn: `Is the storage temperature of bakery products recorded and documented? & Storage temperature of bakery products ≤ 5°C max 3 days, non-mouldy conditions, separated from raw materials, storage in clean stainless containers?`,
        reference: `CAC/RCP 39 No.7.7.3`,
      },
      {
        id: "V-6",
        no: "V.4",
        labelId: `Uji Organoleptik`,
        labelEn: `Organoleptic Test`,
        descId: `Apakah dilakukan uji organolpetic product bakery/ snack2 lainnya sebelum disajikan ke client?`,
        descEn: `Is organolpetic test of bakery products/other snacks conducted before serving to clients?`,
        reference: `CAC/RCP 39 No.7.11`,
      },
    ],
  },
  {
    key: "VI",
    no: "VI.",
    titleId: `Proses Pemasakan`,
    titleEn: `Cooking Process`,
    items: [
      {
        id: "VI-1",
        no: "VI.1",
        labelId: `Persiapan awal Bahan dan peralatan`,
        labelEn: `Initial preparation Materials and equipment`,
        descId: `Apakah semua peralatan yang akan digunakan untuk cooking dalam kondisi bersih & sudah disanitasi? (Kondisi Peralatan Masak bersih/ tidak terdapat sisa makanan/ residu sisa makanan & sudah dilakukan sanitasi dengan menggunakan Hot water (>80 °C) atau chemical.`,
        descEn: `Are all equipment that will be used for cooking in a clean & sanitised condition? (Condition of Cookware is clean / there is no food residue / food residue & sanitisation has been carried out using Hot water (>80 ° C) or chemicals.`,
        reference: `CAC/RCP 39 No.4.4.2.1`,
      },
      {
        id: "VI-2",
        no: undefined,
        descId: `Apakah dilakukan Pengujian organoleptic test/ kualitas bahan makanan yang akan diproses (Aroma, warna & tekstur) (Tidak terdapat bahan makanan ber aroma tidak sedap, terjadi perubahan warna & tekture)`,
        descEn: `Are organoleptic tests carried out on the quality of food ingredients to be processed (aroma, colour & texture) (There are no food ingredients with unpleasant aromas, changes in colour & texture)?`,
        reference: `CAC/RCP 39 No.7.5`,
      },
      {
        id: "VI-3",
        no: undefined,
        descId: `Apakah Kualitas Minyak goreng yang akan digunakan masih layak digunakan? (Standard minimum minyak goreng kuning kecoklatan).`,
        descEn: `Is the quality of cooking oil to be used still suitable for use? (Minimum standard of brownish yellow cooking oil).`,
        reference: `CAC/RCP 39 No.7.5`,
      },
      {
        id: "VI-4",
        no: undefined,
        descId: `Apakah penggunaan APD yang lengkap & sesuai pada saat proses cooking? (Std APD (Masker, Sarung tangan & Hairmet)`,
        descEn: `Is the use of PPE complete & appropriate during the cooking process? Std PPE (Mask, Gloves & Hairmet)`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "VI-5",
        no: "VI.2",
        labelId: `Pemasakan`,
        labelEn: `Cooking`,
        descId: `Terdapat pencatatan waktu dan suhu untuk setiap proses pemasakan.
Note:
- Pastikan suhu pemasakan min mencapai 75°C
- Pengukuran suhu dilakukan setelah proses pemasakan dianggap telah matang
- Bakteri yang perlu diwaspadai adalah salmonela, clostridium perfingens`,
        descEn: `There is a record of time and temperature for each cooking process.
Note:
- Make sure the cooking temperature reaches 75°C min.
- Temperature measurement is done after the cooking process is considered done
- Bacteria to watch out for are salmonella, clostridium perfingens`,
        reference: `CAC/RCP 39 No.7.5.1
ISO/TS 22002-2:2013 No. 5.3`,
      },
      {
        id: "VI-6",
        no: "VI.3",
        labelId: `Uji Organoleptik`,
        labelEn: `Organoleptic Test`,
        descId: `Apakah Uji organoleptik/ kualitas makanan setelah proses cooking dilakukan? (Pengujian kualitas Makanan ( Aroma, Rasa, warna, kebersihan/ tidak terdapat kontaminasi benda asing : Rambut,  serpihan logam, plastik dan pest/ hama) semua makanan sesuai standard kualitas                                                                contoh :                                                                                                                         1. Ikan/ seafood : tidak terdapat tanda2 allergi                                                                 2. Ayam (Paha bawah & atas tidak terdapat sisa darah)`,
        descEn: `Is organoleptic/food quality test done after cooking process? (Food quality test (aroma, taste, colour, cleanliness/no foreign contamination: Hair, metal flakes, plastic and pests) all food according to sample quality standards:                                                                                                                         1. Fish / seafood: no signs of allergy 
2. Chicken (Lower & upper thighs no blood residue)`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
    ],
  },
  {
    key: "VII",
    no: "VII.",
    titleId: `Penanganan Setelah Pemasakan`,
    titleEn: `After Cooking Handling`,
    items: [
      {
        id: "VII-1",
        no: "VII.1",
        labelId: `Proses Pemorsian makanan ke dalam insert.`,
        labelEn: `Food portioning process into the insert`,
        descId: `Apakah Peralatan serving dish dalam kondisi bersih & sudah disanitasi dengan air panas/ chemical Sanitasi sebelum dilakukan portioning makanan?`,
        descEn: `Is the serving dish equipment clean and sanitised with hot water / chemical sanitiser before portioning the food?`,
        reference: `CAC/RCP 39 No.7.7.2
ISO/TS 22002-2:2013 No. 5.5`,
      },
      {
        id: "VII-2",
        no: undefined,
        descId: `Apakah makanan yang sudah ditempatkan kedalam serving dish  tertutup rapat? Dan dilengkapi identitas atau label.`,
        descEn: `Is the food that has been placed into the serving dish tightly closed? And equipped with identity or label.`,
        reference: `CAC/RCP 39 No.7.10`,
      },
      {
        id: "VII-3",
        no: "VII.2",
        labelId: `Penyimpanan Makanan panas`,
        labelEn: `Penyimpanan Makanan panas`,
        descId: `Apakah lokasi mempunyai fasilitas penyimpanan makanan panas (Hot Box/ henny penny & Bain Marrie)?`,
        descEn: `Does the location have hot food storage facilities (Hot Box / Henny Penny & Bain Marrie)?`,
        reference: `ISO/TS 22002-2:2013 No. 5.5`,
      },
      {
        id: "VII-4",
        no: undefined,
        descId: `Apakah proses pemanasan makanan dilakukan kedalam hot box. Henny penny atau bain marrie untuk menjaga suhu makanan tetap terjaga > 63oC sebelum dilakukan proses lebih lanjut spt pack meal, serving mess hall?`,
        descEn: `Is the food heating process carried out in a hot box. Henny penny or bain marrie to maintain food temperature > 63oC before further processing such as pack meal, serving mess hall?`,
        reference: `ISO/TS 22002-2:2013 No. 5.9`,
      },
      {
        id: "VII-5",
        no: undefined,
        descId: `Apakah monitoring suhu inti makanan dilakukan selama proses pemanasan?`,
        descEn: `Is core food temperature monitoring done during the heating process?`,
        reference: `CAC/RCP 39 No.7.7.2
ISO/TS 22002-2:2013 No. 5.5`,
      },
    ],
  },
  {
    key: "VIII",
    no: "VIII.",
    titleId: `Proses Serving`,
    titleEn: `Proses Serving`,
    items: [
      {
        id: "VIII-1",
        no: "VIII.1",
        labelId: `Proses Serving/ Bain Marie & Salad Bar`,
        labelEn: `Hot Food Storage`,
        descId: `Apakah Penggantian air bain marie sehabis serving routine dilakukan? (Air Bain Marie dalam kondisi bersih tidak terdapat sisa makanan didalam air bain marie)`,
        descEn: `Is the replacement of bain marie water after serving routine done? (Bain Marie water is clean and there is no food residue in the bain marie water)`,
        reference: `CAC/RCP 39 No.7.10`,
      },
      {
        id: "VIII-2",
        no: undefined,
        descId: `Apakah dilakukan Settingan suhu air bain marie & Salad bar 1 jam sebelum serving? (Suhu Air Bain Marie > 75oC & Salad Bar 4oC)`,
        descEn: `Is the temperature of the bain marie water & salad bar set 1 hour before serving? (Bain marie water > 75oC & salad bar 4oC)`,
        reference: `ISO/TS 22002-2:2013 No. 7.8`,
      },
      {
        id: "VIII-3",
        no: undefined,
        descId: `Apakah kondisi peralatan serving dish & peralatan serving/ bain marie, mesin dispenser sudah dalam kondisi bersih? ( Kondisi semua peralatan serving dalam kondisi bersih tidak terdapat sisa makanan sebelumnya).`,
        descEn: `Is the condition of serving dish & serving equipment / bain marie, dispenser machine in a clean condition? (The condition of all serving equipment is in a clean condition with no previous food residue).`,
        reference: `CAC/RCP 39 No.7.7.2
ISO/TS 22002-2:2013 No. 5.5`,
      },
      {
        id: "VIII-4",
        no: undefined,
        descId: `Apakah kondisi wadah gula, susu, kopi dan wadah lainnya dalam kondisi bersih? (Pastikan semua wadah gula, kopi, tea dan wadah lainnya dalam kondisi tertutup rapat dan dalam kondisi bersih).`,
        descEn: `Is the condition of sugar, milk, coffee and other containers in a clean condition? (Make sure all sugar, coffee, tea and other containers are tightly closed and in a clean condition).`,
        reference: `CAC/RCP 39 No.7.7.2
ISO/TS 22002-2:2013 No. 5.5`,
      },
      {
        id: "VIII-5",
        no: undefined,
        descId: `Apakah kondisi peralatan makan (Piring, sendok/ garpu, gelas) dalam kondisi bersih dan kering?`,
        descEn: `Is the condition of tableware (Plate, spoon/fork, glass) clean and dry?`,
        reference: `CAC/RCP 39 No.7.7.2
ISO/TS 22002-2:2013 No. 5.5`,
      },
      {
        id: "VIII-6",
        no: undefined,
        descId: `Apakah kondisi makanan selalu tertutup sebelum serving? Untuk menjaga suhu makanan tetap terjaga >630C & mencegah kontaminasi benda asing (rambut, lalat & serangga lainnya)`,
        descEn: `Is the food always covered before serving? To maintain food temperature >630C & prevent foreign object contamination (hair, flies & other insects).`,
        reference: `CAC/RCP 39 No.7.10`,
      },
      {
        id: "VIII-7",
        no: undefined,
        descId: `Apakah Monitoring suhu inti makanan sebelum & selama proses serving di bain marie & Salad Bar dilakukan dan dicatat? 
1. Suhu inti Makanan panas > 63oC maximal 6 Jam
2. Suhu Salad Bar 4oC.`,
        descEn: `Is core temperature monitoring of food before & during serving process in bain marie & salad bar done and recorded? 
1. Food core temperature > 63oC 
2.  Salad Bar temperature 4oC.`,
        reference: `ISO/TS 22002-2:2013 No. 7.8`,
      },
      {
        id: "VIII-8",
        no: undefined,
        descId: `Apakah  Lakukan Uji Organoleptic semua makanan yg berada di dalam serving dish, awal & akhir proses serving? Rasa, Aroma, teksture, kebersihan (tidak ada kontaminasi benda asing,  lalat, semut, rambut, kecoa) sesuai standard.`,
        descEn: `Do Organoleptic Tests of all food in the serving dish, at the beginning & end of the serving process? Taste, aroma, texture, cleanliness (no foreign contamination, flies, ants, hair, cockroaches) as per standard.`,
        reference: `CAC/RCP 39 No.7.11`,
      },
    ],
  },
  {
    key: "IX",
    no: "IX.",
    titleId: `Pack Meal & Delivery`,
    titleEn: `Pack Meal & Delivery`,
    items: [
      {
        id: "IX-1",
        no: "IX.1",
        labelId: `Proses Makanan Kemasan`,
        labelEn: `Food Pack Meal Process`,
        descId: `Apakah penggunaan APD yang lengkap diarea pack meal? (Masker, Sarung Tangan, Hairnet & Apron) (Standard Personal Hygiene di area Pack Meal (Max Penggunaan Sarung tangan 1 Jam) & setelah menyentuh peralatan selain makanan)`,
        descEn: `Is complete PPE used in the pack meal area? (Mask, Gloves, Hairnet & Apron) (Standard Personal Hygiene in the Pack Meal area (Max Use of Gloves 1 Hour) & after touching equipment other than food)`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "IX-2",
        no: undefined,
        descId: `Apakah kondisi ruangan pack meal steril/ tidak terdapat activitas hama/ pest/ lalat?`,
        descEn: `Is the condition of the pack meal room sterile / no pest / fly activity?`,
        reference: `CAC/RCP 39 No.5.6.1
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "IX-3",
        no: undefined,
        descId: `Apakah suhu ruang pack meal terkontrol (suhu ruang pack meal antara 15 - 20oC)?`,
        descEn: `Is the pack meal room temperature controlled (pack meal room temperature between 15 - 20 °C)?`,
        reference: `CAC/RCP 39 No. 4.3.19`,
      },
      {
        id: "IX-4",
        no: undefined,
        descId: `Apakah Uji organoleptic semua jenis makanan yg berada di dalam serving dish, awal & akhir proses pack meal dilakukan? Rasa, Aroma, teksture, kebersihan (tidak ada kontaminasi benda asing,  lalat, semut, rambut, kecoa) sesuai standard.`,
        descEn: `Are organoleptic tests of all types of food in the serving dish, at the beginning & end of the pack meal process carried out? Taste, aroma, texture, cleanliness (no foreign object contamination, flies, ants, hair, cockroaches) according to standards.`,
        reference: `CAC/RCP 39 No.6.6
ISO/TS 22002-2:2013 No. 4.4.4.1
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "IX-5",
        no: undefined,
        descId: `Apakah kondisi makanan tertutup rapat sebelum proses pengisian makanan kedalam wadah pack meal/ meal tray?`,
        descEn: `Is the food condition tightly closed before the process of filling the food into the pack meal container / meal tray?`,
        reference: `CAC/RCP 39 No.7.10`,
      },
      {
        id: "IX-6",
        no: undefined,
        descId: `Apakah penggunaan bahan makanan lain (Buah & Garnis) dalam kondisi bersih & tersanitasi?`,
        descEn: `Is the use of other food ingredients (fruits & garnishes) in a clean & sanitised condition?`,
        reference: `CAC/RCP 39 No.7.1.1`,
      },
      {
        id: "IX-7",
        no: undefined,
        descId: `Apakah rotasi makanan dilakukan untuk menu Makanan yg high risk category (Ikan, Daging & Poultry/ jenis unggas) jika terpapar udara luar > 30 menit dan dimasukkan kedalam Hot box, heny penny, bain marrie agar suhu makanan tercapai ≥ 63oC`,
        descEn: `Is food rotation carried out for high risk category food (Fish, Meat & Poultry) if exposed to outside air for > 30 minutes and put into Hot box, heny penny, bain marrie so that the food temperature reaches ≥ 63oC.`,
        reference: `ISO/TS 22002-2:2013 No. 5.9`,
      },
      {
        id: "IX-8",
        no: undefined,
        descId: `Apakah Inspection 100% makanan setelah proses sealing atau setelah pembungkusan dilakukan? Tidak ada kontaminasi benda asing / serangga & kondisi makanan bersih & terdapat QC Pass/ sticker (Status Product Released) pada kemasan plastic mica/ tray dan atau Meal Box`,
        descEn: `Is food inspection after sealing process or after packaging done? There is no foreign object/insect contamination & food condition is clean & there is QC Pass/sticker (Status Product Released) on plastic mica/tray and or Meal Box packaging.`,
        reference: `CAC/RCP 39 No.7.11`,
      },
      {
        id: "IX-9",
        no: "IX.2",
        labelId: `Pack Meal Delivery`,
        labelEn: `Pack Meal Delivery`,
        descId: `Apakah Kondisi kendaraan dalam kondisi bersih sebelum digunakan? Kondisi kendaraan bersih, tidak berbau & tidak terdapat pest/ serangga & menggunaan Pallet Plastic`,
        descEn: `Is the vehicle in a clean condition before use? Vehicle condition is clean, odourless & no pest/insects & using Plastic Pallet.`,
        reference: `CAC/RCP 39 No. 7.9.1`,
      },
      {
        id: "IX-10",
        no: undefined,
        descId: `Apakah kondisi makanan tertutup rapat pada saat pengiriman?`,
        descEn: `Is the food condition tightly closed at the time of delivery?`,
        reference: `CAC/RCP 39 No. 7.9.2`,
      },
      {
        id: "IX-11",
        no: undefined,
        descId: `Apakah terdapat  log book/ check list serah terima Pack meal dari supervisior catering ke driver/ petugas pengantar pack meal?`,
        descEn: `Is there a log book / check list for the handover of Pack meal from the catering supervisor to the driver / pack meal delivery officer?`,
      },
      {
        id: "IX-12",
        no: undefined,
        descId: `Apakah terdapat form serah terima pack meal yang ditandatangangi oleh client?`,
        descEn: `Is there a pack meal handover form signed by the client?`,
      },
      {
        id: "IX-13",
        no: undefined,
        descId: `Waktu pengiriman makanan/pack meal maksimal 2 jam untuk memastikan “Golden Times”  (4 jam terhitung setelah proses pemasakan ) tercapai.`,
        descEn: `The maximum delivery time of food/pack meal is 2 hours to ensure the ‘Golden Times’ (4 hours after the cooking process) is achieved.`,
        reference: `CAC/RCP 39 No. 7.9.3`,
      },
      {
        id: "IX-14",
        no: "IX.3",
        labelId: `Food Delivery (Process Prasmanan Office Client)`,
        labelEn: `Food Delivery (Process Prasmanan Office Client)`,
        descId: `Pastikan Kondisi kendaraan & Cambro dalam kondisi bersih sebelum digunakan`,
        descEn: `Make sure the vehicle & Cambro are clean before use.`,
        reference: `CAC/RCP 39 No. 7.9.1`,
      },
      {
        id: "IX-15",
        no: undefined,
        descId: `Pastikan Kondisi makanan tertutup rapat pada saat pengiriman & Suhu Makanan tercontrol`,
        descEn: `Ensure food condition is tightly closed during delivery & food temperature is controlled`,
        reference: `CAC/RCP 39 No. 7.9.2`,
      },
      {
        id: "IX-16",
        no: undefined,
        descId: `Apakah Penggantian air bain marie sehabis serving routine dilakukan? (Air Bain Marie dalam kondisi bersih tidak terdapat sisa makanan didalam air bain marie)`,
        descEn: `Is the replacement of bain marie water after serving routine done? (Bain Marie water is clean and there is no food residue in the bain marie water)`,
        reference: `CAC/RCP 39 No. 7.10`,
      },
      {
        id: "IX-17",
        no: undefined,
        descId: `Apakah dilakukan Settingan suhu air bain marie & Salad bar 1 jam sebelum serving? (Suhu Air Bain Marie > 75oC & Salad Bar 4oC)`,
        descEn: `Is the temperature of the bain marie water & salad bar set 1 hour before serving? (Bain Marie water temperature > 75oC & salad bar 4oC)`,
        reference: `CAC/RCP 39 No. 7.10`,
      },
      {
        id: "IX-18",
        no: undefined,
        descId: `Apakah kondisi peralatan serving dish & peralatan serving/ bain marie, mesin dispenser sudah dalam kondisi bersih? ( Kondisi semua peralatan serving dalam kondisi bersih tidak terdapat sisa makanan sebelumnya)`,
        descEn: `Is the condition of serving dish & serving equipment / bain marie, dispenser machine in a clean condition? (The condition of all serving equipment is in a clean condition with no previous food residue).`,
        reference: `CAC/RCP 39 No.5.2.2
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "IX-19",
        no: undefined,
        descId: `Apakah kondisi wadah gula, susu, kopi dan wadah lainnya dalam kondisi bersih? (Pastikan semua wadah gula, kopi, tea dan wadah lainnya dalam kondisi tertutup rapat dan dalam kondisi bersih)`,
        descEn: `Is the condition of sugar, milk, coffee and other containers in a clean condition? (Make sure all sugar, coffee, tea and other containers are tightly closed and in a clean condition).`,
        reference: `CAC/RCP 39 No.5.2.2
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "IX-20",
        no: undefined,
        descId: `Apakah kondisi peralatan makan (Piring, sendok/ garpu, gelas) dalam kondisi bersih dan kering?`,
        descEn: `Is the condition of tableware (Plate, spoon/fork, glass) clean and dry?`,
        reference: `CAC/RCP 39 No.5.2.2
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "IX-21",
        no: undefined,
        descId: `Apakah kondisi makanan selalu tertutup sebelum serving? Untuk menjaga suhu makanan tetap terjaga >630C & mencegah kontaminasi benda asing (rambut, lalat & serangga lainnya)`,
        descEn: `Is the food always covered before serving? To maintain food temperature >630C & prevent foreign object contamination (hair, flies & other insects).`,
        reference: `CAC/RCP 39 no.7.10`,
      },
      {
        id: "IX-22",
        no: undefined,
        descId: `Apakah Monitoring suhu inti makanan sebelum & selama proses serving di bain marie & Salad Bar dilakukan dan dicatat? 
1. Suhu inti Makanan panas > 63oC maximal 6 Jam
2. Suhu Salad Bar 4oC.`,
        descEn: `Is core temperature monitoring of food before & during serving process in bain marie & salad bar done and recorded? 
1. Food core temperature > 63oC 
2.  Salad Bar temperature 4oC.`,
        reference: `CAC/RCP 39 no.7.10`,
      },
      {
        id: "IX-23",
        no: undefined,
        descId: `Apakah  Lakukan Uji Organoleptic semua makanan yg berada di dalam serving dish, awal & akhir proses serving? Rasa, Aroma, teksture, kebersihan (tidak ada kontaminasi benda asing,  lalat, semut, rambut, kecoa) sesuai standard.`,
        descEn: `Do Organoleptic Tests of all food in the serving dish, at the beginning & end of the serving process? Taste, aroma, texture, cleanliness (no foreign contamination, flies, ants, hair, cockroaches) as per standard.`,
        reference: `CAC/RCP 39 No.7.11`,
      },
    ],
  },
  {
    key: "X",
    no: "X.",
    titleId: `Sampel Makanan`,
    titleEn: `Food Sample`,
    items: [
      {
        id: "X-1",
        no: "X.1",
        labelId: `Pengambilan Sampel`,
        labelEn: `Sampling`,
        descId: `Terdapat sampel makanan dari setiap menu makanan yang disimpan dalam suhu Freezer minimal -15 °C.`,
        descEn: `There are food samples from each menu item stored in a freezer at a minimum temperature of -15°C.`,
        reference: `CAC/RCP 39 No.7.9.2
ISO/TS 22002-2:2013 No. 4.6.2
Permenkes No 2 Tahun 2023`,
      },
      {
        id: "X-2",
        no: undefined,
        descId: `Semua sampel diberi label dengan jelas dan dapat mempermudah proses traceability.`,
        descEn: `All samples are clearly labelled and can facilitate the traceability process.`,
      },
      {
        id: "X-3",
        no: undefined,
        descId: `Tersedia wadah container untuk food sample atau jika tidak memiliki tutup maka beri plastic wrap`,
        descEn: `There is a container for food samples or if it does not have a lid then give plastic wrap.`,
      },
      {
        id: "X-4",
        no: undefined,
        descId: `Food sample diambil untuk setiap mealtime (breakfast, lunch, dinner, dll) disimpan selama 3x24 jam dalam suhu Freezer minimal -15 °C.`,
        descEn: `Food samples taken for each mealtime (breakfast, lunch, dinner, etc.) are stored for 3x24 hours in a Freezer temperature of at least -15°C.`,
      },
      {
        id: "X-5",
        no: undefined,
        descId: `Tersedia label keterangan tanggal, waktu makan (breakfast, lunch, dinner, dll), dan jenis makanan.
Jumlah Sampel
Makanan kering/gorengan dan kue = 150 gr
Makanan berkuah sayur   = 150 gr + kuah 1 sendok sayur
Makanan penyedap/sambal  = 2 sendok makan
Makanan cair   = 1 sendok sayur
Nasi    = 100 gr
Minuman   = 100 cc`,
        descEn: `There is a label with the date, meal time (breakfast, lunch, dinner, etc.), and type of food.
Sample Quantity
Dry/fried food and cakes = 150 g
Vegetable soup = 150 g + 1 spoon of vegetable soup
Flavouring/chili sauce = 2 tablespoons
Liquid food = 1 tablespoon
Rice = 100 gr
Drink = 100 cc`,
      },
    ],
  },
  {
    key: "XI",
    no: "XI.",
    titleId: `Penggunaan Air`,
    titleEn: `Water Usage`,
    items: [
      {
        id: "XI-1",
        no: "XI.1",
        labelId: `Air Minum`,
        labelEn: `Potable Water`,
        descId: `Dilakukan pemeriksaan kualitas air secara berkala berdasarkan standar Kualitas Air Bersih dan/atau Kualitas Air Minum`,
        descEn: `Periodic water quality checks are carried out based on Drinking Water Quality standards.`,
        reference: `CAC/RCP 39 No. 4.3.12.1
PerMenkes No 2 Tahun 2023`,
      },
      {
        id: "XI-2",
        no: undefined,
        descId: `Dilakukan pembersihan dan montoring terhadap tempat penampungan air bersih dan air  minum`,
        descEn: `Cleaning and monitoring of clean water and drinking water reservoirs are carried out.`,
        reference: `ISO/TS 22002-2:2013 No. 4.2.1`,
      },
      {
        id: "XI-3",
        no: "XI.2",
        labelId: `Air Panas`,
        labelEn: `Hot Water`,
        descId: `Terdapat pasokan air panas untuk proses sanitasi perkakas kerja dan/atau alat makan`,
        descEn: `There is a hot water supply for the sanitisation process of work tools and/or cutlery.`,
        reference: `CAC/RCP 39 No. 4.3.12.2`,
      },
      {
        id: "XI-4",
        no: "XI.3",
        labelId: `Es`,
        labelEn: `Ice`,
        descId: `Es yang digunakan harus bersumber dari air minum serta di tangani dan disimpan dengan baik untuk menghindari kontaminasi`,
        descEn: `Ice used must be sourced from drinking water and handled and stored properly to avoid contamination.`,
        reference: `CAC/RCP 39 No. 4.3.12.3
ISO/TS 22000-2:2013 No. 4.2.2`,
      },
      {
        id: "XI-5",
        no: "XI.4",
        labelId: `Pencucian buah dan sayur`,
        labelEn: `Sanitation FFV`,
        descId: `Pencucian buah dan sayur menggunakan air dengan cara yang tepat sebelum ditambahkan ke dalam makanan`,
        descEn: `Washing of fruits and vegetables using water in an appropriate manner before adding to food`,
        reference: `CAC/RCP 39 No. 7.3`,
      },
    ],
  },
  {
    key: "XII",
    no: "XII.",
    titleId: `Pencegahan Kontaminasi Silang`,
    titleEn: `Prevention of Cross Contamination`,
    items: [
      {
        id: "XII-1",
        no: "XII.1",
        labelId: `Pemisahan`,
        labelEn: `Segregation`,
        descId: `Terdapat pemisahan antara pengolahan dan penyimpanan makanan mentah dengan makanan matang`,
        descEn: `There is a separation between processing and storage of raw and cooked foods`,
        reference: `CAC/RCP 39 No.7.2.1`,
      },
      {
        id: "XII-2",
        no: "XII.2",
        labelId: `Preventive program`,
        labelEn: `Preventive program`,
        descId: `Terdapat program untuk mencegah kontaminasi silang`,
        descEn: `A programme is in place to prevent cross-contamination`,
        reference: `CAC/RCP 39 No.7.2.1`,
      },
      {
        id: "XII-3",
        no: "XII.3",
        labelId: `Dedicated Person`,
        labelEn: `Dedicated Person`,
        descId: `Terdapat pemisahan petugas yang mengolah makanan di setiap proses/tahapan pengolahan`,
        descEn: `There is separation of food handlers at each process/stage of processing`,
        reference: `CAC/RCP 39 No.7.2.2`,
      },
      {
        id: "XII-4",
        no: "XII.4",
        labelId: `Dedicated equipment`,
        labelEn: `Dedicated equipment`,
        descId: `Terdapat pemisahan peralatan dan perkakas yang digunakan untuk makanan mentah dan makanan matang`,
        descEn: `There is separation of equipment and utensils used for raw and cooked food`,
        reference: `CAC/RCP 39 No.7.2.4`,
      },
      {
        id: "XII-5",
        no: "XII.5",
        labelId: `Dedicated equipment`,
        labelEn: `Dedicated equipment`,
        descId: `Peralatan yang digunakan untuk mengolah bahan mentah harus dipisahkan dengan pengolahan bahan matang. Apabila tidak dipisahkan, ada pengaturan pencucian dan sanitasinya`,
        descEn: `Equipment used to process raw materials should be separated from that used to process cooked materials. If it is not separated, there are washing and sanitising`,
        reference: `CAC/RCP 39 No.7.2.5`,
      },
    ],
  },
  {
    key: "XIII",
    no: "XIII.",
    titleId: `Pengendalian Hama (Pest Control)`,
    titleEn: `Pengendalian Hama (Pest Control)`,
    items: [
      {
        id: "XIII-1",
        no: "XIII.1",
        labelId: `Program`,
        labelEn: `Program`,
        descId: `Terdapat program pengendalian hama, termasuk untuk serangga dan tikus`,
        descEn: `Pest control programme in place, including for insects and rodents`,
        reference: `CAC/RCP 39 No.5.6.1
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "XIII-2",
        no: "XIII.2",
        labelId: `Prosedur`,
        labelEn: `Prosedur`,
        descId: `Terdapat SOP untuk program pengendalian hama`,
        descEn: `There is an SOP for the pest control programme`,
        reference: `CAC/RCP 39 No.5.6.2
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "XIII-3",
        no: "XIII.3",
        labelId: `Dokumen penunjang`,
        labelEn: `Dokumen penunjang`,
        descId: `Bahan kimia yang digunakan untuk pengendalian hama harus aman dan dilengkapi dengan MSDS, dan ijin penggunaan bahan kimia (Komite Pestisida) masih berlaku`,
        descEn: `Chemicals used for pest control must be safe and equipped with MSDS, and the chemical licence (Pesticide Committee) is still valid.`,
        reference: `CAC/RCP 39 No.5.6.2
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "XIII-4",
        no: "XIII.4",
        labelId: `Perijinan`,
        labelEn: `Perijinan`,
        descId: `Perusahaan dan petugas pelaksanaan pengendalian hama harus kompeten dan ijin perusahaannya masih berlaku`,
        descEn: `The pest control company and staff must be competent and the company licence is valid.`,
        reference: `CAC/RCP 39 No.5.6.2
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "XIII-5",
        no: "XIII.5",
        labelId: `Regulasi`,
        labelEn: `Regulasi`,
        descId: `Penggunaan pestisida pengendali hama tidak diijinkan di area penangan makanan`,
        descEn: `The use of pest control pesticides is not permitted in food handling areas.`,
        reference: `CAC/RCP 39 No.5.6.3
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
      {
        id: "XIII-6",
        no: "XIII.6",
        labelId: `Dokumentasi`,
        labelEn: `Dokumentasi`,
        descId: `Penggunaan pestisida di area penanganan makanan harus tercatat, dan setelah proses penggunaan pestisida harus dilakukan pembersihan secara menyeluruh untuk semua peralatan di area penanganan makanan untuk menghilangkan residu nya`,
        descEn: `The use of pesticides in food handling areas must be recorded, and after the use of pesticides a thorough cleaning of all equipment in the food handling area must be carried out to remove residues`,
        reference: `CAC/RCP 39 No.5.6.3
ISO/TS 22002-2:2013 No. 4.9.1`,
      },
    ],
  },
  {
    key: "XIV",
    no: "XIV",
    titleId: `Peralatan dan Perkakas`,
    titleEn: `Equipment and utensils`,
    items: [
      {
        id: "XIV-1",
        no: "XIV.1",
        labelId: `Peralatan dan Perkakas`,
        labelEn: `Peralatan dan Perkakas`,
        descId: `Peralatan dan perkakas harus terbuat dari bahan yang tidak menyerap, tahan karat, tidak berbau/beracun, dapat dibersihkan berulang kali`,
        descEn: `Equipment and utensils must be made of non-absorbent, rustproof, odourless/toxic materials, able to be cleaned repeatedly`,
        reference: `CAC/RCP 39 No. 4.4.1
ISO/TS 22002-2:2013 No. 4.3`,
      },
      {
        id: "XIV-2",
        no: undefined,
        descId: `Permukaan peralatan harus halus, bebas lubang atau celah yang dapat menjadi sumber kontaminasi`,
        descEn: `Equipment surfaces should be smooth, free of holes or crevices that could be a source of contamination`,
        reference: `x`,
      },
      {
        id: "XIV-3",
        no: undefined,
        descId: `Terdapat pemisahan/pembedaan peralatan yang digunakan untuk bahan makanan mentah dan makanan matang (mencegah kontaminasi)`,
        descEn: `There is a separation/distinction of equipment used for raw food and cooked food (prevents contamination)`,
        reference: `CAC/RCP 39 No. 4.4.1`,
      },
      {
        id: "XIV-4",
        no: undefined,
        descId: `Penyimpanan peralatan dan perkakas portable seperti sendok, garpu, panci, wajan, dll harus terlindungi dari kontaminasi`,
        descEn: `Storage of portable equipment and utensils such as spoons, forks, pots, pans, etc. must be protected from contamination`,
        reference: `CAC/RCP 39 No. 4.4.4`,
      },
      {
        id: "XIV-5",
        no: undefined,
        descId: `Dilakukan kalibrasi berkala untuk setiap alat ukur yang digunakan, ex: timbangan, termometer`,
        descEn: `Periodic calibration is carried out for each measuring instrument used, ex: scales, thermometers`,
        reference: `ISO/TS 22002-2:2013 No. 4.3`,
      },
      {
        id: "XIV-6",
        no: "XIV.2",
        labelId: `Maintenance`,
        labelEn: `Maintenance`,
        descId: `Terdapat program pemeliharaan untuk bangunan, peralatan, perkakas, saluran air, dan fasilitas lainnya untuk memastikan kondisi nya senantiasa baik`,
        descEn: `Maintenance programmes are in place for buildings, equipment, utensils, drains and other facilities to ensure they are in good condition`,
        reference: `CAC/RCP 39 No.5.1
ISO/TS 22002-2:2013 No. 4.1.5`,
      },
      {
        id: "XIV-7",
        no: undefined,
        descId: `Terdapat proses/prosedur untuk pembersihan, desinfeksim dan pre-use inspeksi terhadap peralatan ataupaun area proses setelah dilakukan perbaikan/perawatan`,
        descEn: `There are processes/procedures in place for cleaning, disinfection and pre-use inspection of equipment or process areas after repairs/maintenance.`,
        reference: `ISO/TS 22002-2:2013 No. 4.1.5`,
      },
    ],
  },
  {
    key: "XV",
    no: "XV.",
    titleId: `Program Pengendalian Kebersihan`,
    titleEn: `Hygiene Control Programme`,
    items: [
      {
        id: "XV-1",
        no: "XV.1",
        labelId: `Prosedur`,
        labelEn: `Prosedur`,
        descId: `Terdapat prosedur untuk pelaksanaan kebersihan untuk semua area`,
        descEn: `Procedures are in place for the implementation of cleanliness for all areas`,
        reference: `CAC/RCP 39 No.5.3`,
      },
      {
        id: "XV-2",
        no: "XV.2",
        labelId: `Jadwal`,
        labelEn: `Jadwal`,
        descId: `Terdapat jadwal pelaksanaan kebersihan yang tertulis lengkap dengan petugas yang bertanggungjawabnya`,
        descEn: `There is a written schedule of cleaning operations with responsible personnel`,
        reference: `CAC/RCP 39 No.5.3`,
      },
      {
        id: "XV-3",
        no: "XV.3",
        labelId: `Dedicated Person`,
        labelEn: `Dedicated Person`,
        descId: `Petugas kebersihan bukan lah bagian dari karyawan yang menangani makanan`,
        descEn: `Cleaners are not part of the food handling staff.`,
        reference: `CAC/RCP 39 No.5.3`,
      },
      {
        id: "XV-4",
        no: "XV.4",
        labelId: `Desinfection`,
        labelEn: `Desinfection`,
        descId: `Semua peralatan dan perkakas kerja harus di cuci dan di desinfeksi secara rutin`,
        descEn: `All equipment and utensils must be washed and disinfected regularly.`,
        reference: `CAC/RCP 39 No.5.2.2
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "XV-5",
        no: "XV.5",
        labelId: `Desinfection`,
        labelEn: `Desinfection`,
        descId: `Pencucian dan desinfeksi peralatan  menggunakan larutan chemical atau air panas 80°C selama 2 menit`,
        descEn: `Wash and disinfect equipment using chemical or 80°C hot water for 2 minutes.`,
        reference: `Permenkes No 2 Tahun 2023`,
      },
      {
        id: "XV-6",
        no: "XV.6",
        labelId: `Labeling`,
        labelEn: `Labeling`,
        descId: `Cairan pembersih harus disimpan terpisah dari gudang makanan serta terdapat label identifikasi yang jelas`,
        descEn: `Cleaning fluids must be stored separately from food storage and clearly labelled with identification.`,
        reference: `CAC/RCP 39 No.5.2.3
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "XV-7",
        no: "XV.7",
        labelId: `Kebersihan lantai`,
        labelEn: `Kebersihan lantai`,
        descId: `Lantai ruang produksi makanan, maupun peralatan lainnya harus selalu dijaga sekering mungkin untuk mencegah pertumbuhan bakteri Listeria monocytogenesis dan bakteri patogen lainnya`,
        descEn: `The floor of the food production room, as well as other equipment must always be kept as dry as possible to prevent the growth of Listeria monocytogenesis and other pathogenic bacteria.`,
        reference: `CAC/RCP 39 No.5.2.3
ISO/TS 22002-2:2013 No. 4.7`,
      },
      {
        id: "XV-8",
        no: "XV.8",
        labelId: `Penyimpanan bahan pembersih`,
        labelEn: `Penyimpanan bahan pembersih`,
        descId: `Perangkat maintenance, peralatan pembersihan, maupun bahan kimia permbersih harus disimpan terpisah dari area makanan untuk menghindari kontaminasi`,
        descEn: `Maintenance tools, cleaning equipment, and cleaning chemicals must be kept separate from the food area to avoid contamination.`,
        reference: `CAC/RCP 39 No.5.2.5
ISO/TS 22002-2:2013 No. 4.7`,
      },
    ],
  },
  {
    key: "XVI",
    no: "XVI",
    titleId: `Manajemen Pembelian`,
    titleEn: `Purchase Management`,
    items: [
      {
        id: "XVI-1",
        no: "XVI.1",
        labelId: `Penilaian Pemasok (Supplier Evaluation)`,
        labelEn: `Penilaian Pemasok (Supplier Evaluation)`,
        descId: `Terdapat kriteria untuk penyeleksian dan evaluasi pemasok/supplier.`,
        descEn: `There are criteria for supplier selection and evaluation.`,
        reference: `ISO/TS 22002-2:2013 No. 4.5.1`,
      },
      {
        id: "XVI-2",
        no: "XVI.2",
        descId: `Tersedia dokumen proses penyeleksian dan evaluasi pemasok/supplier.`,
        descEn: `Supplier selection and evaluation process documents are available.`,
        reference: `ISO/TS 22002-2:2013 No. 4.5.1`,
      },
    ],
  },
  {
    key: "XVII",
    no: "XVII",
    titleId: `Pengawasan`,
    titleEn: `Supervision`,
    items: [
      {
        id: "XVII-1",
        no: "XVII.1",
        descId: `Supervisor melakukan inspeksi rutin terhadap kondisi area penanganan masalah.`,
        descEn: `Supervisors conduct regular inspections of the condition of the handling area.`,
        reference: `CAC/RCP 39 No.6.10
ISO/TS 22002-2:2013 No. 4.10`,
      },
    ],
  },
];
