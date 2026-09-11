// Reference content for the Safety Reference section's second set of
// signs — the yellow-triangle general workplace hazard warnings (the
// ISO 7010 "W" series and similar) shown on-site at camp/facilities
// areas: overhead loads, vehicles, electricity, falls, drowning, etc.
// Distinct from hazmatData.ts's GHS chemical pictograms (red diamond,
// what's IN a container) — these are yellow triangles for a hazard in
// the PLACE or ACTIVITY around you, not a substance. Same reasoning as
// hazmatData.ts: static bilingual reference content, no Firestore, no
// per-user state.

export type HazardWarningId =
  | 'ELECTRIC_SHOCK' | 'FLAMMABLE' | 'VEHICLE' | 'FORKLIFT'
  | 'MECHANICAL' | 'OVERHEAD_CRANE' | 'SUSPENDED_LOAD' | 'SUSPENDED_LOAD_HOOK'
  | 'FALLING_OBJECT' | 'SLIPPERY_GROUND' | 'FALL_FROM_HEIGHT' | 'FALL_BACKWARD'
  | 'DROWNING' | 'MARSHY_GROUND' | 'DROWNING_BOAT' | 'CONFINED_SPACE'
  | 'LANDSLIDE' | 'EXPLOSION' | 'TOXIC';

export interface HazardWarningSign {
  id: HazardWarningId;
  common: boolean;
  nameEn: string;
  nameId: string;
  meaningEn: string;
  meaningId: string;
  whatToDoEn: string;
  whatToDoId: string;
}

export const HAZARD_WARNING_SIGNS: HazardWarningSign[] = [
  {
    id: 'ELECTRIC_SHOCK',
    common: true,
    nameEn: 'Electric Shock Hazard',
    nameId: 'Bahaya Sengatan Listrik',
    meaningEn: 'Live electrical equipment or wiring nearby — touching it can cause a serious or fatal shock.',
    meaningId: 'Peralatan atau kabel listrik bertegangan di dekatnya — menyentuhnya dapat menyebabkan sengatan serius atau fatal.',
    whatToDoEn: 'Never open a panel or touch exposed wiring yourself. Report damaged cords or sparking outlets to maintenance immediately.',
    whatToDoId: 'Jangan pernah membuka panel atau menyentuh kabel terbuka sendiri. Segera laporkan kabel rusak atau stopkontak yang memercik ke bagian maintenance.',
  },
  {
    id: 'FLAMMABLE',
    common: true,
    nameEn: 'Fire Hazard',
    nameId: 'Bahaya Kebakaran',
    meaningEn: 'Materials or conditions here can easily catch fire.',
    meaningId: 'Bahan atau kondisi di area ini mudah terbakar.',
    whatToDoEn: 'No open flames, sparks, or smoking in this area. Know where the nearest fire extinguisher is.',
    whatToDoId: 'Dilarang menyalakan api terbuka, memicu percikan, atau merokok di area ini. Ketahui lokasi APAR terdekat.',
  },
  {
    id: 'VEHICLE',
    common: true,
    nameEn: 'Vehicle Hazard',
    nameId: 'Bahaya Kendaraan',
    meaningEn: 'Moving vehicles (trucks, tractors, site transport) operate in this area — a driver may not see you.',
    meaningId: 'Kendaraan bergerak (truk, traktor, transportasi lokasi) beroperasi di area ini — pengemudi mungkin tidak melihat Anda.',
    whatToDoEn: 'Stay in marked pedestrian paths. Make eye contact with the driver before crossing a vehicle route.',
    whatToDoId: 'Tetap berada di jalur pejalan kaki yang ditandai. Pastikan kontak mata dengan pengemudi sebelum menyeberangi jalur kendaraan.',
  },
  {
    id: 'FORKLIFT',
    common: true,
    nameEn: 'Forklift / Machinery Hazard',
    nameId: 'Bahaya Forklift / Alat Berat',
    meaningEn: 'Forklifts or other moving machinery operate here, often with limited visibility for the operator.',
    meaningId: 'Forklift atau alat bergerak lain beroperasi di sini, sering kali dengan jarak pandang terbatas bagi operator.',
    whatToDoEn: 'Never walk under a raised load. Wait for the operator to signal it\'s safe before approaching.',
    whatToDoId: 'Jangan pernah berjalan di bawah beban yang terangkat. Tunggu isyarat aman dari operator sebelum mendekat.',
  },
  {
    id: 'MECHANICAL',
    common: true,
    nameEn: 'Moving Parts / Entanglement Hazard',
    nameId: 'Bahaya Bagian Bergerak / Terjerat',
    meaningEn: 'Gears, belts, or rotating parts can catch loose clothing, hair, or a hand.',
    meaningId: 'Roda gigi, sabuk, atau bagian berputar dapat menjerat pakaian longgar, rambut, atau tangan.',
    whatToDoEn: 'Tie back long hair, remove loose clothing/jewelry, and never reach into equipment while it\'s running.',
    whatToDoId: 'Ikat rambut panjang, lepaskan pakaian/perhiasan longgar, dan jangan pernah memasukkan tangan ke peralatan saat sedang berjalan.',
  },
  {
    id: 'OVERHEAD_CRANE',
    common: false,
    nameEn: 'Overhead Crane / Trolley Hazard',
    nameId: 'Bahaya Crane / Troli Atas',
    meaningEn: 'A crane or trolley moves along an overhead track above this area.',
    meaningId: 'Crane atau troli bergerak di jalur atas di area ini.',
    whatToDoEn: 'Don\'t walk directly underneath. Watch and listen for the crane\'s movement warning.',
    whatToDoId: 'Jangan berjalan tepat di bawahnya. Perhatikan dan dengarkan peringatan pergerakan crane.',
  },
  {
    id: 'SUSPENDED_LOAD',
    common: false,
    nameEn: 'Suspended Load Hazard',
    nameId: 'Bahaya Beban Tergantung',
    meaningEn: 'A load is being lifted or held overhead — it can fall or swing without warning.',
    meaningId: 'Sebuah beban sedang diangkat atau ditahan di atas — dapat jatuh atau berayun tanpa peringatan.',
    whatToDoEn: 'Stay clear of the area directly beneath and around a suspended load at all times.',
    whatToDoId: 'Selalu jauhi area tepat di bawah dan sekitar beban yang tergantung.',
  },
  {
    id: 'SUSPENDED_LOAD_HOOK',
    common: false,
    nameEn: 'Crane Lifting Hazard',
    nameId: 'Bahaya Pengangkatan Crane',
    meaningEn: 'A crane hook and load are actively lifting nearby.',
    meaningId: 'Kait dan beban crane sedang aktif mengangkat di dekat area ini.',
    whatToDoEn: 'Keep well back from the lifting zone until the operator confirms it\'s clear.',
    whatToDoId: 'Tetap berada jauh dari zona pengangkatan hingga operator memastikan area aman.',
  },
  {
    id: 'FALLING_OBJECT',
    common: true,
    nameEn: 'Falling Object Hazard',
    nameId: 'Bahaya Benda Jatuh',
    meaningEn: 'Something stored, stacked, or worked on above could fall.',
    meaningId: 'Sesuatu yang disimpan, ditumpuk, atau sedang dikerjakan di atas dapat jatuh.',
    whatToDoEn: 'Wear a hard hat where required and never stand directly beneath stacked or overhead work.',
    whatToDoId: 'Gunakan helm pengaman jika diwajibkan dan jangan pernah berdiri tepat di bawah tumpukan atau pekerjaan di atas.',
  },
  {
    id: 'SLIPPERY_GROUND',
    common: true,
    nameEn: 'Slippery / Uneven Ground Hazard',
    nameId: 'Bahaya Permukaan Licin / Tidak Rata',
    meaningEn: 'The floor or ground here is wet, uneven, or otherwise easy to lose your footing on.',
    meaningId: 'Lantai atau permukaan tanah di sini basah, tidak rata, atau mudah membuat Anda kehilangan pijakan.',
    whatToDoEn: 'Walk, don\'t run. Wear appropriate footwear and use handrails where available.',
    whatToDoId: 'Berjalan, jangan berlari. Gunakan alas kaki yang sesuai dan pegangan tangan bila tersedia.',
  },
  {
    id: 'FALL_FROM_HEIGHT',
    common: true,
    nameEn: 'Fall From Height Hazard',
    nameId: 'Bahaya Jatuh dari Ketinggian',
    meaningEn: 'An unguarded edge, opening, or platform here could cause a fall to a lower level.',
    meaningId: 'Tepi, lubang, atau platform tanpa pengaman di sini dapat menyebabkan jatuh ke level yang lebih rendah.',
    whatToDoEn: 'Use fall protection where provided, stay behind barriers, and never lean over an unguarded edge.',
    whatToDoId: 'Gunakan alat pelindung jatuh jika tersedia, tetap di belakang pembatas, dan jangan bersandar di tepi tanpa pengaman.',
  },
  {
    id: 'FALL_BACKWARD',
    common: false,
    nameEn: 'Tripping / Fall Hazard',
    nameId: 'Bahaya Tersandung / Terjatuh',
    meaningEn: 'Uneven footing, a step, or an obstruction here can cause a trip or fall.',
    meaningId: 'Pijakan tidak rata, anak tangga, atau penghalang di sini dapat menyebabkan tersandung atau jatuh.',
    whatToDoEn: 'Watch your step, keep walkways clear, and use handrails on stairs.',
    whatToDoId: 'Perhatikan langkah Anda, jaga jalur bebas dari halangan, dan gunakan pegangan tangan di tangga.',
  },
  {
    id: 'DROWNING',
    common: false,
    nameEn: 'Danger of Drowning',
    nameId: 'Bahaya Tenggelam',
    meaningEn: 'Deep or fast-moving water nearby — falling in can be life-threatening.',
    meaningId: 'Air dalam atau berarus deras di dekatnya — terjatuh ke dalamnya dapat membahayakan nyawa.',
    whatToDoEn: 'Stay behind barriers near water. Know the location of the nearest life ring or rescue equipment.',
    whatToDoId: 'Tetap di belakang pembatas dekat air. Ketahui lokasi pelampung atau alat penyelamat terdekat.',
  },
  {
    id: 'MARSHY_GROUND',
    common: false,
    nameEn: 'Marshy / Unstable Ground Hazard',
    nameId: 'Bahaya Tanah Rawa / Tidak Stabil',
    meaningEn: 'Soft, marshy, or unstable ground here can give way underfoot.',
    meaningId: 'Tanah lunak, berawa, atau tidak stabil di sini dapat ambles saat diinjak.',
    whatToDoEn: 'Stay on marked paths and never walk into unstable ground alone.',
    whatToDoId: 'Tetap di jalur yang ditandai dan jangan pernah memasuki tanah tidak stabil sendirian.',
  },
  {
    id: 'DROWNING_BOAT',
    common: false,
    nameEn: 'Small Boat / Water Hazard',
    nameId: 'Bahaya Perahu Kecil / Air',
    meaningEn: 'Boat operations or unstable water transport nearby carry a drowning risk.',
    meaningId: 'Operasi perahu atau transportasi air yang tidak stabil di dekatnya membawa risiko tenggelam.',
    whatToDoEn: 'Always wear a life jacket on or near watercraft, even for a short crossing.',
    whatToDoId: 'Selalu kenakan jaket pelampung saat berada di atas atau dekat perahu, meski hanya untuk penyeberangan singkat.',
  },
  {
    id: 'CONFINED_SPACE',
    common: false,
    nameEn: 'Confined Space Hazard',
    nameId: 'Bahaya Ruang Terbatas',
    meaningEn: 'A tank, shaft, or enclosed space here may have poor air quality or an entrapment risk.',
    meaningId: 'Tangki, sumur, atau ruang tertutup di sini mungkin memiliki kualitas udara buruk atau risiko terjebak.',
    whatToDoEn: 'Never enter a confined space without authorization, a permit, and someone watching from outside.',
    whatToDoId: 'Jangan pernah memasuki ruang terbatas tanpa izin, surat izin kerja, dan seseorang yang mengawasi dari luar.',
  },
  {
    id: 'LANDSLIDE',
    common: false,
    nameEn: 'Landslide / Falling Rock Hazard',
    nameId: 'Bahaya Longsor / Batu Jatuh',
    meaningEn: 'Loose slopes or embankments nearby can shift or drop debris without warning.',
    meaningId: 'Lereng atau tanggul yang longgar di dekatnya dapat bergeser atau menjatuhkan material tanpa peringatan.',
    whatToDoEn: 'Keep clear of slopes after heavy rain and report any cracking or shifting ground.',
    whatToDoId: 'Jauhi lereng setelah hujan deras dan laporkan tanah yang retak atau bergeser.',
  },
  {
    id: 'EXPLOSION',
    common: false,
    nameEn: 'Explosion Hazard',
    nameId: 'Bahaya Ledakan',
    meaningEn: 'Pressurized equipment or explosive material nearby can cause a sudden, violent release.',
    meaningId: 'Peralatan bertekanan atau bahan mudah meledak di dekatnya dapat menyebabkan pelepasan yang tiba-tiba dan keras.',
    whatToDoEn: "This shouldn't appear in normal work areas — if you see this sign, stay back and tell your supervisor immediately.",
    whatToDoId: 'Simbol ini seharusnya tidak muncul di area kerja biasa — jika Anda melihatnya, jauhi area tersebut dan segera beri tahu supervisor Anda.',
  },
  {
    id: 'TOXIC',
    common: true,
    nameEn: 'Toxic / Poison Hazard',
    nameId: 'Bahaya Racun',
    meaningEn: 'A substance here can cause serious harm or death if swallowed, breathed in, or absorbed through skin.',
    meaningId: 'Bahan di sini dapat menyebabkan bahaya serius atau kematian jika tertelan, terhirup, atau terserap melalui kulit.',
    whatToDoEn: 'Never taste, smell, or handle without proper protection. Wash hands thoroughly afterward.',
    whatToDoId: 'Jangan pernah mencicipi, mencium, atau memegangnya tanpa pelindung yang sesuai. Cuci tangan hingga bersih setelahnya.',
  },
];
