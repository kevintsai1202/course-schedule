import { describe, expect, it } from "vitest";
import { mergeCurrentIssue } from "../scripts/lib/site-data-builder.mjs";

function buildIssue(overrides = {}) {
  return {
    number: 99,
    title: "[測試勿報名] Issue 自動發布驗證",
    state: "open",
    updated_at: "2026-03-12T12:00:00Z",
    user: {
      login: "kevintsai1202"
    },
    labels: [],
    body: `### 課程大綱
測試

### 課程內容
測試

### 開始時間
2026-03-30 19:00

### 結束時間
2026-03-30 21:00

### 售價
0

### 其他備註
測試

### 報名連結
https://example.com/test-course

### 圖片
![cover](https://example.com/cover.png)
`,
    ...overrides
  };
}

describe("mergeCurrentIssue", () => {
  it("當前 issue 驗證通過且列表尚未同步時，應補進 issue 清單", () => {
    const result = mergeCurrentIssue([], buildIssue(), ["kevintsai1202"]);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(99);
    expect(result[0].labels).toEqual([{ name: "publish-ready" }]);
  });

  it("若 issue 已存在於列表中，則不重複加入", () => {
    const existing = buildIssue({
      labels: [{ name: "publish-ready" }]
    });
    const result = mergeCurrentIssue([existing], buildIssue(), ["kevintsai1202"]);

    expect(result).toHaveLength(1);
  });
});
