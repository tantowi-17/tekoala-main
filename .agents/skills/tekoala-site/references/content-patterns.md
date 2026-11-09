# Pola Konten Tekoala

## Event (`global.json` → `events.items[]`)

```json
{
  "title": "Sharing Session: ...",
  "description": "...",
  "speaker": "Nama", "speakerRole": "Founder · ...", "speakerImage": "../../assets/img/team/team01.jpeg",
  "start": "2026-11-15T19:00:00+08:00", "end": "2026-11-15T21:00:00+08:00",
  "dayLabel": "Minggu", "dateLabel": "15 November 2026", "timeLabel": "19.00 – 21.00 WITA",
  "format": "Online (Zoom / Google Meet)", "price": "Gratis", "audience": "...",
  "category": "data", "cta": "Daftar via WhatsApp"
}
```

- Format `start` dan `end` adalah ISO dengan zona waktu: `+08:00` untuk WITA, `+07:00` untuk WIB.
- **Saat build**, helper `upcomingEvents` hanya me-render event dengan `end >= sekarang`, diurutkan dari `start` terdekat.
- **Di browser** (`site.js`, dicek setiap detik):
  - Sebelum `start`: countdown berjalan.
  - Antara `start` dan `end`: elemen mendapat `.is-live` dan status berubah menjadi "Sedang berlangsung".
  - Setelah `end`: elemen dihapus. Section `#event` ikut hilang jika semua kartu sudah dihapus.
  - Kartu pertama yang tersisa mendapat `.is-next` (highlight).
- Event dipakai di empat tempat:
  - Section `components/events.hbs` (grid 2 kolom, tombol mengarah ke `/daftar?item=<slug>`).
  - Hero `components/banner.hbs`. Hanya event terdekat yang tampil. Setelah selesai, hero beralih ke kartu mentor (`data-event-fallback`).
  - Notifikasi `components/event-notice.hbs`.
  - Halaman pendaftaran `/daftar` (`pages/daftar.hbs` + `components/register.hbs`): otomatis mendeteksi `isPaid: false` (Form Kelas Gratis 10 field + multiple input social media) atau `isPaid: true` (Form Kelas Berbayar 4 field) dan mengirim data ke Google Sheets via `registration.sheetEndpoint` di `global.json` (script backend tersedia di `tracking/google-sheets-apps-script.js`).

## Program pelatihan

- Katalog lengkap ada di `global.json` → `programCatalog.items[]`: `icon`, `format`, `category`, `duration`, `level`, `title`, `description`, `price`, `cta`.
- Setiap halaman memilih program lewat `programs.show[]` berisi `{ "title": "...", "featured": true }`. Item di-merge dengan katalog berdasarkan `title`, yang harus persis sama.
- Field `price` saat ini berisi `"Segera Hadir"` (harga belum dipublikasikan).

## Portofolio dan studi kasus

- Halaman daftar: `pages/portofolio.hbs` + `contents/portofolio.json` → `portfolio.items[]`:
  ```json
  { "image": "../../assets/img/portfolio/proyek/<slug>.jpg", "category": "Website Organisasi",
    "filter": "website", "title": "...", "description": "1 kalimat", "tech": ["PHP", "Tailwind CSS"],
    "url": "/proyek-<slug>" }
  ```
  `filter` harus cocok dengan salah satu `portfolio.filters[].key`. Urutan kartu mengikuti urutan array.
- Halaman detail: `pages/proyek-<slug>.hbs` (isinya memanggil breadcrumb, `components/portfolio/case-detail caseStudy`, dan cta) + `contents/proyek-<slug>.json` dengan `pageKey: "portofolio"` dan `caseStudy`:
  `heroImage`, `heroAlt`, `liveUrl`, `tags[]`, `title`, `client`, `tech[]`, `scope[]`,
  `problem{summary,points[]}`, `solution{...}`, `results{...}`, `gallery[{image,alt}]`, `lists[{title,items[]}]`.
  Contoh lengkap: `contents/proyek-ayam-po.json`. Pengecualian: Desa Tobadak memakai URL lama `/digital-desa`.
- Screenshot proyek baru disimpan ke `src/assets/img/portfolio/proyek/`:
  ```bash
  C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$C" --headless=new --disable-gpu --hide-scrollbars --window-size=1440,900 --virtual-time-budget=8000 --screenshot=/tmp/<slug>.png https://site/
  sips -s format jpeg -s formatOptions 75 -Z 1440 /tmp/<slug>.png --out src/assets/img/portfolio/proyek/<slug>.jpg
  ```
  Buat juga versi `-full` (tinggi 2400) untuk galeri. Hentikan jika situs memakai CAPTCHA atau butuh login.
- Tag teknologi yang dideteksi dari HTML hanya mencerminkan sisi frontend. Selalu minta user mengonfirmasi stack sebenarnya.

