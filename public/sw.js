/**
 * SERVICE WORKER — VERSI REKOMENDASI
 * ------------------------------------------------
 * Prinsip yang dipakai di sini:
 * 1. CACHE_VERSION di-generate otomatis oleh build script (lihat instruksi di bawah),
 *    jadi kamu TIDAK PERNAH lupa ganti versi manual lagi.
 * 2. skipWaiting() + clients.claim() dipanggil otomatis -> SW baru langsung aktif.
 * 3. HTML/navigasi selalu network-first -> user selalu dapat versi terbaru selama online.
 * 4. Asset statis (JS/CSS/gambar) pakai stale-while-revalidate -> tetap cepat & auto update.
 * 5. Cache lama otomatis dibersihkan saat SW baru aktif.
 */

// __BUILD_VERSION__ akan diganti otomatis oleh build script tiap deploy.
// Kalau kamu belum setup build script, ganti manual string di bawah tiap deploy
// (misal pakai tanggal: "2026-07-11-1")
const CACHE_VERSION = "__BUILD_VERSION__";
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// Asset yang aman untuk di-precache (jangan masukkan index.html/"/" di sini)
const PRECACHE_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png"
];

// ---------- INSTALL ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // SW baru langsung siap dipakai, tidak menunggu tab lama ditutup
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key); // hapus semua cache versi lama
            }
          })
        )
      )
      .then(() => self.clients.claim()) // ambil alih semua tab yang sedang terbuka
  );
});

// ---------- FETCH ----------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (
    request.url.includes("chrome-extension") ||
    request.url.includes("webpack") ||
    request.url.includes("vite") ||
    request.url.includes("__l5e")
  ) {
    return;
  }

  // HTML / navigasi -> NETWORK FIRST
  // Supaya app-shell selalu up to date selama online.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Asset lain (biasanya sudah punya hash unik per build) -> STALE WHILE REVALIDATE
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
