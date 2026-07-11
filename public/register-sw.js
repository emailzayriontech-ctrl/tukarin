/**
 * PWA REGISTER — pasang script ini di index.html atau entry file utama (app.js/main.js)
 * Wajib dipasang bareng sw.js supaya update SW benar-benar terasa oleh user
 * (auto reload begitu versi baru terdeteksi).
 */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Cek update setiap kali halaman dibuka
      registration.update();

      // Cek update berkala (tiap 30 menit) — berguna untuk PWA yang
      // dibuka dari home screen dan jarang di-refresh manual
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);
    });

    // Begitu SW baru selesai ambil alih (clients.claim), reload otomatis 1x
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
