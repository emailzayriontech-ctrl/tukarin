import { createServerFn } from "@tanstack/react-start";

export type RapidApiResponse = {
  status: "success" | "error";
  title?: string;
  url?: string; // The highest quality video link
  error?: string;
};

export const downloadVideo = createServerFn({ method: "POST" })
  .validator((url: string) => url)
  .handler(async ({ data: url }) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const key = `vid_dl_${today}`;
      
      // 1. Cek Limit Global (30 per hari)
      const getRes = await fetch(`https://api.counterapi.dev/v1/tukarin/${key}`);
      let count = 0;
      if (getRes.ok) {
        const data = await getRes.json();
        count = data.value || 0;
      }

      if (count >= 30) {
        throw new Error(`Limit global harian tercapai. Sudah ${count} video yang diunduh hari ini oleh pengguna Tukar.in. Coba lagi besok!`);
      }

      // Pastikan API Key tersedia
      const apiKey = process.env.RAPIDAPI_KEY;
      if (!apiKey) {
        throw new Error("Sistem belum dikonfigurasi. Harap tambahkan RAPIDAPI_KEY di environment variables (pengaturan hosting/Lovable).");
      }

      // 2. Gunakan RapidAPI (Social Media Video Downloader)
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `https://social-media-video-downloader.p.rapidapi.com/smvd/get/all?url=${encodedUrl}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "social-media-video-downloader.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data dari API. Pastikan kuota gratis RapidAPI belum habis.");
      }

      const data = await response.json();

      // RapidAPI ini mengembalikan array 'links' dengan berbagai kualitas
      if (!data.links || data.links.length === 0) {
        throw new Error("Video tidak ditemukan atau format link tidak didukung.");
      }

      // Ambil link video kualitas terbaik (biasanya item pertama atau yang ada tulisan 'hd')
      const bestLink = data.links.find((l: any) => l.quality?.toLowerCase().includes("hd") || l.quality?.toLowerCase().includes("1080")) || data.links[0];

      // Catat penambahan kuota setelah sukses
      fetch(`https://api.counterapi.dev/v1/tukarin/${key}/up`).catch(() => {});

      return {
        status: "success",
        title: data.title || "Video Download",
        url: bestLink.link,
      } as RapidApiResponse;

    } catch (e: any) {
      throw new Error(e.message || "Gagal menghubungi server unduhan.");
    }
  });
