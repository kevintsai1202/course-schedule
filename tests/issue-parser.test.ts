import { describe, expect, it } from "vitest";
import { extractImageUrl, parseIssue, toTaipeiIsoString } from "../scripts/lib/issue-parser.mjs";

describe("toTaipeiIsoString", () => {
  it("將指定格式時間轉為台北 ISO", () => {
    expect(toTaipeiIsoString("2026-03-20 19:00")).toBe("2026-03-20T19:00:00+08:00");
  });

  it("格式錯誤時回傳空字串", () => {
    expect(toTaipeiIsoString("2026/03/20 19:00")).toBe("");
  });
});

describe("extractImageUrl", () => {
  it("可從 markdown 圖片語法中取出網址", () => {
    expect(extractImageUrl("![cover](https://example.com/cover.png)")).toBe(
      "https://example.com/cover.png"
    );
  });
});

describe("parseIssue", () => {
  it("可將 issue body 轉成課程資料", () => {
    const result = parseIssue({
      number: 1,
      title: "AI 自動化免費講座",
      updated_at: "2026-03-12T12:00:00Z",
      user: {
        login: "kevintsai"
      },
      labels: [{ name: "publish-ready" }],
      body: `### 課程大綱
快速了解 GitHub Actions

### 課程內容
從 issue 到 Pages 自動更新

### 開始時間
2026-03-20 19:00

### 結束時間
2026-03-20 21:00

### 售價
0

### 其他備註
名額有限

### 報名連結
https://example.com

### 圖片
![cover](https://example.com/cover.png)
`
    });

    expect(result.missingFields).toHaveLength(0);
    expect(result.course.title).toBe("AI 自動化免費講座");
    expect(result.course.isFree).toBe(true);
    expect(result.course.imageUrl).toBe("https://example.com/cover.png");
  });
});

