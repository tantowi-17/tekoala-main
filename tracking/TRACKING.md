# Setup Tracking Tekoala (GTM, GA4, Search Console, Ads, Meta Pixel)

Website hanya memasang **Google Tag Manager (GTM)**. Semua tool lain (GA4, Google Ads, Meta Pixel) dipasang **di dalam GTM**, jadi setelah setup awal tidak perlu mengubah kode lagi.

Setiap interaksi penting di website dikirim ke `dataLayer` (lihat [Daftar event](#daftar-event)).

---

## 1. Buat Google Tag Manager

1. Buka <https://tagmanager.google.com>, lalu **Create Account**.
   - Account name: `Tekoala`
   - Container name: `tekoala.id`, Target platform: **Web**
2. Salin ID container (format `GTM-XXXXXXX`).
3. Isi ID itu di `src/views/contents/global.json`:
   ```json
   "tracking": {
       "gtmId": "GTM-XXXXXXX",
       ...
   }
   ```
4. Jalankan `npm run build`, lalu upload folder `build/`.

## 2. Buat Google Analytics 4

1. Buka <https://analytics.google.com>, lalu **Admin → Create → Property**.
   - Property name: `Tekoala`, Time zone: **Indonesia (GMT+08:00 Makassar)**, Currency: **IDR**
2. Pilih platform **Web**, isi URL `https://tekoala.id`, stream name `tekoala.id`.
3. Salin **Measurement ID** (format `G-XXXXXXXXXX`).

## 3. Impor container siap pakai ke GTM

File `tracking/gtm-container-tekoala.json` berisi tag GA4 dan semua event website.

1. Di GTM: **Admin → Import Container**, lalu pilih file `gtm-container-tekoala.json`.
2. Workspace: **Existing → Default Workspace**. Import option: **Merge → Rename conflicting tags, triggers, and variables**.
3. Buka **Variables → GA4 Measurement ID**, lalu ganti `G-XXXXXXXXXX` dengan Measurement ID dari langkah 2.
4. Klik **Preview**, masukkan `https://tekoala.id`, lalu coba klik tombol WhatsApp, Daftar Sekarang, dan filter kelas. Pastikan tag **GA4 - Event Tekoala** ter-*fire*.
5. Klik **Submit → Publish**.

Isi container:

| Jenis | Nama | Fungsi |
|---|---|---|
| Tag | GA4 - Google Tag | Page view GA4 di semua halaman |
| Tag | GA4 - Event Tekoala | Mengirim semua event website ke GA4 beserta parameternya |
| Trigger | CE - Semua event Tekoala | Semua event di [daftar event](#daftar-event) |
| Trigger | CE - Konversi (lead) | Hanya event konversi; dipakai untuk Google Ads dan Meta Pixel (langkah 6–7) |
| Variable | GA4 Measurement ID, DLV - … | ID GA4 dan parameter event |

> Kalau impor gagal, buat manual: tag **Google Tag** (ID = Measurement ID, trigger *Initialization - All Pages*), lalu tag **GA4 Event** (Event Name `{{Event}}`, trigger *Custom Event* regex dari daftar event) dengan parameter dari tabel di bawah.

## 4. Atur GA4 setelah data masuk (±24 jam)

1. **Key events (konversi).** Buka **Admin → Events** dan tandai sebagai *key event*:
   - `contact_whatsapp`, `contact_form_submit`, `program_register_click`
2. **Custom dimensions.** Supaya parameter terlihat di laporan, buka **Admin → Custom definitions → Create custom dimension** (scope: *Event*) untuk:
   - `location`, `program`, `category`, `plan`, `interest`, `filter`, `value`, `topic`

## 5. Google Search Console

1. Buka <https://search.google.com/search-console>, lalu **Add property**.
   - **Domain** `tekoala.id`, verifikasi lewat DNS (disarankan, di panel domain), **atau**
   - **URL prefix** `https://tekoala.id`, verifikasi pilih **HTML tag**, lalu salin isi `content="..."` ke `global.json`:
     ```json
     "googleSiteVerification": "kode-dari-search-console"
     ```
     Build dan upload, lalu klik **Verify**. (Bisa juga pilih metode **Google Tag Manager** jika GTM sudah publish.)
2. **Sitemaps:** kirim `sitemap.xml`.
3. Di GA4: **Admin → Search Console links** untuk menghubungkan data pencarian ke Analytics.

## 6. Google Ads (saat mulai beriklan)

1. Di Google Ads: **Goals → Conversions → New conversion action → Website**, tipe *Submit lead form* atau *Contact*. Pilih setup **manual / Google Tag Manager**, lalu catat **Conversion ID** dan **Conversion Label**.
2. Di GTM, tambahkan:
   - Tag **Conversion Linker**, trigger *All Pages*.
   - Tag **Google Ads Conversion Tracking** (isi ID & label), trigger **CE - Konversi (lead)**.
3. Preview, lalu Publish.

## 7. Meta Pixel (iklan Facebook/Instagram)

1. Di Meta Events Manager: **Connect data sources → Web → Meta Pixel**, lalu catat **Pixel ID**.
2. Di GTM: **Templates → Search Gallery → "Facebook Pixel"** (dari *facebookarchive*), lalu tambahkan tag:
   - **Meta Pixel - PageView**, trigger *All Pages*.
   - **Meta Pixel - Lead** (event name `Lead`), trigger **CE - Konversi (lead)**.
3. Preview, lalu Publish.

> **Penting:** jika memasang Google Ads atau Meta Pixel, tambahkan keduanya ke bagian *Berbagi Data dengan Pihak Ketiga* dan *Cookie* di `src/views/contents/kebijakan-privasi.json`.

---

## Daftar event

| Event | Kapan terjadi | Parameter |
|---|---|---|
| `contact_whatsapp` | Klik nomor/tombol WhatsApp | `location`: header, footer, cta, contact_page |
| `contact_form_submit` | Kirim form kontak (dibuka di WhatsApp) | `interest`: program/layanan yang dipilih |
| `program_register_click` | Klik "Daftar Sekarang" di kartu kelas | `program`, `category` |
| `pricing_click` | Klik tombol di paket harga | `plan` |
| `program_filter` | Memakai filter kelas | `filter` (bidang/format/level), `value` |
| `social_click` | Klik ikon sosial di footer | `platform` |
| `cta_program`, `cta_layanan` | Klik tombol di hero beranda | `location`: banner |
| `chatbot_toggle` | Buka/tutup chatbot | `action`: open/close |
| `chatbot_message_sent` | Mengirim pertanyaan di chatbot | `topic` (topik saja, **bukan** isi pesan) |
| `chatbot_suggestion_click` | Klik saran pertanyaan chatbot | `suggestion_text` |

**Konversi (lead):** `contact_whatsapp`, `contact_form_submit`, `program_register_click`, `pricing_click`.

## Untuk developer

- Kirim event dari JS: `trackEvent('nama_event', { param: 'nilai' })`.
- Atau tanpa JS, cukup tambahkan atribut di elemen yang diklik:
  ```html
  <a href="..." data-track="nama_event" data-track-location="footer">...</a>
  ```
  Ini menghasilkan `{ event: "nama_event", location: "footer" }`.
- Di `localhost`, setiap event juga tampil di console browser (`[track] ...`) untuk pengecekan tanpa GTM.
- Event baru perlu ditambahkan ke regex trigger **CE - Semua event Tekoala** di GTM.
