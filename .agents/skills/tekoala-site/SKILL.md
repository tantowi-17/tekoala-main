---
name: tekoala-site
description: >-
  Panduan kerja untuk website Tekoala (tekoala.id): static site Webpack 5 + Handlebars + SCSS
  yang konten utamanya diatur lewat file JSON. Gunakan skill ini setiap kali mengubah halaman,
  section, konten, event, program pelatihan, portofolio/studi kasus, styling, SEO, atau saat
  build, cek tampilan, dan push project tekoala-main.
---

# Tekoala Site

Komunikasi dengan user memakai Bahasa Indonesia yang santai dan singkat. Semua teks di website juga berbahasa Indonesia.

## Peta project

| Kebutuhan | Lokasi |
|---|---|
| Halaman (1 file = 1 URL) | `src/views/pages/<nama>.hbs`, di-render menjadi `build/<nama>.html` dan diakses lewat `/<nama>` |
| Data halaman | `src/views/contents/<nama>.json`, otomatis dipasangkan dengan `.hbs` yang namanya sama |
| Data global (brand, menu, footer, `events`, `programCatalog`, testimoni, `team`) | `src/views/contents/global.json` |
| Komponen | `src/views/partials/components/**.hbs`, dipanggil dengan `{{> components/<path> <dataKey> }}` |
| Layout + meta SEO | `src/views/layout/default.hbs`, dengan `<body class="bg-dark">` (situs bertema gelap) |
| Style kustom | `src/scss/_tekoala.scss`. Jangan mengedit `src/scss/css/style.css` karena itu CSS template dasar |
| JS kustom | `src/js/site.js` (event, filter, form WA, tracking) dan `src/js/ai-boot.js` (jawaban chatbot) |
| Helper Handlebars | `webpack.config.js` → `helpers` (`upcomingEvents`, `programList`, `isoDay`, `concat`, `urlencode`, `eq`, `slug`, dll.) |
| SEO otomatis | `src/seo/plugin.js` (sitemap, robots, `llms.txt`) dan `src/seo/schema.js` (JSON-LD). Halaman baru otomatis masuk sitemap; pakai `meta.robots: "noindex"` untuk mengecualikan |
| Server | `src/server/.htaccess` disalin ke build (cPanel/LiteSpeed, URL tanpa `.html`) |

Detail pola konten (event, program, portofolio) ada di [references/content-patterns.md](references/content-patterns.md).

## Aturan wajib

1. **Konten diubah di JSON, bukan di HBS.** Ubah `.hbs` hanya untuk struktur atau markup baru.
2. **Setiap halaman baru butuh pasangan file `pages/<nama>.hbs` dan `contents/<nama>.json`**, dengan field `page_title`, `pageKey`, `meta.description`, `meta.path`, dan `breadcrumb`. Jika halaman perlu muncul di menu, tambahkan juga ke `global.json` → `menu` dan `footer`.
3. **Pakai `.container` biasa** supaya lebarnya konsisten dengan halaman lain. Jangan pakai `container-full` kecuali user memintanya.
4. **Tombol kustom.** `style.css` punya aturan global `button:hover::after` yang memberi overlay gelap, dan `.bg-dark button:hover` yang mengganti warna teks. Untuk tombol pill/filter kustom, tambahkan `&::after { display: none !important; }` dan tetapkan warna `.active` serta `.active:hover` secara eksplisit.
5. **Kontras di tema gelap.** Hindari teks dan latar yang sama-sama gelap. Untuk warna netral, gunakan `rgba(255,255,255,.1)`. Aksen utama adalah `var(--color-primary)` (hijau neon), dengan teks di atasnya `var(--dark)`.
6. **Harga program pelatihan belum dipublikasikan.** Isi `price` dengan `"Segera Hadir"` (atau `"Sesuai Kebutuhan"` untuk in-house) dan jangan pakai `priceNormal`. Harga juga muncul di `src/js/ai-boot.js` (chatbot) dan `pelatihan.json` → `pricing`, jadi cek ketiganya bersamaan.
7. **Jangan mengarang fakta** seperti angka hasil, nama klien, atau tech stack. Jika teks ditulis dari asumsi, tandai dan minta user mengecek.
8. **Edit file memakai tool edit atau Python.** `sed -i` di macOS butuh argumen `''` dan rawan error.
9. **Referensi desain** ada di template Dixor: `/Users/tantowi/MyData/Sidepro/Template GSAP/Dixor v1.5/source/` (`project*.html`, `services*.html`, dll.). Class CSS-nya sebagian besar sudah tersedia di `style.css`.

## Alur kerja

1. Baca JSON dan komponen yang terkait sebelum mengubah apa pun. Cari dengan `grep -rn "<teks>" src --exclude-dir=node_modules`.
2. Ubah JSON, HBS, SCSS, atau JS sesuai kebutuhan.
3. Jalankan build: `npm run build`. Build harus selesai tanpa error. Output masuk ke `build/`, yang ikut di-commit.
4. **Cek tampilan secara visual** dengan [scripts/shot.sh](scripts/shot.sh):
   ```bash
   bash .agents/skills/tekoala-site/scripts/shot.sh portofolio.html /tmp/shots/porto.png 1440 2000
   ```
   Lalu buka PNG tersebut dan periksa kontras, layout, overflow, dan state tombol.
5. Laporkan hasil secara singkat dengan tautan file. Sebutkan juga hal yang belum diverifikasi.
6. **DILARANG commit atau push tanpa perintah eksplisit dari user.** Ikuti bagian "Aturan Git" di bawah.

## Aturan Git (Wajib & Ketat)

1. **DILARANG auto-commit atau auto-push.** Jangan pernah menjalankan `git commit` atau `git push` atas inisiatif sendiri, atau menganggap "continue" / "oke" sebagai izin push. Hanya jalankan ketika user secara eksplisit menulis perintah seperti `"push"`, `"commit"`, atau `"ya, push"`.
2. **Wajib build sebelum commit.** Karena folder `build/` di-track di repo untuk deployment cPanel/LiteSpeed, pastikan `npm run build` sudah dijalankan dan berhasil sebelum melakukan commit.
3. **Cek `git status --short` dan `git diff --stat` sebelum staging.**
   - Jangan gunakan `git add .` atau `git add -A` secara membabi buta.
   - Tambahkan hanya file yang relevan dengan tugas (`src/...`, `build/...`, `.agents/...`).
   - **DILARANG meng-commit:** `.vscode/`, `.idea/`, `.claude/`, `.DS_Store`, file sementara, atau `.env` / kredensial.
4. **DILARANG menjalankan perintah Git destruktif** (`git push --force`, `git reset --hard`, `git checkout .`, `git clean -fd`, menghapus branch) tanpa izin eksplisit dari user.
5. **Branch & pesan commit:** Push hanya ke branch aktif (`main` di `origin`) dengan pesan commit singkat dan jelas dalam Bahasa Indonesia.

## Verifikasi cepat

- Halaman baru: pastikan `build/<nama>.html` ada dan `grep -c <nama> build/sitemap.xml` bernilai ≥ 1.
- Konten lama hilang: `grep -rn "<teks lama>" src build --exclude-dir=node_modules` tidak mengembalikan hasil (abaikan file font `.svg`).
- Logika event berjalan di browser setiap detik, jadi tidak perlu build ulang saat sebuah event berakhir. Lihat references.

