import { describe, expect, it } from "vitest";
import { validateIssue } from "../scripts/lib/issue-validator.mjs";

function buildIssue(overrides = {}) {
  return {
    number: 8,
    title: "課程網站自動化實戰",
    updated_at: "2026-03-12T12:00:00Z",
    user: {
      login: "kevintsai"
    },
    labels: [],
    body: `### 課程大綱
自動更新網站

### 課程內容
完整示範 issue 驗證與部署

### 開始時間
2026-03-20 19:00

### 結束時間
2026-03-20 21:00

### 售價
1200

### 其他備註
附投影片

### 報名連結
https://example.com

### 圖片
![cover](https://example.com/cover.png)
`,
    ...overrides
  };
}

describe("validateIssue", () => {
  it("合法 issue 可通過驗證", () => {
    const result = validateIssue(buildIssue(), ["kevintsai"]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("非白名單作者會被擋下", () => {
    const result = validateIssue(
      buildIssue({
        user: {
          login: "other-user"
        }
      }),
      ["kevintsai"]
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("不在允許發布名單");
  });

  it("結束時間早於開始時間時不可發布", () => {
    const result = validateIssue(
      buildIssue({
        body: `### 課程大綱
自動更新網站

### 課程內容
完整示範 issue 驗證與部署

### 開始時間
2026-03-20 21:00

### 結束時間
2026-03-20 19:00

### 售價
1200

### 其他備註
附投影片

### 報名連結
https://example.com

### 圖片
![cover](https://example.com/cover.png)
`
      }),
      ["kevintsai"]
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("結束時間必須晚於開始時間。");
  });
});
