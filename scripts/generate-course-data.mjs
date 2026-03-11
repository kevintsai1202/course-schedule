import fs from "node:fs";
import path from "node:path";
import { LABELS } from "./lib/constants.mjs";
import { listRepositoryIssues } from "./lib/github.mjs";
import { buildSiteData, isUpcomingCourse, mergeCurrentIssue, readCurrentIssueFromEvent } from "./lib/site-data-builder.mjs";
import { validateIssue } from "./lib/issue-validator.mjs";

/**
 * 解析允許發布帳號，避免未授權 issue 混入網站資料。
 */
function getAllowedPublishers() {
  return (process.env.ALLOWED_PUBLISHERS ?? "")
    .split(",")
    .map((publisher) => publisher.trim())
    .filter(Boolean);
}

/**
 * 將資料寫入 public 目錄，供 Vite 在 build 時直接帶入靜態輸出。
 */
function writeCourseDataFile(siteData) {
  const outputPath = path.resolve(process.cwd(), "public", "course-data.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(siteData, null, 2)}\n`, "utf8");
}

/**
 * 從 GitHub Issue 抓取並過濾可發布課程，輸出為靜態 JSON。
 */
async function main() {
  const allowedPublishers = getAllowedPublishers();
  const listedIssues = await listRepositoryIssues({
    state: "open",
    labels: LABELS.publishReady
  });
  const issues = mergeCurrentIssue(listedIssues, readCurrentIssueFromEvent(), allowedPublishers);
  const courses = [];

  for (const issue of issues) {
    const validationResult = validateIssue(issue, allowedPublishers);

    if (!validationResult.ok || !validationResult.parsedCourse) {
      continue;
    }

    if (!isUpcomingCourse(validationResult.parsedCourse)) {
      continue;
    }

    courses.push(validationResult.parsedCourse);
  }

  const siteData = buildSiteData(courses);
  writeCourseDataFile(siteData);
  console.log(`已輸出 ${courses.length} 筆課程資料。`);
}

await main();
