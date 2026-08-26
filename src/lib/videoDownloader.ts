import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

export type RapidApiResponse = {
  status: "success" | "error";
  title?: string;
  url?: string;
  error?: string;
};

// In-memory rate limiting (IP -> { count, date })
const ipLimits = new Map<string, { count: number; date: string }>();

function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export const downloadVideo = createServerFn({ method: "POST" })
  .validator((url: string) => url)
  .handler(async ({ data: url }) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // IP Rate Limiting (Limit: 3 per IP per day)
      let ip = "unknown";
      try {
        ip = getRequestIP() || "unknown";
      } catch (e) {
        // Ignored
      }

      if (ip !== "unknown") {
        const record = ipLimits.get(ip);
        if (record && record.date === today) {
          if (record.count >= 3) {
            throw new Error("Batas gratis harian (3 video per IP) telah tercapai untuk hari ini. Silakan coba lagi besok.");
          }
          record.count += 1;
        } else {
          ipLimits.set(ip, { count: 1, date: today });
        }
      }

      // Check if it's a YouTube URL
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error("Format tautan tidak didukung. Harap masukkan tautan video YouTube yang valid.");
      }

      const apiKey = process.env.RAPIDAPI_KEY || "a604f11378msha41c3f66d9a3c0dp1b80a7jsn499ce8b99b43";

      // Memanggil RapidAPI Endpoint YouTube v3
      const apiUrl = `https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details?videoId=${videoId}&urlAccess=proxied&renderableFormats=720p%2Chighres&getTranscript=false`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "social-media-video-downloader.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data dari server API. Kuota RapidAPI mungkin telah habis atau tautan tidak dapat diakses.");
      }

      const data = await response.json();
      
      let videoUrl = "";
      if (data.contents && data.contents.length > 0) {
        const videos = data.contents[0].videos;
        if (videos && videos.length > 0) {
            // Cari kualitas 720p atau 1080p, jika tidak ada ambil yang pertama
            const bestVideo = videos.find((v: any) => v.label === "720p" || v.label === "1080p") || videos[0];
            videoUrl = bestVideo.url;
        }
      }

      if (!videoUrl) {
        throw new Error("Tautan unduhan video tidak ditemukan dari respons server.");
      }

      return {
        status: "success",
        title: data.title || "YouTube Video",
        url: videoUrl,
      } as RapidApiResponse;

    } catch (e: any) {
      throw new Error(e.message || "Gagal memproses unduhan video.");
    }
  });
