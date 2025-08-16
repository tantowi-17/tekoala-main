# Tekoala Main

Proyek ini adalah **frontend build system** berbasis **Webpack 5** dengan dukungan **Handlebars (.hbs)** sebagai template engine, **SCSS** untuk styling, dan asset pipeline yang terintegrasi (CSS, JS, Fonts, Images).

---

## 🚀 Features
- **Webpack 5** untuk bundling.
- **Handlebars (.hbs)** templating dengan dukungan partials & JSON data.
- **SCSS/SASS** + **PostCSS (autoprefixer)**.
- **CSS & JS minification** dengan Terser dan CSS Minimizer.
- **Asset loader** untuk gambar, font, dan media.
- **Webpack Dev Server** dengan live reload.
- **Dynamic Handlebars entries** otomatis dari folder `src/views/pages`.

---

## 📂 Project Structure
```
tekoala-main/
├── src/
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   ├── media/
│   │   └── scss/
│   ├── views/
│   │   ├── layout/      # Layout .hbs
│   │   ├── partials/    # Reusable partials
│   │   ├── pages/       # Halaman utama (.hbs)
│   │   └── contents/    # JSON data untuk template
│   └── js/
│       └── main.js
├── build/               # Output build (auto-generated)
├── package.json
├── webpack.config.js
└── README.md
```

---

## 🛠 Installation

Pastikan Node.js sudah terinstall (versi 18+ direkomendasikan).

```bash
# Clone repository
git clone https://github.com/username/tekoala-main.git
cd tekoala-main

# Install dependencies
npm install
```

---

## 📦 Available Scripts

### Development Mode
```bash
npm start
```
Menjalankan **webpack dev server** dengan mode development + live reload.

### Production Mode
```bash
npm run prod
```
Menjalankan **webpack dev server** dengan mode production.

### Build for Production
```bash
npm run build
```
Menghasilkan folder `build/` berisi file HTML, CSS, JS, Fonts, dan Assets siap untuk deployment.

### Test
```bash
npm test
```
(Saat ini belum ada unit test, hanya placeholder.)

---

## ⚙️ How it Works
- Semua file `.hbs` dalam `src/views/pages/` otomatis di-compile menjadi HTML.
- Jika ada file JSON dengan nama sama di `src/views/contents/`, maka otomatis digunakan sebagai data.
  - Contoh:
    - `src/views/pages/home.hbs`
    - `src/views/contents/home.json`
    → menghasilkan `build/home.html` dengan data dari JSON.
- Partials tersedia di `src/views/partials/` dan `src/views/layout/`.
- SCSS di-compile → CSS dengan autoprefixer.
- Asset (images, fonts, icons) otomatis dipindahkan ke `assets/`.

---

## 🔧 Custom Helpers
Tersedia beberapa Handlebars helpers custom:
- `arraySize(array)` → Menghitung panjang array.
- `inc(value)` → Menambahkan 1 ke angka.
- `incPad(value)` → Menambahkan 1 dan padding `0` jika < 10.
- `json(context)` → Mengubah object jadi string JSON.

---

## 📜 License
ISC License.
