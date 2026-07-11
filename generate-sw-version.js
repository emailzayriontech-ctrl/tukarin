import fs from "fs";
import path from "path";

const swPath = path.resolve("public/sw.js");

try {
  if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, "utf8");
    const newCacheName = `tukar-in-cache-${Date.now()}`;
    
    // Replace const CACHE_NAME = "..." with the timestamp version
    swContent = swContent.replace(/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "${newCacheName}";`);
    
    fs.writeFileSync(swPath, swContent, "utf8");
    console.log(`[PWA Builder] Updated Service Worker Cache Version to: ${newCacheName}`);
  } else {
    console.error(`[PWA Builder] Error: sw.js not found at ${swPath}`);
  }
} catch (error) {
  console.error("[PWA Builder] Error updating cache version:", error);
}
