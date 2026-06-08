# AI Quran & Sholat Frontend 📱

Interface chat modern untuk asisten Islami, dibangun dengan struktur **Jekyll Modular** dan UI dari **Ionic Core 8**.

## Fitur Utama
- **Real-time Streaming**: Pesan AI muncul dengan efek mengetik (SSE) untuk pengalaman chat yang lebih hidup.
- **Markdown Support**: Menggunakan `marked.js` sehingga jawaban AI tampil rapi dengan format list, bold, dan heading.
- **Conversation History**: Menyimpan riwayat percakapan secara lokal di browser menggunakan LocalStorage.
- **Responsive Design**: Tampilan yang dioptimalkan untuk mobile maupun desktop menggunakan Ionic Split Pane.
- **Modular Structure**: Dibangun dengan Jekyll sehingga kode HTML, CSS, dan JS terpisah dengan rapi di folder `_includes`, `_layouts`, dan `assets`.

## Tech Stack
- **Static Site Generator**: Jekyll
- **UI Framework**: Ionic Core 8 (CDN)
- **Icons**: IonIcons 7
- **Markdown Parser**: Marked.js
- **Logic**: Vanilla JavaScript (ES6)
- **AI**: CLOUDFLARE AI

## Struktur Folder
```text
frontend/
├── _includes/     # Header, Sidebar, Footer, Scripts
├── _layouts/      # Base layout default.html
├── assets/
│   ├── css/       # style.css (Custom styles)
│   └── js/        # app.js (Chat logic & API handling)
├── index.html     # Halaman utama chat
└── _config.yml    # Konfigurasi Jekyll
```

## Pengembangan Lokal

1. Pastikan Jekyll sudah terinstall di sistem Anda.
2. Jalankan perintah berikut di folder `frontend`:
   ```bash
   bundle exec jekyll serve
   ```
3. Buka browser di `http://localhost:4000`.

## Integrasi Backend
Frontend dikonfigurasi untuk menghubungkan ke backend di `http://localhost:8787` (Default Wrangler dev). Anda dapat mengubah alamat API di file `assets/js/app.js` pada variabel `API_BASE_URL`.
