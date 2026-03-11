import type { SiteData } from "./types";

/**
 * 建立帶有版本參數的課程資料 URL，降低 GitHub Pages 舊快取命中機率。
 */
export function buildSiteDataUrl(versionToken: string = Date.now().toString()): string {
  return `./course-data.json?v=${encodeURIComponent(versionToken)}`;
}

/**
 * 載入由 GitHub Actions 產出的課程資料 JSON。
 */
export async function fetchSiteData(): Promise<SiteData> {
  const response = await fetch(buildSiteDataUrl(), {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("無法載入課程資料。");
  }

  return (await response.json()) as SiteData;
}
