import { createServerFn } from "@tanstack/react-start";
import { createQrDataUrl } from "./qrCodeGenerator";

export type ShortenerProvider = "auto" | "tinyurl" | "dagd" | "vgd" | "ulvis" | "clck";

export type ShortenUrlRequest = {
  url: string;
  provider?: ShortenerProvider;
  customAlias?: string;
};

export type ShortenUrlResult = {
  id: string;
  originalUrl: string;
  shortUrl: string;
  provider: string;
  providerLabel: string;
  createdAt: number;
  savingsPercent: number;
  customAlias?: string;
};

export type HistoryItem = ShortenUrlResult;

const HISTORY_STORAGE_KEY = "tukar-in-shorten-url-history";

/**
 * Normalizes input URL by adding https:// if protocol is missing and verifying validity.
 */
export function normalizeUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL tidak boleh kosong. Harap masukkan tautan.");
  }

  // Prepend https:// if no protocol provided
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      throw new Error(
        "Format URL tidak valid. Pastikan domain memiliki ekstensi yang benar (misal: google.com).",
      );
    }
    return parsed.toString();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Format URL")) throw err;
    throw new Error("Format tautan tidak valid. Harap periksa kembali URL Anda.");
  }
}

/**
 * Validates custom alias format.
 */
export function validateCustomAlias(alias?: string): string | undefined {
  if (!alias) return undefined;
  const trimmed = alias.trim();
  if (!trimmed) return undefined;

  if (trimmed.length < 3 || trimmed.length > 40) {
    throw new Error("Nama alias kustom harus memiliki panjang antara 3 hingga 40 karakter.");
  }

  if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    throw new Error(
      "Nama alias hanya boleh menggunakan huruf, angka, tanda strip (-), atau garis bawah (_).",
    );
  }

  return trimmed;
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 7000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Koneksi ke server pemendek tautan melebihi batas waktu (timeout). Silakan coba lagi.",
      );
    }
    throw err;
  }
}

// ================= Providers =================

async function shortenWithTinyUrl(url: string, alias?: string): Promise<string> {
  const endpoint = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}${alias ? `&alias=${encodeURIComponent(alias)}` : ""}`;
  const res = await fetchWithTimeout(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 TukarIn/1.0 (https://tukar.in)" },
  });
  const text = (await res.text()).trim();

  if (!res.ok || text === "Error" || !text.startsWith("http")) {
    if (alias) {
      throw new Error(
        `Nama alias "${alias}" sudah digunakan di TinyURL. Silakan coba nama alias lain.`,
      );
    }
    throw new Error("TinyURL tidak dapat memproses URL ini saat ini.");
  }
  return text;
}

async function shortenWithDaGd(url: string, alias?: string): Promise<string> {
  const endpoint = `https://da.gd/s?url=${encodeURIComponent(url)}${alias ? `&shorturl=${encodeURIComponent(alias)}` : ""}`;
  const res = await fetchWithTimeout(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 TukarIn/1.0 (https://tukar.in)" },
  });
  const text = (await res.text()).trim();

  if (!res.ok || !text.startsWith("http")) {
    if (alias && (res.status === 400 || text.toLowerCase().includes("taken"))) {
      throw new Error(`Nama alias "${alias}" sudah digunakan di da.gd. Silakan pilih nama lain.`);
    }
    throw new Error("da.gd tidak dapat memproses URL ini saat ini.");
  }
  return text;
}

async function shortenWithVGd(url: string, alias?: string): Promise<string> {
  const endpoint = `https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}${alias ? `&shorturl=${encodeURIComponent(alias)}` : ""}`;
  const res = await fetchWithTimeout(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 TukarIn/1.0 (https://tukar.in)" },
  });
  const text = (await res.text()).trim();

  if (!res.ok || !text.startsWith("http")) {
    if (alias && text.toLowerCase().includes("already")) {
      throw new Error(`Nama alias "${alias}" sudah digunakan di v.gd.`);
    }
    throw new Error("v.gd tidak dapat memproses URL ini saat ini.");
  }
  return text;
}

async function shortenWithUlvis(url: string, alias?: string): Promise<string> {
  const endpoint = `https://ulvis.net/API/write/get?url=${encodeURIComponent(url)}${alias ? `&custom=${encodeURIComponent(alias)}` : ""}&type=json`;
  const res = await fetchWithTimeout(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 TukarIn/1.0 (https://tukar.in)" },
  });
  const data = await res.json();

  if (data?.success && data?.data?.url) {
    return data.data.url;
  }
  throw new Error("ulvis.net tidak dapat memproses URL ini saat ini.");
}

async function shortenWithClck(url: string): Promise<string> {
  const endpoint = `https://clck.ru/--?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(endpoint, {
    headers: { "User-Agent": "Mozilla/5.0 TukarIn/1.0 (https://tukar.in)" },
  });
  const text = (await res.text()).trim();

  if (!res.ok || !text.startsWith("http")) {
    throw new Error("clck.ru tidak dapat memproses URL ini saat ini.");
  }
  return text;
}

/**
 * Server function to perform shortening without browser CORS limitations.
 */
export const shortenUrlServerFn = createServerFn({ method: "POST" })
  .validator((data: ShortenUrlRequest) => data)
  .handler(async ({ data }) => {
    const normalizedUrl = normalizeUrl(data.url);
    const alias = validateCustomAlias(data.customAlias);
    const provider = data.provider || "auto";

    let shortUrl = "";
    let usedProvider = provider;
    let providerLabel = "TinyURL";

    if (provider === "tinyurl") {
      shortUrl = await shortenWithTinyUrl(normalizedUrl, alias);
      usedProvider = "tinyurl";
      providerLabel = "TinyURL";
    } else if (provider === "dagd") {
      shortUrl = await shortenWithDaGd(normalizedUrl, alias);
      usedProvider = "dagd";
      providerLabel = "da.gd";
    } else if (provider === "vgd") {
      shortUrl = await shortenWithVGd(normalizedUrl, alias);
      usedProvider = "vgd";
      providerLabel = "v.gd";
    } else if (provider === "ulvis") {
      shortUrl = await shortenWithUlvis(normalizedUrl, alias);
      usedProvider = "ulvis";
      providerLabel = "ulvis.net";
    } else if (provider === "clck") {
      if (alias) {
        throw new Error(
          "Layanan clck.ru tidak mendukung nama alias kustom. Pilih layanan TinyURL atau da.gd.",
        );
      }
      shortUrl = await shortenWithClck(normalizedUrl);
      usedProvider = "clck";
      providerLabel = "clck.ru";
    } else {
      // AUTO mode
      if (alias) {
        // Try TinyURL first with alias, then da.gd, then ulvis
        try {
          shortUrl = await shortenWithTinyUrl(normalizedUrl, alias);
          usedProvider = "tinyurl";
          providerLabel = "TinyURL";
        } catch (e1: unknown) {
          try {
            shortUrl = await shortenWithDaGd(normalizedUrl, alias);
            usedProvider = "dagd";
            providerLabel = "da.gd";
          } catch (e2: unknown) {
            try {
              shortUrl = await shortenWithUlvis(normalizedUrl, alias);
              usedProvider = "ulvis";
              providerLabel = "ulvis.net";
            } catch {
              const msg =
                (e1 instanceof Error ? e1.message : null) ||
                (e2 instanceof Error ? e2.message : null) ||
                "Alias kustom gagal didaftarkan pada seluruh penyedia. Coba gunakan nama lain.";
              throw new Error(msg);
            }
          }
        }
      } else {
        // Auto without alias: fallback waterfall
        const attempts = [
          { name: "tinyurl", label: "TinyURL", fn: () => shortenWithTinyUrl(normalizedUrl) },
          { name: "dagd", label: "da.gd", fn: () => shortenWithDaGd(normalizedUrl) },
          { name: "vgd", label: "v.gd", fn: () => shortenWithVGd(normalizedUrl) },
          { name: "ulvis", label: "ulvis.net", fn: () => shortenWithUlvis(normalizedUrl) },
          { name: "clck", label: "clck.ru", fn: () => shortenWithClck(normalizedUrl) },
        ];

        let lastError: unknown = null;
        for (const attempt of attempts) {
          try {
            shortUrl = await attempt.fn();
            usedProvider = attempt.name;
            providerLabel = attempt.label;
            break;
          } catch (err: unknown) {
            lastError = err;
          }
        }

        if (!shortUrl) {
          throw new Error(
            (lastError instanceof Error ? lastError.message : null) ||
              "Semua server pemendek tautan sedang sibuk. Silakan coba beberapa saat lagi.",
          );
        }
      }
    }

    const origLen = normalizedUrl.length;
    const shortLen = shortUrl.length;
    const savingsPercent =
      origLen > shortLen ? Math.round(((origLen - shortLen) / origLen) * 100) : 0;

    const result: ShortenUrlResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      originalUrl: normalizedUrl,
      shortUrl,
      provider: usedProvider,
      providerLabel,
      createdAt: Date.now(),
      savingsPercent,
      customAlias: alias,
    };

    return result;
  });

/**
 * Helper to generate QR Code as Data URL (PNG)
 */
export async function generateQrCode(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    width?: number;
    margin?: number;
  } = {},
): Promise<string> {
  const { colorDark = "#0D1B2A", colorLight = "#FFFFFF", width = 500, margin = 2 } = options;
  return createQrDataUrl(text, {
    colorDark,
    colorLight,
    size: width,
    margin,
  });
}

/**
 * Downloads QR Code directly as PNG
 */
export function downloadQrImage(dataUrl: string, filename: string = "tukar-in-qrcode.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Local History Management
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveToHistory(item: HistoryItem): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getHistory();
    // Prepend and limit to 50 items
    const filtered = current.filter((h) => h.shortUrl !== item.shortUrl);
    const updated = [item, ...filtered].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeFromHistory(id: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getHistory();
    const updated = current.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
