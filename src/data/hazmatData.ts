// Reference content for the Safety Reference section (TrainingsTab.tsx) —
// the 9 standard GHS (Globally Harmonized System) hazard pictograms, the
// same red-diamond symbols printed on real chemical containers. This is
// deliberately static, bilingual reference content, not a completable
// training module: nobody "finishes" a safety chart, they consult it
// whenever a container has a symbol they don't recognize. No Firestore,
// no per-user state — same reasoning as restroomData.ts/staffReadyData.ts,
// just content bundled with the app.
//
// The four marked `common: true` are what housekeeping/laundry/food-safety
// staff actually run into day to day (bleach, disinfectants, descalers,
// sanitizers) — HazmatGuide.tsx surfaces those first, the rest still shown
// for completeness since any of the 9 could turn up on a less common
// specialty chemical.

export type HazmatSignId =
  | 'CORROSIVE' | 'IRRITANT' | 'FLAMMABLE' | 'OXIDIZING'
  | 'TOXIC' | 'HEALTH_HAZARD' | 'COMPRESSED_GAS' | 'EXPLOSIVE' | 'ENVIRONMENT';

export interface HazmatSign {
  id: HazmatSignId;
  common: boolean;
  nameEn: string;
  nameId: string;
  meaningEn: string;
  meaningId: string;
  whatToDoEn: string;
  whatToDoId: string;
  examplesEn: string;
  examplesId: string;
}

export const HAZMAT_SIGNS: HazmatSign[] = [
  {
    id: 'CORROSIVE',
    common: true,
    nameEn: 'Corrosive',
    nameId: 'Korosif',
    meaningEn: 'Can burn skin and eyes on contact, and damages metal and other materials.',
    meaningId: 'Dapat membakar kulit dan mata jika terkena, serta merusak logam dan bahan lain.',
    whatToDoEn: 'Wear gloves and eye protection. Wash immediately with water if it touches skin. Never mix with other chemicals.',
    whatToDoId: 'Gunakan sarung tangan dan pelindung mata. Segera bilas dengan air jika terkena kulit. Jangan pernah dicampur dengan bahan kimia lain.',
    examplesEn: 'Bleach concentrate, drain cleaner, toilet bowl descaler',
    examplesId: 'Pemutih pekat, pembersih saluran air, pembersih kerak toilet',
  },
  {
    id: 'IRRITANT',
    common: true,
    nameEn: 'Irritant / Harmful',
    nameId: 'Iritan / Berbahaya',
    meaningEn: 'Can irritate skin, eyes, or lungs, or cause an allergic skin reaction.',
    meaningId: 'Dapat mengiritasi kulit, mata, atau paru-paru, atau menyebabkan reaksi alergi pada kulit.',
    whatToDoEn: 'Avoid direct skin contact and breathing in fumes. Use in a ventilated area. Wear gloves if using for an extended time.',
    whatToDoId: 'Hindari kontak langsung dengan kulit dan menghirup uapnya. Gunakan di area dengan ventilasi baik. Pakai sarung tangan jika digunakan dalam waktu lama.',
    examplesEn: 'Most general-purpose cleaners, glass cleaner, floor cleaner',
    examplesId: 'Sebagian besar pembersih serbaguna, pembersih kaca, pembersih lantai',
  },
  {
    id: 'FLAMMABLE',
    common: true,
    nameEn: 'Flammable',
    nameId: 'Mudah Terbakar',
    meaningEn: 'Can catch fire easily — from a flame, spark, or even a hot surface.',
    meaningId: 'Mudah terbakar — oleh api, percikan, atau bahkan permukaan panas.',
    whatToDoEn: 'Keep away from flames, sparks, and heat. Store away from the kitchen and any open fire. Never spray near a lit stove.',
    whatToDoId: 'Jauhkan dari api, percikan, dan panas. Simpan jauh dari dapur dan api terbuka. Jangan semprotkan dekat kompor yang menyala.',
    examplesEn: 'Alcohol-based hand sanitizer, some solvents and polishes',
    examplesId: 'Hand sanitizer berbasis alkohol, beberapa pelarut dan pengkilap',
  },
  {
    id: 'OXIDIZING',
    common: true,
    nameEn: 'Oxidizing',
    nameId: 'Pengoksidasi',
    meaningEn: 'Can cause or intensify a fire by releasing oxygen — makes other things burn more easily.',
    meaningId: 'Dapat menyebabkan atau memperbesar kebakaran dengan melepaskan oksigen — membuat benda lain lebih mudah terbakar.',
    whatToDoEn: 'Keep away from flammable materials and from flames. Never mix with other cleaning chemicals.',
    whatToDoId: 'Jauhkan dari bahan yang mudah terbakar dan dari api. Jangan pernah dicampur dengan bahan kimia pembersih lain.',
    examplesEn: 'Bleach, some laundry and pool chemicals',
    examplesId: 'Pemutih, beberapa bahan kimia laundry dan kolam renang',
  },
  {
    id: 'TOXIC',
    common: false,
    nameEn: 'Toxic',
    nameId: 'Beracun',
    meaningEn: 'Can cause serious harm or be fatal if swallowed, breathed in, or absorbed through skin.',
    meaningId: 'Dapat menyebabkan bahaya serius atau kematian jika tertelan, terhirup, atau terserap melalui kulit.',
    whatToDoEn: 'Never taste-test or smell it directly. Keep away from food and drink. Wash hands thoroughly after use.',
    whatToDoId: 'Jangan pernah mencicipi atau menciumnya secara langsung. Jauhkan dari makanan dan minuman. Cuci tangan hingga bersih setelah digunakan.',
    examplesEn: 'Some industrial-strength cleaning concentrates, pest control chemicals',
    examplesId: 'Beberapa konsentrat pembersih untuk industri, bahan kimia pengendali hama',
  },
  {
    id: 'HEALTH_HAZARD',
    common: false,
    nameEn: 'Health Hazard',
    nameId: 'Bahaya Kesehatan',
    meaningEn: 'Can cause long-term health problems with repeated exposure, like breathing difficulties.',
    meaningId: 'Dapat menyebabkan masalah kesehatan jangka panjang jika terpapar berulang kali, seperti gangguan pernapasan.',
    whatToDoEn: 'Use only in a well-ventilated area. Wear a mask if instructed on the label. Do not use in an enclosed space for a long time.',
    whatToDoId: 'Gunakan hanya di area dengan ventilasi baik. Pakai masker jika tertulis di label. Jangan digunakan di ruangan tertutup dalam waktu lama.',
    examplesEn: 'Some heavy-duty degreasers and industrial solvents',
    examplesId: 'Beberapa pembersih lemak berat dan pelarut industri',
  },
  {
    id: 'COMPRESSED_GAS',
    common: false,
    nameEn: 'Compressed Gas',
    nameId: 'Gas Bertekanan',
    meaningEn: 'Container is under pressure — can explode or shoot out forcefully if damaged or heated.',
    meaningId: 'Wadah dalam keadaan bertekanan — dapat meledak atau menyembur kuat jika rusak atau terkena panas.',
    whatToDoEn: 'Do not puncture, drop, or expose to heat or direct sunlight. Store upright in a cool place.',
    whatToDoId: 'Jangan ditusuk, dijatuhkan, atau terkena panas maupun sinar matahari langsung. Simpan tegak di tempat yang sejuk.',
    examplesEn: 'Aerosol sprays (air fresheners, some cleaners)',
    examplesId: 'Semprotan aerosol (pengharum ruangan, beberapa pembersih)',
  },
  {
    id: 'EXPLOSIVE',
    common: false,
    nameEn: 'Explosive',
    nameId: 'Mudah Meledak',
    meaningEn: 'Can explode from heat, friction, shock, or a nearby flame.',
    meaningId: 'Dapat meledak akibat panas, gesekan, benturan, atau api di dekatnya.',
    whatToDoEn: "This shouldn't appear on normal cleaning supplies — if you see this symbol, stop and tell your supervisor immediately.",
    whatToDoId: 'Simbol ini seharusnya tidak muncul pada perlengkapan pembersih biasa — jika Anda melihatnya, segera hentikan dan beri tahu supervisor Anda.',
    examplesEn: 'Not expected on any standard cleaning or food-safety chemical',
    examplesId: 'Tidak seharusnya ada pada bahan kimia pembersih atau keamanan pangan standar',
  },
  {
    id: 'ENVIRONMENT',
    common: false,
    nameEn: 'Environmental Hazard',
    nameId: 'Bahaya Lingkungan',
    meaningEn: 'Toxic to aquatic life and the environment if disposed of improperly.',
    meaningId: 'Beracun bagi kehidupan air dan lingkungan jika dibuang secara sembarangan.',
    whatToDoEn: 'Never pour down a storm drain or onto open ground. Dispose of according to site procedure.',
    whatToDoId: 'Jangan pernah dibuang ke saluran air hujan atau tanah terbuka. Buang sesuai prosedur di lokasi.',
    examplesEn: 'Some pool chemicals and pesticides',
    examplesId: 'Beberapa bahan kimia kolam renang dan pestisida',
  },
];

// The single highest-value safety fact for cleaning staff — worth its own
// callout rather than being just another list entry.
export const NEVER_MIX_WARNING = {
  titleEn: 'Never mix bleach with other cleaners',
  titleId: 'Jangan pernah mencampur pemutih dengan pembersih lain',
  bodyEn: 'Mixing bleach with ammonia or other cleaning chemicals produces toxic gas. Always use one chemical at a time, and rinse the surface between products.',
  bodyId: 'Mencampur pemutih dengan amonia atau bahan kimia pembersih lain menghasilkan gas beracun. Selalu gunakan satu bahan kimia dalam satu waktu, dan bilas permukaan di antara penggunaan produk.',
};
