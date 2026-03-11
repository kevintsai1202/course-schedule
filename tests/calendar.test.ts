import { describe, expect, it } from "vitest";
import { renderCalendar } from "../src/calendar";
import type { Course } from "../src/types";

function createCourse(overrides: Partial<Course>): Course {
  return {
    id: "issue-1",
    issueNumber: 1,
    title: "測試課程",
    outline: "測試大綱",
    content: "測試內容",
    startAt: "2026-03-27T19:00:00+08:00",
    endAt: "2026-03-27T20:00:00+08:00",
    price: 0,
    notes: "",
    signupUrl: "https://example.com",
    imageUrl: "https://example.com/cover.png",
    isFree: true,
    createdBy: "tester",
    labels: ["publish-ready"],
    updatedAt: "2026-03-12T00:00:00Z",
    ...overrides
  };
}

describe("renderCalendar", () => {
  it("會依月份分組顯示活動", () => {
    const html = renderCalendar([
      createCourse({
        id: "issue-7",
        issueNumber: 7,
        title: "三月活動",
        startAt: "2026-03-27T19:00:00+08:00",
        endAt: "2026-03-27T20:00:00+08:00"
      }),
      createCourse({
        id: "issue-9",
        issueNumber: 9,
        title: "四月活動",
        startAt: "2026-04-11T09:00:00+08:00",
        endAt: "2026-04-11T17:00:00+08:00"
      })
    ]);

    expect(html).toContain("活動安排");
    expect(html).toContain("2026年3月");
    expect(html).toContain("2026年4月");
    expect(html).toContain("三月活動");
    expect(html).toContain("四月活動");
  });
});
