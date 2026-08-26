import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";

export type RapidApiResponse = {
  status: "success" | "fallback" | "error";
  title?: string;
  url?: string;
  fallbackUrl?: string;
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
      
      // Fallback URL (SaveFrom.net)
      const saveFromUrl = `https://sfrom.net/${url.trim()}`;

      // IP Rate Limiting (Limit: 3 per IP per day)
      let ip = "unknown";
      try {
        ip = getRequestIP() || "unknown";
      } catch (e) {
        // Ignored, fallback to unknown
      }

      if (ip !== "unknown") {
        const record = ipLimits.get(ip);
        if (record && record.date === today) {
          if (record.count >= 3) {
            // Limit tercapai, arahkan ke fallback
            return {
              status: "fallback",
              fallbackUrl: saveFromUrl
            } as RapidApiResponse;
          }
          record.count += 1;
        } else {
          ipLimits.set(ip, { count: 1, date: today });
        }
      }

      // Check if it's a YouTube URL
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        // Not YouTube -> use fallback immediately
        return {
          status: "fallback",
          fallbackUrl: saveFromUrl
        } as RapidApiResponse;
      }

      const apiKey = process.env.RAPIDAPI_KEY || "a604f11378msha41c3f66d9a3c0dp1b80a7jsn499ce8b99b43";
      if (!apiKey) {
        return {
          status: "fallback",
          fallbackUrl: saveFromUrl
        } as RapidApiResponse;
      }

      // Memanggil RapidAPI Endpoint sesuai request pengguna
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
        // Jika API error (misal quota habis), gunakan fallback
        return {
          status: "fallback",
          fallbackUrl: saveFromUrl
        } as RapidApiResponse;
      }

      const data = await response.json();
      
      let videoUrl = "";
      if (data.contents && data.contents.length > 0) {
        // Ambil hasil video pertama yang tersedia
        const videos = data.contents[0].videos;
        if (videos && videos.length > 0) {
            // Cari kualitas tertinggi, prioritas 720p
            const bestVideo = videos.find((v: any) => v.label === "720p" || v.label === "1080p") || videos[0];
            videoUrl = bestVideo.url;
        }
      }

      if (!videoUrl) {
        return {
          status: "fallback",
          fallbackUrl: saveFromUrl
        } as RapidApiResponse;
      }

      return {
        status: "success",
        title: data.title || "YouTube Video",
        url: videoUrl,
      } as RapidApiResponse;

    } catch (e: any) {
      // Jika terjadi kesalahan fatal, selalu fallback
      return {
        status: "fallback",
        fallbackUrl: `https://sfrom.net/${url.trim()}`
      } as RapidApiResponse;
    }
  });
