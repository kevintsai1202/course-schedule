import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getPublishedRecordPath,
  parseCourseDirectory,
  readPublishedRecord,
  writePublishedRecord
} from "../scripts/lib/course-directory-parser.mjs";

const createdDirectories = [];

function createCourseFixture() {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "course-dir-test-"));
  const courseDirectory = path.join(rootDirectory, "vibe-coding");
  const imageDirectory = path.join(courseDirectory, "image", "context");

  fs.mkdirSync(imageDirectory, {
    recursive: true
  });

  fs.writeFileSync(path.join(imageDirectory, "cover.png"), "fake-image", "utf8");
  fs.writeFileSync(
    path.join(courseDirectory, "course.md"),
    `---
title: Google Antigravity Vibe Coding 實戰工作坊
outline: 理解 Vibe Coding、Antigravity、Skills、MCP 與四個實作專案
startAt: 2026-04-18 09:00
endAt: 2026-04-19 17:00
price: 0
notes: 團報可享優惠
signupUrl: https://example.com
image: image/context/cover.png
---

這裡是課程介紹。

![封面](image/context/cover.png)
`,
    "utf8"
  );

  createdDirectories.push(rootDirectory);
  return courseDirectory;
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

describe("parseCourseDirectory", () => {
  it("會將相對圖片路徑改寫為 raw GitHub URL", () => {
    const courseDirectory = createCourseFixture();
    const result = parseCourseDirectory(courseDirectory, "kevintsai1202/course-schedule", "main");

    expect(result.payload.title).toBe("Google Antigravity Vibe Coding 實戰工作坊");
    expect(result.payload.imageUrl).toContain("https://raw.githubusercontent.com/kevintsai1202/course-schedule/main/");
    expect(result.payload.content).toContain("public/published-assets/vibe-coding/image/context/cover.png");
    expect(result.assetMappings).toHaveLength(1);
  });
});

describe("published record", () => {
  it("會寫入並讀回已發布紀錄", () => {
    const courseDirectory = createCourseFixture();
    const record = {
      issueNumber: 12,
      issueUrl: "https://github.com/kevintsai1202/course-schedule/issues/12",
      pageUrl: "https://kevintsai1202.github.io/course-schedule/",
      publishedAt: "2026-03-12T01:00:00Z",
      sourceMarkdown: "course/vibe-coding/course.md",
      repository: "kevintsai1202/course-schedule"
    };

    writePublishedRecord(courseDirectory, record);
    expect(fs.existsSync(getPublishedRecordPath(courseDirectory))).toBe(true);
    expect(readPublishedRecord(courseDirectory)).toEqual(record);
  });
});
