# Agentic AI — Frontend

Frontend aplikasi **Agentic AI** yang menyediakan antarmuka untuk menggunakan AI Agent, mengelola model AI, dan berinteraksi melalui chat.

## Teknologi

- React 19 dan TypeScript
- Vite 8
- Tailwind CSS 4 dan komponen UI berbasis Radix
- TanStack Router, Query, dan Table
- Zustand untuk state management
- i18next dan react-i18next untuk bahasa antarmuka
- React Hook Form dan Zod untuk formulir dan validasi
- Vitest + Playwright untuk pengujian browser

## Fitur utama

- Autentikasi pengguna, termasuk login dan registrasi
- Halaman chat AI dengan pemilihan Agent dan Model
- Pengelolaan Agent, provider, dan model AI yang tersedia bagi pengguna
- Pengelolaan tugas dan riwayat percakapan
- Pengaturan akun dan profil pengguna
- Pilihan bahasa Indonesia dan Inggris
- Tema tampilan terang dan gelap

> Fitur yang bisa digunakan bergantung pada endpoint dan konfigurasi backend yang sedang dijalankan.

## Persyaratan

- Node.js versi yang kompatibel dengan Vite 8
- npm
- Backend Agentic AI yang berjalan
- Kredensial Google OAuth jika fitur Google Sign-In ingin digunakan

## Instalasi dan menjalankan

1. Clone repo dan masuk ke direktorinya:

   ```bash
   git clone https://github.com/alampelajar/agentic-ai-fe.git
   cd agentic-ai-fe
   ```

2. Pasang dependency:

   ```bash
   npm install
   ```

3. Buat file konfigurasi lokal dari contoh:

   **Windows PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**
   ```bash
   cp .env.example .env
   ```

4. Sesuaikan nilai di file `.env`:

   ```env
   VITE_API_BASE_URL=http://localhost:8080
   VITE_GOOGLE_CLIENT_ID=
   ```

   `VITE_API_BASE_URL` adalah alamat root backend tanpa akhiran `/api`. Isi `VITE_GOOGLE_CLIENT_ID` jika Google Sign-In dikonfigurasi.

5. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

   Buka URL lokal yang ditampilkan Vite di terminal (biasanya `http://localhost:5173`).

## Perintah yang tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Memeriksa TypeScript dan membuat build produksi |
| `npm run preview` | Meninjau build produksi secara lokal |
| `npm run lint` | Menjalankan ESLint |
| `npm test` | Menjalankan pengujian Vitest di browser |
| `npm run test:coverage` | Menjalankan pengujian beserta laporan cakupan |

## Integrasi backend

Secara default, frontend mengirim request ke `http://localhost:8080`. Ubah `VITE_API_BASE_URL` di `.env` jika backend berjalan pada alamat lain, lalu mulai ulang server Vite.

Pastikan backend mengizinkan origin frontend melalui konfigurasi CORS. Jangan memasukkan API key rahasia ke variabel frontend berawalan `VITE_`, karena nilainya akan ikut terekspos di browser.

## Kontribusi

1. Buat branch baru untuk perubahan.
2. Jalankan `npm run lint` dan `npm run build`.
3. Jalankan pengujian yang relevan.
4. Ajukan pull request dengan ringkasan perubahan dan hasil pengujian.
