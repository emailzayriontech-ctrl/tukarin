export type VideoCompressPreset = "high" | "medium" | "low" | "custom";

export type VideoCompressOptions = {
  preset?: VideoCompressPreset;
  maxDimension?: number; // e.g. 1920 (1080p), 1280 (720p), 854 (480p), 640 (360p), or 0 for original
  targetBitrateKbps?: number; // in kbps (e.g. 1000 = 1Mbps)
  targetMB?: number; // optional target size in MB
  fps?: number; // default 30
  outputFormat?: "auto" | "video/mp4" | "video/webm";
  onProgress?: (progress: {
    percent: number;
    currentTime: number;
    duration: number;
    elapsedSec: number;
    etaSec: number | null;
  }) => void;
  signal?: AbortSignal;
};

export type VideoCompressResult = {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  duration: number;
  originalSize: number;
  compressedSize: number;
};

export function getSupportedVideoMimeType(preferred?: "auto" | "video/mp4" | "video/webm"): string {
  if (typeof MediaRecorder === "undefined") {
    return "video/webm";
  }

  const mp4Types = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs="avc1.4d401f,mp4a.40.2"',
    "video/mp4;codecs=avc1",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];

  const webmTypes = [
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm;codecs=h264",
    "video/webm",
  ];

  if (preferred === "video/mp4") {
    for (const type of mp4Types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
  } else if (preferred === "video/webm") {
    for (const type of webmTypes) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
  }

  // Auto: Prefer MP4 if supported, else WebM
  for (const type of mp4Types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  for (const type of webmTypes) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return "video/webm";
}

export async function compressVideoFile(
  file: File,
  options: VideoCompressOptions = {},
): Promise<VideoCompressResult> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.src = videoUrl;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    let audioCtx: AudioContext | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let animFrameId: number | null = null;
    let isAborted = false;

    const cleanup = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
        } catch {
          // ignore
        }
      }
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {
        // ignore
      }
      if (audioCtx && audioCtx.state !== "closed") {
        try {
          audioCtx.close();
        } catch {
          // ignore
        }
      }
      URL.revokeObjectURL(videoUrl);
    };

    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        isAborted = true;
        cleanup();
        reject(new Error("Kompresi video dibatalkan."));
      });
    }

    video.onerror = () => {
      cleanup();
      reject(new Error("Format file video tidak dapat diputar atau rusak. Pastikan video valid."));
    };

    video.onloadedmetadata = async () => {
      try {
        const origWidth = video.videoWidth || 1280;
        const origHeight = video.videoHeight || 720;
        const duration = video.duration || 1;

        // Calculate Target Dimensions
        let maxDim = options.maxDimension || 0;
        let targetBitrateKbps = options.targetBitrateKbps || 0;

        if (options.preset === "high") {
          // Kompresi Ekstrem (Ukuran Sangat Kecil): 480p / 360p, ~700 kbps
          maxDim = 854;
          targetBitrateKbps = 750;
        } else if (options.preset === "medium" || !options.preset) {
          // Kompresi Sedang (Rekomendasi): 720p HD, ~1600 kbps
          maxDim = 1280;
          targetBitrateKbps = 1600;
        } else if (options.preset === "low") {
          // Kompresi Ringan (Kualitas Tinggi): 1080p, ~3200 kbps
          maxDim = 1920;
          targetBitrateKbps = 3200;
        }

        // If target size in MB is set, calculate bitrate from duration
        if (options.targetMB && options.targetMB > 0) {
          const totalBits = options.targetMB * 8 * 1024 * 1024;
          const calculatedBitrateKbps = Math.max(300, Math.floor((totalBits / duration) / 1024) - 96);
          targetBitrateKbps = calculatedBitrateKbps;
        }

        let width = origWidth;
        let height = origHeight;

        if (maxDim > 0 && (width > maxDim || height > maxDim)) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // Even dimensions are required for H.264 / VP8 / VP9 encoders
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });

        if (!ctx) {
          cleanup();
          reject(new Error("Gagal menginisialisasi canvas grafis peramban."));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const fps = options.fps || (duration > 60 ? 25 : 30);
        const canvasStream = canvas.captureStream(fps);

        // Audio Stream Setup with silent speaker routing
        let audioTracks: MediaStreamTrack[] = [];
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            sourceNode = audioCtx.createMediaElementSource(video);
            const destNode = audioCtx.createMediaStreamDestination();
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0; // Silent to speaker

            sourceNode.connect(destNode);
            sourceNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            audioTracks = destNode.stream.getAudioTracks();
          }
        } catch {
          // If Web Audio creates error (e.g. cross-origin), try direct captureStream
          try {
            if ((video as any).captureStream) {
              audioTracks = (video as any).captureStream().getAudioTracks();
            } else if ((video as any).mozCaptureStream) {
              audioTracks = (video as any).mozCaptureStream().getAudioTracks();
            }
          } catch {
            // ignore
          }
        }

        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks,
        ]);

        const mimeType = getSupportedVideoMimeType(options.outputFormat);
        const videoBitsPerSecond = Math.max(300_000, targetBitrateKbps * 1000);
        const audioBitsPerSecond = 128_000;

        try {
          mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond,
            audioBitsPerSecond,
          });
        } catch {
          // Fallback basic MediaRecorder
          mediaRecorder = new MediaRecorder(combinedStream);
        }

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        const startTime = Date.now();
        let lastReport = 0;

        const reportProgress = (currentTime: number) => {
          if (!options.onProgress || isAborted) return;
          const now = Date.now();
          if (now - lastReport < 100 && currentTime < duration) return;
          lastReport = now;

          const elapsedSec = Math.max(0.1, (now - startTime) / 1000);
          const percent = Math.min(99, Math.round((currentTime / duration) * 100));
          const playbackSpeed = currentTime / elapsedSec;
          const remainingTime = duration - currentTime;
          const etaSec = playbackSpeed > 0 && remainingTime > 0 ? Math.ceil(remainingTime / playbackSpeed) : null;

          options.onProgress({
            percent,
            currentTime,
            duration,
            elapsedSec: Math.floor(elapsedSec),
            etaSec,
          });
        };

        mediaRecorder.onstop = () => {
          if (isAborted) return;
          const finalMime = mimeType.includes("mp4") ? "video/mp4" : "video/webm";
          const blob = new Blob(chunks, { type: finalMime });

          const dotIdx = file.name.lastIndexOf(".");
          const baseName = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
          const ext = finalMime === "video/mp4" ? "mp4" : "webm";
          const filename = `${baseName}.${ext}`;

          if (options.onProgress) {
            const totalElapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
            options.onProgress({
              percent: 100,
              currentTime: duration,
              duration,
              elapsedSec: totalElapsed,
              etaSec: 0,
            });
          }

          cleanup();
          resolve({
            blob,
            filename,
            width,
            height,
            duration,
            originalSize: file.size,
            compressedSize: blob.size,
          });
        };

        const renderLoop = () => {
          if (video.paused || video.ended || isAborted) return;
          ctx.drawImage(video, 0, 0, width, height);
          reportProgress(video.currentTime);
          animFrameId = requestAnimationFrame(renderLoop);
        };

        video.onended = () => {
          if (mediaRecorder && mediaRecorder.state === "recording") {
            // Draw last frame
            ctx.drawImage(video, 0, 0, width, height);
            setTimeout(() => {
              try {
                mediaRecorder?.stop();
              } catch {
                // ignore
              }
            }, 200);
          }
        };

        mediaRecorder.start(250); // Slice chunks every 250ms

        // Start playback (playbackRate 1.5x - 2.0x speeds up the compression process)
        video.playbackRate = 1.5;
        video.volume = 0.001; // Silent

        await video.play();
        renderLoop();

      } catch (err: any) {
        cleanup();
        reject(new Error(err?.message || "Gagal memproses video."));
      }
    };
  });
}
