# Sarkas YouTube Downloader

UI neon anime/cyberpunk + backend Node.js Express dan yt-dlp.

## Catatan penggunaan
Gunakan hanya untuk video milik sendiri atau konten yang pemiliknya memberi izin untuk diunduh. Hormati hak cipta dan ketentuan YouTube. Jangan gunakan untuk mengakali pembatasan akses, konten privat, atau materi berhak cipta tanpa izin.

## Persyaratan
- Node.js 18+
- Python 3.8+ (dibutuhkan oleh instalasi yt-dlp)
- yt-dlp
- FFmpeg (dibutuhkan untuk menggabungkan audio/video dan konversi MP3)

## Instalasi

### Windows
1. Install Node.js LTS.
2. Install yt-dlp: `py -m pip install -U yt-dlp`
3. Install FFmpeg dan pastikan `ffmpeg` serta `ffprobe` ada di PATH.
4. Buka terminal di folder proyek:
   `npm install`
5. Jalankan:
   `npm start`
6. Buka `http://localhost:3000`.

### Android
Proyek Node.js ini lebih mudah dijalankan di PC. Di Android, jalankan lewat Termux dengan Node.js, Python, yt-dlp, dan FFmpeg yang kompatibel.

## Endpoint
- `GET /api/health` — status server
- `POST /api/info` — JSON `{ "url": "https://www.youtube.com/watch?v=..." }`
- `POST /api/download` — JSON `{ "url": "...", "format": "mp4|mp3", "quality": "360|720|1080|128|192|320" }`

## Struktur
- `server.js` — API dan proses yt-dlp
- `public/index.html` — markup
- `public/style.css` — tema dan responsive layout
- `public/app.js` — interaksi frontend

## Troubleshooting
- `yt-dlp tidak ditemukan`: pastikan perintah `yt-dlp --version` berhasil di terminal. Jika tidak, atur `YTDLP_PATH` ke lokasi executable.
- `ffmpeg not found`: install FFmpeg lalu restart terminal.
- `Video tidak bisa diproses`: beberapa video punya pembatasan, perlu login, atau tidak tersedia untuk diunduh. Jangan mencoba melewati pembatasan tersebut.
- Untuk deployment publik, tambahkan autentikasi, batas ukuran/durasi, antrean pekerjaan, penyimpanan sementara yang terisolasi, dan pemantauan biaya. Jangan membuka endpoint download tanpa perlindungan.
