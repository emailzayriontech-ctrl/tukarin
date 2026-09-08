# Product Requirements Document (PRD)

# Wedding Run
**Version:** 1.0

## 1. Overview
Wedding Run adalah mini game endless runner berbasis browser yang terinspirasi dari Chrome Dino. Game menjadi bagian dari website undangan digital untuk memberikan pengalaman interaktif kepada tamu.

## 2. Tujuan
- Memberikan first impression yang unik.
- Meningkatkan engagement pengunjung.
- Menjadi pembeda dari undangan digital lainnya.
- Mendorong tamu membuka dan membagikan undangan.

## 3. Target User
- Calon pengantin
- Tamu undangan
- Vendor wedding
- Pengguna desktop & mobile

## 4. Platform
- Browser (Desktop, Tablet, Mobile)
- Responsive
- Tanpa instalasi aplikasi

## 5. Gameplay
- Endless runner
- Karakter berlari otomatis
- Kontrol:
  - Jump
  - Duck (opsional)
  - Restart
- Game over saat menabrak obstacle.

## 6. Story Progression
Persiapan → Lamaran → Persiapan Pernikahan → Akad → Resepsi → Happy Ending

## 7. Character Selection
Pemain memilih:
- 🤵 Pengantin Pria
- 👰 Pengantin Wanita

Nama dan foto otomatis mengikuti data mempelai.

## 8. Animasi Karakter
- Idle
- Run
- Jump
- Duck
- Game Over
- Celebrate

## 9. Controls
### Desktop
- Space = Jump
- Arrow Down = Duck
- R = Restart

### Mobile
- Tap = Jump
- Swipe Down = Duck

## 10. Obstacle
Contoh:
- Tagihan Vendor
- Macet
- Souvenir
- Kardus Dekorasi
- Hujan
- Chat "Kapan Nikah?"
- Jalan Berlubang
- Kamera
- Tripod
- Anak kecil

## 11. Background
Parallax:
1. Langit
2. Gedung
3. Pepohonan
4. Jalan
5. Dekorasi Wedding

Transisi:
- Siang
- Sunset
- Malam
- Golden Wedding Night

## 12. Score
- Bertambah otomatis.
- Highscore disimpan di Local Storage.

## 13. Milestone

| Score | Event |
|-------:|-------|
|200|🎉 Lamaran berhasil!|
|400|💍 Tanggal pernikahan ditentukan.|
|600|💌 Undangan digital selesai.|
|800|👨‍👩‍👧 Keluarga ikut membantu.|
|1000|✨ Hari akad tiba.|
|1200|❤️ SAH!|
|1500|🎊 Resepsi dimulai.|

## 14. Game Over
Tampilkan:
- Animasi karakter
- "Perjalananmu terhenti."
- Tombol:
  - Main Lagi
  - Buka Undangan

## 15. Ending
- Confetti
- Nama mempelai
- Tombol **Buka Undangan**

## 16. Audio
- Background music
- Jump
- Milestone
- Game over
- Victory
- Mute

## 17. Difficulty
- 0–300: Sangat mudah
- 300–700: Mudah
- 700–1000: Sedang
- 1000–1500: Sulit
- 1500+: Sangat sulit

## 18. Customization
Admin dapat mengubah:
- Nama
- Foto
- Warna
- Musik
- Obstacle
- Milestone
- Link undangan

## 19. Performance
- Target 60 FPS
- Loading < 2 detik
- Maksimal 5 MB
- Mendukung Chrome, Safari, Edge, Firefox

## 20. Tech Stack
- HTML5 Canvas
- CSS
- JavaScript
- Local Storage
- Phaser.js (opsional)

## 21. Roadmap
- Leaderboard
- Power-up
- Multiplayer bergantian
- Hadiah digital
- Integrasi RSVP

## UX Recommendation
Jangan memaksa pengguna bermain sebelum membuka undangan. Tampilkan dua tombol:
- 💌 Buka Undangan
- 🎮 Mainkan Wedding Run
