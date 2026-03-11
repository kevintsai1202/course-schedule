import { describe, expect, it } from "vitest";
import {
  buildIssueBody,
  deriveSiteUrl,
  normalizeCoursePayload,
  validateCoursePayload
} from "../scripts/lib/course-issue-template.mjs";

const validPayload = {
  title: "AI 自動化免費講座",
  outline: "帶你看 GitHub Actions 與自動化流程",
  content: "介紹課程案例與示範流程",
  startAt: "2026-03-20 19:00",
  endAt: "2026-03-20 21:00",
  price: 0,
  notes: "名額有限",
  signupUrl: "https://example.com",
  imageUrl: "https://github.com/user-attachments/assets/example"
};

describe("normalizeCoursePayload", () => {
  it("會將 price 正規化為數字", () => {
    expect(
      normalizeCoursePayload({
        ...validPayload,
        price: "0"
      }).price
    ).toBe(0);
  });
});

describe("buildIssueBody", () => {
  it("會產出符合 parser 規格的 issue body", () => {
    const body = buildIssueBody(validPayload);
    expect(body).toContain("### 課程大綱");
    expect(body).toContain("### 圖片");
    expect(body).toContain("![cover](https://github.com/user-attachments/assets/example)");
  });
});

describe("validateCoursePayload", () => {
  it("合法 payload 可通過本地驗證", () => {
    const result = validateCoursePayload(validPayload, "kevintsai1202", ["kevintsai1202"]);
    expect(result.ok).toBe(true);
  });
});

describe("deriveSiteUrl", () => {
  it("project repo 會轉成 owner.github.io/repo", () => {
    expect(deriveSiteUrl("kevintsai1202/course-schedule")).toBe(
      "https://kevintsai1202.github.io/course-schedule/"
    );
  });
});

