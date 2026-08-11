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

// Returns whether we are under the global limit of 30 downloads today.
export async function checkAndIncrementGlobalLimit(): Promise<{ allowed: boolean; currentCount: number }> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const key = `vid_dl_${today}`;
    
    // First, check the current count
    const getUrl = encodeURIComponent(`https://api.counterapi.dev/v1/tukarin/${key}?t=${Date.now()}`);
    const getRes = await fetch(`https://api.allorigins.win/raw?url=${getUrl}`);
    
    let count = 0;
    if (getRes.ok) {
      const data = await getRes.json();
      count = data.value || 0;
    }

    if (count >= 30) {
      return { allowed: false, currentCount: count };
    }

    // If allowed, increment it
    const upUrl = encodeURIComponent(`https://api.counterapi.dev/v1/tukarin/${key}/up?t=${Date.now()}`);
    fetch(`https://api.allorigins.win/raw?url=${upUrl}`).catch(() => {});

    return { allowed: true, currentCount: count + 1 };
  } catch (error) {
    // If the counter API fails, we fail open (allow download) to not ruin UX, 
    // but log the error.
    console.error("Failed to check global limit", error);
    return { allowed: true, currentCount: -1 };
  }
}

export async function downloadVideo(url: string): Promise<CobaltResponse> {
  const limitCheck = await checkAndIncrementGlobalLimit();
  
  if (!limitCheck.allowed) {
    throw new Error(`Limit global harian tercapai. Sudah ${limitCheck.currentCount} video yang diunduh hari ini oleh pengguna Tukar.in. Coba lagi besok!`);
  }

  const response = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: url,
      vQuality: "1080", // Try to get 1080p if available
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
    throw new Error(errData.text || "Terjadi kesalahan saat memproses link video.");
  }

  const data = (await response.json()) as CobaltResponse;
  
  if (data.status === "error") {
    throw new Error(data.text || "Gagal mendapatkan video.");
  }

  return data;
}
