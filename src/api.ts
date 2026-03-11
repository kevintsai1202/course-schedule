import type { SiteData } from "./types";

/**
 * 載入由 GitHub Actions 產出的課程資料 JSON。
 */
export async function fetchSiteData(): Promise<SiteData> {
  const response = await fetch("./course-data.json", {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("無法載入課程資料。");
  }

  return (await response.json()) as SiteData;
}

