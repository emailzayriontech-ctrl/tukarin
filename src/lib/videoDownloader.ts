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

function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/(?:instagram\.com\/(?:p|reel|reels)\/)([\w-]+)/i);
  return match ? match[1] : null;
}

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

export const downloadVideo = createServerFn({ method: "POST" })
  .validator((url: string) => url)
  .handler(async ({ data: url }) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const trimmedUrl = url.trim();

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

      // Check supported platform
      const ytId = extractYouTubeVideoId(trimmedUrl);
      const igCode = extractInstagramShortcode(trimmedUrl);
      const isTikTok = isTikTokUrl(trimmedUrl);

      let apiUrl = "";
      let platformName = "";

      if (ytId) {
        apiUrl = `https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details?videoId=${ytId}&urlAccess=proxied&renderableFormats=720p%2Chighres&getTranscript=false`;
        platformName = "YouTube Video";
      } else if (igCode) {
        apiUrl = `https://social-media-video-downloader.p.rapidapi.com/instagram/v3/media/post/details?shortcode=${igCode}`;
        platformName = "Instagram Reel";
      } else if (isTikTok) {
        apiUrl = `https://social-media-video-downloader.p.rapidapi.com/tiktok/v3/post/details?url=${encodeURIComponent(trimmedUrl)}`;
        platformName = "TikTok Video";
      } else {
        throw new Error("Format tautan tidak didukung. Harap masukkan tautan video YouTube, Instagram (Reels/Post), atau TikTok yang valid.");
      }

      const apiKey = process.env.RAPIDAPI_KEY || "a604f11378msha41c3f66d9a3c0dp1b80a7jsn499ce8b99b43";

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
          const bestVideo = videos.find((v: any) => v.label === "720p" || v.label === "1080p") || videos[0];
          videoUrl = bestVideo.url || bestVideo.link;
        }
      } else if (data.url) {
        videoUrl = data.url;
      } else if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.data?.videoUrl) {
        videoUrl = data.data.videoUrl;
      }

      if (!videoUrl) {
        throw new Error("Tautan unduhan video tidak ditemukan. Pastikan akun tidak diprivat dan video publik.");
      }

      return {
        status: "success",
        title: data.title || data.caption || platformName,
        url: videoUrl,
      } as RapidApiResponse;

    } catch (e: any) {
      throw new Error(e.message || "Gagal memproses unduhan video.");
    }
  });
