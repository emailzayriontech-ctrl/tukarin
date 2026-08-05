export type UsageStats = {
  totalRuns: number;
  totalFiles: number;
  toolCounts: Record<string, { runs: number; files: number }>;
};

const STORAGE_KEY = "tukar-in-usage-statistics";

export function getUsageStats(): UsageStats {
  if (typeof window === "undefined") {
    return { totalRuns: 0, totalFiles: 0, toolCounts: {} };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { totalRuns: 0, totalFiles: 0, toolCounts: {} };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { totalRuns: 0, totalFiles: 0, toolCounts: {} };
  }
}

export function trackUsage(toolSlug: string, fileCount: number = 1) {
  if (typeof window === "undefined") return;

  const stats = getUsageStats();
  stats.totalRuns += 1;
  stats.totalFiles += fileCount;

  if (!stats.toolCounts[toolSlug]) {
    stats.toolCounts[toolSlug] = { runs: 0, files: 0 };
  }
  stats.toolCounts[toolSlug].runs += 1;
  stats.toolCounts[toolSlug].files += fileCount;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

  // Increment the global counter anonymously
  for (let idx = 0; idx < fileCount; idx++) {
    fetch("https://api.counterapi.dev/v1/tukarin/global_files/up").catch(() => {});
  }

  // Dispatch a custom event to notify components (like index.tsx) of the update
  window.dispatchEvent(new Event("tukar-in-usage-updated"));
}

const GLOBAL_BASE_SEED = 100;

export async function getGlobalFileCount(): Promise<number> {
  try {
    const res = await fetch("https://api.counterapi.dev/v1/tukarin/global_files");
    if (!res.ok) return GLOBAL_BASE_SEED;
    const data = await res.json();
    return (data.value || 0) + GLOBAL_BASE_SEED;
  } catch {
    return GLOBAL_BASE_SEED;
  }
}
