// Reference content for the standalone legal pages (PrivacyPolicyPage.tsx,
// TermsOfServicePage.tsx, CookiePolicyPage.tsx — all in
// src/components/Legal/) — reachable directly at /privacy, /terms and
// /cookies (see App.tsx), outside the login/portal flow entirely, so
// anyone can read them without an account. Static bilingual reference
// content, same reasoning as hazmatData.ts: no Firestore, no per-user
// state, just content bundled with the app. Long-form prose lives here
// rather than in translations.ts, which stays for short UI chrome.
//
// This describes what PSU FieldOps actually does, not a generic
// boilerplate policy — keep it in sync with reality when the data model
// changes (e.g. if a new collection starts storing personal data, or a
// new third-party service is added).

export interface LegalSection {
  headingEn: string;
  headingId: string;
  bodyEn: string; // one or more paragraphs, separated by \n\n
  bodyId: string;
}

export const LEGAL_LAST_UPDATED = '11 September 2026';

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    headingEn: 'What this app is',
    headingId: 'Tentang aplikasi ini',
    bodyEn: 'PSU FieldOps is an internal operations tool for Pangansari Utama staff — housekeeping, food safety, and management teams use it to fill in daily checklists, file field reports, and review each other\'s work. It is not a public product and is not intended for use by anyone outside the organization.',
    bodyId: 'PSU FieldOps adalah alat operasional internal untuk staf Pangansari Utama — tim housekeeping, keamanan pangan, dan manajemen menggunakannya untuk mengisi checklist harian, mengajukan laporan lapangan, dan meninjau pekerjaan satu sama lain. Ini bukan produk publik dan tidak ditujukan untuk digunakan oleh siapa pun di luar organisasi.',
  },
  {
    headingEn: 'Information we collect',
    headingId: 'Informasi yang kami kumpulkan',
    bodyEn: 'Account information: your name, work email, role, assigned site(s), and department, set up by your Admin or entered when you sign up.\n\nWork records: the checklists, inspections, field reports, warnings, and training completions you submit or that a supervisor records about your work — including any photo you attach to a submission or field report as proof of completion or of an issue found.\n\nA Staff ID (a short login code) if your Admin has issued you one, as an alternative to an email and password.\n\nWe do not collect payment information, government ID numbers, or any information unrelated to your role at Pangansari Utama.',
    bodyId: 'Informasi akun: nama, email kerja, peran, lokasi (site) yang ditugaskan, dan departemen, yang disiapkan oleh Admin Anda atau dimasukkan saat mendaftar.\n\nCatatan pekerjaan: checklist, inspeksi, laporan lapangan, peringatan, dan penyelesaian pelatihan yang Anda ajukan atau yang dicatat supervisor tentang pekerjaan Anda — termasuk foto yang Anda lampirkan pada suatu pengajuan atau laporan lapangan sebagai bukti penyelesaian atau temuan masalah.\n\nStaff ID (kode login singkat) jika Admin Anda telah menerbitkannya, sebagai alternatif dari email dan kata sandi.\n\nKami tidak mengumpulkan informasi pembayaran, nomor identitas pemerintah, atau informasi apa pun yang tidak terkait dengan peran Anda di Pangansari Utama.',
  },
  {
    headingEn: 'How we use it',
    headingId: 'Bagaimana kami menggunakannya',
    bodyEn: 'Your information is used only to run the operations this app exists for: routing your checklist submissions to the right supervisor for review, tracking whether food-safety and housekeeping standards are being met, showing you and your managers a history of past work, and letting an Admin manage accounts and site assignments.\n\nWe do not use your information for advertising, and we do not sell or rent it to any third party.',
    bodyId: 'Informasi Anda hanya digunakan untuk menjalankan operasional yang menjadi tujuan aplikasi ini: mengarahkan pengajuan checklist Anda ke supervisor yang tepat untuk ditinjau, memantau apakah standar keamanan pangan dan housekeeping terpenuhi, menampilkan riwayat pekerjaan kepada Anda dan manajer Anda, serta memungkinkan Admin mengelola akun dan penugasan lokasi.\n\nKami tidak menggunakan informasi Anda untuk iklan, dan tidak menjual atau menyewakannya kepada pihak ketiga mana pun.',
  },
  {
    headingEn: 'Where it\'s stored',
    headingId: 'Di mana data disimpan',
    bodyEn: 'When the app is connected to Firebase (Google Cloud), your account, submissions, and reports are stored in Google\'s Firestore database and Cloud Storage, in the project operated for Pangansari Utama, and access is restricted by role-based rules — for example, a Technician cannot read another site\'s submissions, and only Admin accounts can change roles or delete a user.\n\nSome information (like your language preference, and — in a demo/offline setup with no Firebase connection — your work records) is instead kept only in your own browser\'s local storage, on your own device.',
    bodyId: 'Saat aplikasi terhubung ke Firebase (Google Cloud), akun, pengajuan, dan laporan Anda disimpan di database Firestore dan Cloud Storage milik Google, pada proyek yang dioperasikan untuk Pangansari Utama, dan aksesnya dibatasi berdasarkan aturan berbasis peran — misalnya, seorang Teknisi tidak dapat membaca pengajuan dari lokasi lain, dan hanya akun Admin yang dapat mengubah peran atau menghapus pengguna.\n\nSebagian informasi (seperti preferensi bahasa Anda, dan — pada pengaturan demo/offline tanpa koneksi Firebase — catatan pekerjaan Anda) justru hanya disimpan di penyimpanan lokal (local storage) browser Anda sendiri, di perangkat Anda sendiri.',
  },
  {
    headingEn: 'Who can see your data',
    headingId: 'Siapa yang dapat melihat data Anda',
    bodyEn: 'Your work records are visible to the supervisors, managers, and general manager whose review scope covers your site and department, and to Admin accounts. Other frontline staff cannot see your individual submissions or warnings.',
    bodyId: 'Catatan pekerjaan Anda dapat dilihat oleh supervisor, manajer, dan general manager yang cakupan tinjauannya mencakup lokasi dan departemen Anda, serta oleh akun Admin. Staf lini depan lainnya tidak dapat melihat pengajuan atau peringatan individual Anda.',
  },
  {
    headingEn: 'How long we keep it',
    headingId: 'Berapa lama kami menyimpannya',
    bodyEn: 'Work records are kept for as long as your account is active, to maintain a usable compliance history. When an Admin deactivates or deletes your account, your login access and any Staff ID are removed; historical submissions may be retained for the organization\'s own record-keeping and audit needs.',
    bodyId: 'Catatan pekerjaan disimpan selama akun Anda aktif, untuk menjaga riwayat kepatuhan yang dapat digunakan. Ketika Admin menonaktifkan atau menghapus akun Anda, akses login dan Staff ID Anda akan dihapus; pengajuan historis dapat tetap disimpan untuk kebutuhan pencatatan dan audit organisasi.',
  },
  {
    headingEn: 'Your choices',
    headingId: 'Pilihan Anda',
    bodyEn: 'You can ask your Admin at any time to see, correct, or request deletion of your account information. If you believe a submission was recorded in error, raise it with your supervisor so it can be corrected in the review flow.',
    bodyId: 'Anda dapat meminta Admin Anda kapan saja untuk melihat, mengoreksi, atau meminta penghapusan informasi akun Anda. Jika Anda merasa suatu pengajuan tercatat secara keliru, sampaikan kepada supervisor Anda agar dapat dikoreksi melalui alur peninjauan.',
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    headingEn: 'Acceptance',
    headingId: 'Persetujuan',
    bodyEn: 'PSU FieldOps is provided by Pangansari Utama for use by its own employees and authorized personnel only. By signing in, you agree to use it only for legitimate work purposes connected to your role.',
    bodyId: 'PSU FieldOps disediakan oleh Pangansari Utama untuk digunakan hanya oleh karyawannya sendiri dan personel yang berwenang. Dengan masuk (sign in), Anda setuju untuk menggunakannya hanya untuk tujuan pekerjaan yang sah dan terkait dengan peran Anda.',
  },
  {
    headingEn: 'Accounts and access',
    headingId: 'Akun dan akses',
    bodyEn: 'Accounts are created or authorized by an Admin. You are responsible for keeping your password and, if issued one, your Staff ID confidential — do not share your login with anyone else, including coworkers covering your shift. Report a lost or compromised Staff ID to your Admin immediately so it can be reset.\n\nAn Admin may deactivate or delete any account at their discretion, including on termination of employment.',
    bodyId: 'Akun dibuat atau diotorisasi oleh Admin. Anda bertanggung jawab untuk menjaga kerahasiaan kata sandi dan, jika diterbitkan, Staff ID Anda — jangan membagikan info login Anda kepada siapa pun, termasuk rekan kerja yang menggantikan shift Anda. Segera laporkan kepada Admin jika Staff ID Anda hilang atau disalahgunakan agar dapat diatur ulang.\n\nAdmin dapat menonaktifkan atau menghapus akun mana pun atas kebijakannya sendiri, termasuk saat pemutusan hubungan kerja.',
  },
  {
    headingEn: 'Accuracy of submissions',
    headingId: 'Keakuratan pengajuan',
    bodyEn: 'Checklists, inspections, and field reports exist to keep an honest, verifiable record of food-safety and housekeeping standards. You agree to fill them in truthfully and based on what you actually observed or performed — never to mark an item complete or "good" without doing the underlying check.',
    bodyId: 'Checklist, inspeksi, dan laporan lapangan ada untuk menjaga catatan yang jujur dan dapat diverifikasi mengenai standar keamanan pangan dan housekeeping. Anda setuju untuk mengisinya secara jujur dan berdasarkan apa yang benar-benar Anda amati atau lakukan — jangan pernah menandai suatu item selesai atau "baik" tanpa benar-benar melakukan pemeriksaannya.',
  },
  {
    headingEn: 'Acceptable use',
    headingId: 'Penggunaan yang dapat diterima',
    bodyEn: 'Do not attempt to access another user\'s account, another site\'s data you have not been assigned to, or any Admin function without authorization. Do not use the app to upload content unrelated to work, or anything unlawful, defamatory, or harassing.',
    bodyId: 'Jangan mencoba mengakses akun pengguna lain, data lokasi lain yang tidak ditugaskan kepada Anda, atau fungsi Admin apa pun tanpa otorisasi. Jangan gunakan aplikasi ini untuk mengunggah konten yang tidak berhubungan dengan pekerjaan, atau apa pun yang melanggar hukum, mencemarkan nama baik, atau bersifat pelecehan.',
  },
  {
    headingEn: 'Availability',
    headingId: 'Ketersediaan layanan',
    bodyEn: 'This app is provided on an as-available basis. It works offline for a period of time as a Progressive Web App, but relies on an internet connection to sync submissions across devices and to keep supervisor review up to date. We do not guarantee uninterrupted availability and are not liable for lost work caused by a device, browser, or connectivity issue — always confirm a submission shows up in your History tab.',
    bodyId: 'Aplikasi ini disediakan atas dasar "sebagaimana tersedia". Aplikasi ini bekerja secara offline untuk sementara waktu sebagai Progressive Web App, tetapi bergantung pada koneksi internet untuk menyinkronkan pengajuan antar perangkat dan menjaga peninjauan supervisor tetap terkini. Kami tidak menjamin ketersediaan tanpa gangguan dan tidak bertanggung jawab atas pekerjaan yang hilang akibat masalah perangkat, browser, atau konektivitas — selalu pastikan pengajuan Anda muncul di tab Riwayat.',
  },
  {
    headingEn: 'Changes to these terms',
    headingId: 'Perubahan syarat ini',
    bodyEn: 'These terms may be updated as the app changes. Continuing to use the app after an update means you accept the current version, shown here with its last-updated date.',
    bodyId: 'Syarat ini dapat diperbarui seiring perubahan aplikasi. Melanjutkan penggunaan aplikasi setelah pembaruan berarti Anda menerima versi terkini, yang ditampilkan di sini beserta tanggal pembaruan terakhirnya.',
  },
];

export const COOKIES_SECTIONS: LegalSection[] = [
  {
    headingEn: 'We don\'t use tracking or advertising cookies',
    headingId: 'Kami tidak menggunakan cookie pelacakan atau iklan',
    bodyEn: 'PSU FieldOps does not run any advertising, analytics-for-marketing, or cross-site tracking scripts, and does not set third-party cookies. There is nothing here to sell your attention to.',
    bodyId: 'PSU FieldOps tidak menjalankan skrip iklan, analitik untuk pemasaran, atau pelacakan lintas situs, dan tidak memasang cookie pihak ketiga. Tidak ada yang "dijual" dari perhatian Anda di sini.',
  },
  {
    headingEn: 'What we do store in your browser',
    headingId: 'Apa yang kami simpan di browser Anda',
    bodyEn: 'To make the app work, we use your browser\'s own local storage and session storage — not cookies in the classic sense — for a few strictly functional purposes:\n\n• Keeping you signed in between visits, so you\'re not asked to log in every time.\n• Remembering your language choice (English/Bahasa Indonesia).\n• Holding a scanned job (from a QR sticker) briefly while you prove who you are.\n• In a demo/offline setup with no Firebase connection, storing your work records locally so the app still functions without a server.\n\nNone of this is shared with any other website, and none of it is used to build an advertising profile.',
    bodyId: 'Agar aplikasi dapat berfungsi, kami menggunakan local storage dan session storage milik browser Anda sendiri — bukan cookie dalam pengertian klasik — untuk beberapa tujuan fungsional saja:\n\n• Menjaga Anda tetap masuk (login) antar kunjungan, agar tidak perlu login setiap saat.\n• Mengingat pilihan bahasa Anda (Inggris/Bahasa Indonesia).\n• Menyimpan sementara pekerjaan hasil pindai (dari stiker QR) sambil Anda membuktikan identitas.\n• Pada pengaturan demo/offline tanpa koneksi Firebase, menyimpan catatan pekerjaan Anda secara lokal agar aplikasi tetap berfungsi tanpa server.\n\nTidak ada satu pun dari ini yang dibagikan ke situs web lain, dan tidak ada yang digunakan untuk membangun profil iklan.',
  },
  {
    headingEn: 'Service worker & offline support',
    headingId: 'Service worker & dukungan offline',
    bodyEn: 'As a Progressive Web App, PSU FieldOps installs a small background script (a "service worker") in your browser so pages you\'ve already visited can load without a network connection, and so you can install it on your device\'s home screen. This only caches app files, not your personal data.',
    bodyId: 'Sebagai Progressive Web App, PSU FieldOps memasang skrip latar belakang kecil ("service worker") di browser Anda sehingga halaman yang sudah pernah Anda kunjungi dapat dimuat tanpa koneksi jaringan, dan agar Anda dapat memasangnya di layar utama perangkat Anda. Ini hanya menyimpan cache berkas aplikasi, bukan data pribadi Anda.',
  },
  {
    headingEn: 'Managing or clearing this data',
    headingId: 'Mengelola atau menghapus data ini',
    bodyEn: 'You can clear local storage, session storage, and the service worker cache at any time from your browser\'s site settings — this will sign you out and, in a demo/offline setup, remove any locally-stored work records that haven\'t synced elsewhere. If the app relies on this data to function (like staying signed in), clearing it just means signing in again.',
    bodyId: 'Anda dapat menghapus local storage, session storage, dan cache service worker kapan saja melalui pengaturan situs pada browser Anda — ini akan mengeluarkan Anda dari sesi (sign out) dan, pada pengaturan demo/offline, menghapus catatan pekerjaan yang tersimpan secara lokal dan belum tersinkronisasi. Jika aplikasi bergantung pada data ini untuk berfungsi (seperti tetap dalam status masuk), menghapusnya hanya berarti Anda perlu masuk kembali.',
  },
];
