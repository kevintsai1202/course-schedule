import { describe, expect, it } from "vitest";
import { formatPrice, summarizeCourse } from "../src/utils";

describe("formatPrice", () => {
  it("將 0 顯示為免費", () => {
    expect(formatPrice(0)).toBe("免費");
  });

  it("將正整數顯示為台幣格式", () => {
    expect(formatPrice(1800)).toBe("NT$ 1,800");
  });
});

describe("summarizeCourse", () => {
  it("優先使用課程大綱作為摘要", () => {
    expect(
      summarizeCourse({
        outline: "這是課程大綱",
        content: "這是課程內容"
      })
    ).toBe("這是課程大綱");
  });
});
