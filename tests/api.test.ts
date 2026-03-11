import { describe, expect, it, vi, afterEach } from "vitest";
import { buildSiteDataUrl, fetchSiteData } from "../src/api";

const MOCK_SITE_DATA = {
  generatedAt: "2026-03-12T13:00:00+08:00",
  timezone: "Asia/Taipei",
  featuredCourseId: "issue-6",
  courses: []
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api", () => {
  it("會建立帶版本參數的課程資料網址", () => {
    expect(buildSiteDataUrl("issue-6")).toBe("./course-data.json?v=issue-6");
  });

  it("載入課程資料時會避開快取", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_SITE_DATA
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSiteData();

    expect(result).toEqual(MOCK_SITE_DATA);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\.\/course-data\.json\?v=/),
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json"
        }
      })
    );
  });
});
