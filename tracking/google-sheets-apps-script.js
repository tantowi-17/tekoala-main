/**
 * ============================================================================
 * GOOGLE APPS SCRIPT — PENERIMA FORM REGISTRASI EVENT & KELAS TEKOALA
 * ============================================================================
 *
 * Cara Pasang di Google Sheets (3 Menit):
 * 1. Buat Google Sheet baru di Google Drive Anda.
 * 2. Klik menu: Extensions (Ekstensi) -> Apps Script.
 * 3. Hapus semua kode bawaan, lalu tempel (paste) seluruh isi file ini.
 * 4. Klik ikon Save (Simpan), lalu klik tombol "Deploy" -> "New deployment".
 * 5. Pilih jenis (Select type): "Web app".
 *    - Description: Registrasi Tekoala
 *    - Execute as: "Me" (Email Anda)
 *    - Who has access: "Anyone" (Siapa saja)
 * 6. Klik "Deploy", berikan izin akses (Authorize access), lalu salin URL Web App
 *    yang berakhiran `/exec`.
 * 7. Tempel URL tersebut ke file `src/views/contents/global.json` pada bagian:
 *    `"registration": { "sheetEndpoint": "https://script.google.com/macros/s/.../exec" }`
 * 8. Jalankan `npm run build`.
 *
 * Script ini otomatis membuat 2 tab sheet:
 * - "Kelas Gratis" (10 field peserta lengkap)
 * - "Kelas Berbayar" (4 field peserta ringkas)
 * ============================================================================
 */

const APP_TOKEN = 'tkl_reg_2026_v1';
const SHEET_FREE = 'Kelas Gratis';
const SHEET_PAID = 'Kelas Berbayar';

/**
 * Sanitasi input & cegah Spreadsheet Formula Injection (=, +, -, @)
 */
function sanitizeCell(val, maxLen) {
  let s = String(val || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
  if (maxLen && s.length > maxLen) {
    s = s.slice(0, maxLen);
  }
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Payload kosong.' });
    }

    const body = JSON.parse(e.postData.contents);

    // 1. Validasi token aplikasi
    if (!body || body.token !== APP_TOKEN) {
      return jsonResponse({ ok: false, error: 'Token tidak valid.' });
    }

    // 2. Validasi field dasar
    const nama = sanitizeCell(body.nama, 120);
    const email = sanitizeCell(body.email, 120).toLowerCase();
    const noWa = sanitizeCell(body.noWa, 25);
    const alamat = sanitizeCell(body.alamat, 350);
    const itemTitle = sanitizeCell(body.itemTitle, 160);
    const itemKind = sanitizeCell(body.itemKind, 80);
    const itemPrice = sanitizeCell(body.itemPrice, 60);
    const isPaid = body.formType === 'paid';

    if (!nama || !email || !noWa || !alamat || !itemTitle) {
      return jsonResponse({ ok: false, error: 'Data wajib belum lengkap.' });
    }

    // 3. Rate-limit per email + event (cegah double-submit / spam dalam 30 detik)
    const cache = CacheService.getScriptCache();
    const rateKey = 'reg_' + Utilities.base64EncodeWebSafe(email + '|' + itemTitle).slice(0, 60);
    if (cache.get(rateKey)) {
      return jsonResponse({ ok: true, duplicate: true });
    }
    cache.put(rateKey, '1', 30);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const witaTime = Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd HH:mm:ss');

    if (isPaid) {
      const sheet = getOrCreateSheet(ss, SHEET_PAID, [
        'Waktu Daftar (WITA)',
        'Nama Event / Kelas',
        'Kategori',
        'Status',
        'Harga',
        'Nama Lengkap',
        'Email',
        'No. WhatsApp',
        'Alamat'
      ]);
      sheet.appendRow([
        witaTime,
        itemTitle,
        itemKind,
        'Berbayar',
        itemPrice,
        nama,
        email,
        noWa,
        alamat
      ]);
    } else {
      const ttl = sanitizeCell(body.ttl, 120);
      const socialMedia = sanitizeCell(body.socialMedia, 1000);
      const pendidikan = sanitizeCell(body.pendidikan, 60);
      const pekerjaan = sanitizeCell(body.pekerjaan, 80);
      const jabatan = sanitizeCell(body.jabatan, 100);
      const perusahaan = sanitizeCell(body.perusahaan, 120);

      if (!ttl || !socialMedia || !pendidikan || !pekerjaan || !jabatan || !perusahaan) {
        return jsonResponse({ ok: false, error: 'Data kelas gratis belum lengkap.' });
      }

      const sheet = getOrCreateSheet(ss, SHEET_FREE, [
        'Waktu Daftar (WITA)',
        'Nama Event / Kelas',
        'Kategori',
        'Status',
        'Nama Lengkap',
        'Email',
        'No. WhatsApp',
        'TTL',
        'Alamat',
        'URL Social Media',
        'Pendidikan Terakhir',
        'Pekerjaan',
        'Jabatan',
        'Perusahaan / Instansi'
      ]);
      sheet.appendRow([
        witaTime,
        itemTitle,
        itemKind,
        'Gratis',
        nama,
        email,
        noWa,
        ttl,
        alamat,
        socialMedia,
        pendidikan,
        pekerjaan,
        jabatan,
        perusahaan
      ]);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Server error.' });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

