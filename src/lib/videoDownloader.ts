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

      // 2. Gunakan RapidAPI (All Social Media Video Downloader / keepsaveit)
      const encodedUrl = encodeURIComponent(url);
      const apiUrl = `https://all-social-media-video-downloader.p.rapidapi.com/video?url=${encodedUrl}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "x-rapidapi-host": "all-social-media-video-downloader.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data dari API. Pastikan kuota gratis RapidAPI belum habis atau API Key valid.");
      }

      const data = await response.json();

      // Fleksibel menangani berbagai format respons dari berbagai API di RapidAPI
      let videoUrl = "";
      if (data.links && data.links.length > 0) {
        const bestLink = data.links.find((l: any) => l.quality?.toLowerCase().includes("hd") || l.quality?.toLowerCase().includes("1080")) || data.links[0];
        videoUrl = bestLink.link || bestLink.url;
      } else if (data.url) {
        videoUrl = data.url;
      } else if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.data && data.data.videoUrl) {
        videoUrl = data.data.videoUrl;
      } else if (data.result && data.result.url) {
        videoUrl = data.result.url;
      }

      if (!videoUrl) {
        throw new Error("Video tidak ditemukan atau format link dari API tidak didukung.");
      }

      // Catat penambahan kuota setelah sukses
      fetch(`https://api.counterapi.dev/v1/tukarin/${key}/up`).catch(() => {});

      return {
        status: "success",
        title: data.title || "Video Download",
        url: videoUrl,
      } as RapidApiResponse;

    } catch (e: any) {
      throw new Error(e.message || "Gagal menghubungi server unduhan.");
    }
  });
