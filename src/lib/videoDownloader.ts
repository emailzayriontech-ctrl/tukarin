import { createServerFn } from "@tanstack/react-start";

export type CobaltResponse = {
  status: "error" | "redirect" | "stream" | "success" | "rate-limit" | "picker";
  text?: string;
  url?: string;
  pickerType?: "various" | "images";
  picker?: {
    type: "photo" | "video" | "gif";
    url: string;
    thumb?: string;
  }[];
  audio?: string;
};

export const downloadVideo = createServerFn({ method: "POST" })
  .validator((url: string) => url)
  .handler(async ({ data: url }) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const key = `vid_dl_${today}`;
      
      // Fetch directly without CORS proxy since this runs on the server
      const getRes = await fetch(`https://api.counterapi.dev/v1/tukarin/${key}`);
      
      let count = 0;
      if (getRes.ok) {
        const data = await getRes.json();
        count = data.value || 0;
      }

      if (count >= 30) {
        throw new Error(`Limit global harian tercapai. Sudah ${count} video yang diunduh hari ini oleh pengguna Tukar.in. Coba lagi besok!`);
      }

      // If allowed, increment it
      fetch(`https://api.counterapi.dev/v1/tukarin/${key}/up`).catch(() => {});

      // Call Cobalt API directly from the server
      const response = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" // Avoid blocks
        },
        body: JSON.stringify({
          url: url,
          vQuality: "1080",
          filenamePattern: "classic",
          isNoTTWatermark: true,
          isAudioOnly: false
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Layanan sedang sibuk (Rate Limit). Silakan coba lagi nanti.");
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.text || "Terjadi kesalahan saat memproses link video. Mungkin diblokir oleh platform.");
      }

      const data = (await response.json()) as CobaltResponse;
      
      if (data.status === "error") {
        throw new Error(data.text || "Gagal mendapatkan video.");
      }

      return data;
    } catch (e: any) {
      throw new Error(e.message || "Gagal menghubungi server unduhan.");
    }
  });
