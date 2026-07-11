/**
 * generate-sw-version.js
 * ------------------------------------------------
 * Jalankan script ini SEBELUM deploy (misal di package.json "build" script).
 * Fungsinya: ganti placeholder __BUILD_VERSION__ di sw.js dengan versi unik
 * berdasarkan waktu build, jadi kamu TIDAK PERNAH lupa ganti versi manual.
 *
 * Cara pakai:
 * 1. Taruh file ini di root project (sejajar dengan package.json)
 * 2. Pastikan sw.js hasil (final) ada di folder output build kamu,
 *    misal "dist/sw.js" atau "build/sw.js" — sesuaikan path di bawah
 * 3. Tambahkan ke package.json:
 *      "scripts": {
 *        "build": "vite build && node generate-sw-version.js"
 *      }
 *    (ganti "vite build" sesuai build command project kamu)
 */

const fs = require("fs");
const path = require("path");

// Sesuaikan path ini dengan lokasi sw.js hasil build kamu
const SW_PATH = path.join(__dirname, "dist", "sw.js");

const version = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
// contoh hasil: 20260711153000

let content = fs.readFileSync(SW_PATH, "utf8");
content = content.replace(/__BUILD_VERSION__/g, version);
fs.writeFileSync(SW_PATH, content, "utf8");

console.log(`✅ sw.js versi di-set ke: ${version}`);
