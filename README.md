# PU Insight

Dashboard penglibatan digital sekolah untuk USTP, PPD Petaling Utama.

**Laman:** https://ustppu.github.io/digitalschool/

## Pembangunan

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

React, Vite dan Recharts. Data JSON statik, tanpa login atau backend. Navigasi hash dan `base: './'` menyokong laluan GitHub Pages `/digitalschool/`. Pembangunan diteruskan dalam projek yang sama.

## Penerbitan

GitHub Pages mesti menggunakan **GitHub Actions** dalam Settings → Pages. Push ke `main` menjalankan `.github/workflows/pages.yml`: `npm ci`, semua ujian, binaan `dist`, kemudian deployment Pages. Penerbitan baharu menggantikan binaan laman; snapshot sejarah kekal berasingan.

Favicon Jata Negara disediakan sebagai SVG dan PNG; Apple Touch Icon 180px. Open Graph/Twitter metadata hadir dalam HTML awal, dengan URL imej PNG mutlak 1200×630. Sumber reka bentuk OG: `design/og-image.svg`. Imej boleh dicache oleh aplikasi perkongsian.

## Data dan ketepatan

85 sekolah dipadankan tepat kepada PPD PETALING UTAMA melalui kod, merentas Murid, Guru dan AI Tools (Guru). Snapshot asal tidak diubah. Kadar dikira daripada aktif / jumlah sumber. Kadar daerah berwajaran, bukan purata peratus sekolah.

- Murid: 14,769 / 73,494 = 20.10%.
- Guru: 2,287 / 4,946 = 46.24%.
- AI Tools Guru: 2,287 / 4,946 = 46.24%.

Guru dan AI mempunyai kiraan sama dalam sumber bagi setiap sekolah. Tanpa ID individu, ini tidak membuktikan orang yang sama; kedua-duanya tidak dijumlahkan sebagai pengguna unik. TOTAL PENGGUNA ialah denominator sumber, bukan pengesahan enrolmen rasmi. Definisi aktif tidak diperincikan.

Kategori: SK 42, SJKC 10, SJKT 5, SMK 26, KT6 2. 84 padanan daripada direktori berkod; SJKT PJS 1 (BBD8471) disahkan oleh pemilik sistem pada 29 Oktober 2026. Pengesahan dicatat dalam metadata dan `scripts/category-overrides.json`, dikekalkan apabila pipeline metadata dijalankan semula. Kategori tidak diteka daripada nama.

Satu snapshot tersedia (1–20 Oktober 2026). Tiada trend direka; tempoh bertindih tidak dijumlahkan sebagai individu unik.

Aplikasi ialah 20 bilangan agregat seluruh Selangor, dengan skop disahkan pemilik laporan. Tiada pecahan sekolah, daerah, murid/guru atau denominator peratus. Bilangan aplikasi tidak dijumlahkan sebagai pengguna unik negeri.

## Struktur

- `src/main.jsx`: shell, tempoh, navigasi, profil dan eksport.
- `src/insight.css`: stylesheet aktif.
- `src/components/`: Overview, Explorer, School DNA, matriks, peta, perbandingan, AI, cerapan dan aplikasi negeri.
- `src/data/`: adapter kategori, susunan/ranking, agregat berwajaran dan pembahagian peta.
- `public/data/`: snapshot, manifest, metadata, audit dan konteks laporan.
- `scripts/`: ujian ketepatan serta extractor. Extractor Python memerlukan openpyxl dan sumber XLSX asal yang disemak; fail XLSX tidak diterbitkan.
- `public/brand/README.md`: asal aset Jata Negara.

Explorer memindahkan header dan nilai ukuran dipilih ke lajur pertama selepas sekolah. Carian mengekalkan ranking kategori. Data kosong tidak dianggap sifar. Profil membuka panel desktop / helaian telefon. Peta menunjukkan kadar, bukan lokasi geografi; ambang boleh diubah dan bukan sasaran rasmi.

## Pengesahan

25 ujian meliputi jumlah kawalan XLSX, padanan 85 kod, statistik sumber tidak berubah, kategori/pengesahan pemilik, carian, susunan, seri, nilai kosong, beza mata peratus, sejarah bertindih, agregat kategori, pasangan peta, julat AI dan pemisahan aplikasi Selangor.

Semakan pelayar desktop/telefon meliputi carian, kategori, lajur bergerak, profil, AI, perbandingan, peta dan lebar 390px. Binaan produksi mesti lulus sebelum deploy.


## Kedudukan profil & cetakan

Profil Murid dan Guru menunjukkan kedudukan daripada semua sekolah daerah dalam snapshot dipilih, bebas daripada penapis Explorer. Kadar penuh menentukan ranking; seri berkongsi kedudukan dengan nombor seterusnya dilangkau, dan kadar tidak sah dikecualikan. `districtRank` diuji untuk semua 85 sekolah serta rekod seri/kosong.

Butang **Cetak / Simpan PDF** membuka cetakan pelayar. Pilih **Save as PDF / Simpan sebagai PDF** untuk fail digital. Templat A4 khusus memaparkan nama/kod sekolah, tempoh, kadar, ranking, kiraan dan kadar daerah, bersama Jata Negara, header PU Insight dan footer USTP PPD Petaling Utama. Laporan sentiasa menggunakan snapshot semasa, termasuk apabila tab sejarah dibuka; navigasi/panel lain tidak dicetak. Untuk cetakan tanpa URL/tarikh tambahan pelayar, nyahpilih Headers and footers dalam tetapan cetakan.


## Ketahanan selepas deployment

Peta penglibatan dan Banding sekolah diimport bersama aplikasi, supaya tab yang masih terbuka tidak meminta chunk carta lama selepas deployment. Error boundary pada akar menyediakan mesej pemulihan dan tindakan muat semula jika render gagal. Binaan baharu tidak bergantung kepada dynamic import untuk navigasi.

### Import laporan dari Mac

Jalankan `python3 scripts/import_admin.py` dalam checkout ini dan buka `http://127.0.0.1:4174/`. Untuk XLSX, gunakan Python yang mempunyai openpyxl. Pemprosesan fail berlaku pada Mac. Pratonton menerima tarikh tunggal atau tempoh dan menapis PPD Petaling Utama sebelum memproses rekod.

- Set 1 menerima workbook KPM dengan helaian Murid, Guru dan AI Tools (Guru). CSV ringkasan menggunakan `PPD,KODSEKOLAH,NAMASEKOLAH,UKURAN,PENGGUNA AKTIF,TOTAL PENGGUNA`, satu baris bagi setiap kod dan ukuran `students`, `teachers` atau `ai`. Simpan pratonton untuk mengemas kini snapshot dan manifest, kemudian commit dan push **dua fail agregat itu sahaja**. Tempoh berulang menggantikan snapshot tempoh itu. Tempoh baharu menambah sejarah.
- Set 2 dan 3 menjana JSON yang mengandungi nama, kod sekolah dan tempoh. E-mel digunakan semasa menyemak pendua dalam proses tempatan. Simpan CSV asal dan JSON nama dalam folder Drive terhad. Jangan masukkan kedua-duanya dalam repo atau folder public.
- Semak angka dan kebenaran pemilik data sebelum menerbitkan senarai nama. Paparan tanpa log masuk memberi pelawat akses kepada nama untuk kod sekolah yang diminta. Pelawat boleh mengulang permintaan untuk sekolah lain.

### Sambungkan folder Drive untuk senarai nama

1. Buat satu folder Drive dengan akses **Restricted** untuk JSON keluaran Set 2 dan 3. Muat naik keluaran dengan nama fail asal yang dijana oleh pengimport.
2. Dalam projek Google Apps Script pemilik folder, salin `integrations/drive/Code.gs` dan tetapkan Script Property `ROSTER_FOLDER_ID` kepada ID folder terhad. Deploy sebagai Web App, **Execute as me**, akses **Anyone** jika akaun membenarkannya. Uji dahulu dengan fail rekaan dan permintaan `?school=BBB8308` daripada sesi tanpa log masuk.
3. Tetapkan pemboleh ubah GitHub Actions `VITE_ROSTER_URL` kepada URL `/exec` dan jalankan workflow Publish PU Insight. URL ini bukan kelayakan akses Drive. Sekolah hanya meminta hasil satu kod pada satu masa. Peratus dan carian kekal menggunakan snapshot.
4. Selepas penyediaan, muat naik JSON baharu ke folder tersebut. Pelayan memilih tarikh tamat terkini bagi setiap set, diikuti tarikh mula dan masa kemas kini jika tempoh sama. Senarai lama boleh dipadam dari folder oleh pemilik. Perubahan mungkin mengambil sehingga beberapa minit akibat cache pelayan dan pelayar. Ketiadaan kod sekolah dalam fail tidak dianggap sebagai bukti sifar.

Tanpa `VITE_ROSTER_URL`, profil hanya memaparkan data agregat. GitHub Pages tidak menyediakan pelayan import atau akses ke Drive terhad.

### Ruang Admin dengan akaun CM4

Pautan **Ruang Admin** di footer membuka Google Apps Script peribadi untuk ketiga-tiga set. Penerbitan menggunakan **Execute as me** dan **Only myself** daripada akaun CM4. Fungsi pelayan turut menyemak alamat e-mel CM4 sebelum memaparkan borang, memproses pratonton atau menulis ke Google Drive. Jika pelayar sedang menggunakan beberapa akaun Google, gunakan profil pelayar berasingan untuk CM4.

Sumber berada di `integrations/admin/`. Untuk menerbitkan daripada dua fail sumber, salin `Code.gs` dan `Summary.gs` ke Apps Script dan `Index.html` sebagai fail HTML bernama `Index`. Tetapkan sifat skrip `ROSTER_FOLDER_ID` kepada folder terhad yang sama dengan penyambung bacaan. Versi pertama menyertakan HTML terus dalam `Code.gs`; kedua-dua bentuk memaparkan borang yang sama. Senarai kod sekolah datang daripada snapshot Petaling Utama dan perlu dikemas kini jika liputan sekolah berubah.

Borang web membaca CSV secara berperingkat di pelayar dan menghantar hanya lajur perlu bagi rekod Petaling Utama. Had 8 MB dikenakan pada data tapisan yang dihantar, tanpa had saiz tetap pada fail asal. Pratonton tidak menulis ke Drive. Penerbitan menyimpan JSON Set 2 atau Set 3 dalam folder terhad; format senarai kekal serasi dengan penyambung bacaan. Set 1 menerima CSV ringkasan atau XLSX dengan helaian Murid, Guru dan AI Tools (Guru), serta helaian aplikasi Selangor jika disertakan. Ringkasan disimpan sebagai snapshot berasingan mengikut tempoh. Dashboard menggabungkannya dengan arkib sedia ada selepas dimuat semula.

Profil menyediakan **Salin senarai** untuk setiap kumpulan yang tersedia. PDF Rumusan dan PDF Senarai Nama dijana di pelayar sebagai dokumen A4 berjenama, dengan pilihan simpan atau buka untuk cetak.
