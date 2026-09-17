import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

export type VideoFormatOption = {
  label: string;
  displayName: string;
  url: string;
  size?: string;
  bytes?: number;
  isAudioOnly?: boolean;
  badge?: string;
};

export type RapidApiResponse = {
  status: "success" | "error";
  title?: string;
  thumbnail?: string;
  author?: string;
  duration?: string;
  url?: string;
  formats?: VideoFormatOption[];
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
        apiUrl = `https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details?videoId=${ytId}&urlAccess=proxied&renderableFormats=1080p%2C720p%2C480p%2C360p%2Chighres&getTranscript=false`;
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
      
      const formats: VideoFormatOption[] = [];
      let defaultVideoUrl = "";

      if (data.contents && data.contents.length > 0) {
        const videos = data.contents[0].videos || [];
        const audios = data.contents[0].audios || [];

        // Resolution sorting priority
        const priorityOrder = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"];
        const formatMap = new Map<string, any>();

        for (const v of videos) {
          const videoLink = v.url || v.link;
          if (!videoLink) continue;
          const label = v.label;
          if (!label) continue;
          const isMp4 = v.metadata?.mime_type?.includes("mp4") || !v.metadata?.mime_type?.includes("webm");

          if (!formatMap.has(label)) {
            formatMap.set(label, v);
          } else if (isMp4 && !formatMap.get(label).metadata?.mime_type?.includes("mp4")) {
            formatMap.set(label, v);
          }
        }

        for (const res of priorityOrder) {
          if (formatMap.has(res)) {
            const v = formatMap.get(res);
            const size = v.metadata?.content_length_text || (v.metadata?.content_length ? `${(v.metadata.content_length / (1024 * 1024)).toFixed(1)} MB` : undefined);
            
            let displayName = res;
            let badge: string | undefined;
            if (res === "2160p") { displayName = "2160p (4K Ultra HD)"; badge = "4K UHD"; }
            else if (res === "1440p") { displayName = "1440p (2K QHD)"; badge = "2K"; }
            else if (res === "1080p") { displayName = "1080p (Full HD)"; badge = "Kualitas Terbaik"; }
            else if (res === "720p") { displayName = "720p (HD)"; badge = "Rekomendasi"; }
            else if (res === "480p") { displayName = "480p (SD)"; badge = "Hemat Kuota"; }
            else if (res === "360p") { displayName = "360p (Standar)"; }

            const targetUrl = v.url || v.link;
            if (!defaultVideoUrl && (res === "720p" || res === "1080p")) {
              defaultVideoUrl = targetUrl;
            }

            formats.push({
              label: res,
              displayName,
              url: targetUrl,
              size,
              bytes: v.metadata?.content_length,
              badge,
              isAudioOnly: false,
            });
          }
        }

        // Add remaining formats if any
        for (const [key, v] of formatMap.entries()) {
          if (!priorityOrder.includes(key)) {
            formats.push({
              label: key,
              displayName: key,
              url: v.url || v.link,
              size: v.metadata?.content_length_text,
              bytes: v.metadata?.content_length,
              isAudioOnly: false,
            });
          }
        }

        // Audio format option
        if (audios && audios.length > 0) {
          const bestAudio = audios.find((a: any) => a.url) || audios[0];
          if (bestAudio && (bestAudio.url || bestAudio.link)) {
            formats.push({
              label: "Audio",
              displayName: "Audio Saja (M4A / Musik)",
              url: bestAudio.url || bestAudio.link,
              size: bestAudio.metadata?.content_length_text,
              bytes: bestAudio.metadata?.content_length,
              badge: "Musik",
              isAudioOnly: true,
            });
          }
        }
      }

      // Fallback single video URLs (Instagram / TikTok / Direct)
      let singleUrl = "";
      if (data.url) {
        singleUrl = data.url;
      } else if (data.video_url) {
        singleUrl = data.video_url;
      } else if (data.data?.videoUrl) {
        singleUrl = data.data.videoUrl;
      }

      if (formats.length === 0 && singleUrl) {
        formats.push({
          label: "HD",
          displayName: "Video HD (Original)",
          url: singleUrl,
          badge: "Kualitas Asli",
          isAudioOnly: false,
        });
      }

      const finalUrl = defaultVideoUrl || formats[0]?.url || singleUrl;

      if (!finalUrl && formats.length === 0) {
        throw new Error("Tautan unduhan video tidak ditemukan. Pastikan akun tidak diprivat dan video publik.");
      }

      const title = data.metadata?.title || data.title || data.caption || platformName;
      const thumbnail = data.metadata?.thumbnailUrl || data.thumbnail || data.cover;
      const author = data.metadata?.author?.name || data.author?.name || data.uploader;
      const rawDuration = data.metadata?.additionalData?.duration || data.duration;
      const duration = rawDuration
        ? `${Math.floor(rawDuration / 60)}:${String(rawDuration % 60).padStart(2, "0")}`
        : undefined;

      return {
        status: "success",
        title,
        thumbnail,
        author,
        duration,
        url: finalUrl,
        formats,
      } as RapidApiResponse;

    } catch (e: any) {
      throw new Error(e.message || "Gagal memproses unduhan video.");
    }
  });
