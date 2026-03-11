import fs from "node:fs";
import path from "node:path";
import { LABELS } from "./lib/constants.mjs";
import { listRepositoryIssues, replaceIssueLabels } from "./lib/github.mjs";

/**
 * 讀取目前站點資料，取得本次部署實際採用的課程 issue 編號。
 */
function readPublishedIssueNumbers() {
  const filePath = path.resolve(process.cwd(), "public", "course-data.json");
  const content = fs.readFileSync(filePath, "utf8");
  const siteData = JSON.parse(content);

  return new Set(siteData.courses.map((course) => course.issueNumber));
}

/**
 * 根據最新輸出的課程資料同步 published 標籤。
 */
async function main() {
  const publishedIssueNumbers = readPublishedIssueNumbers();
  const issues = await listRepositoryIssues({
    state: "open"
  });

  for (const issue of issues) {
    const labels = issue.labels.map((label) => label.name);
    const baseLabels = labels.filter((label) => label !== LABELS.published);
    const shouldHavePublished = publishedIssueNumbers.has(issue.number);
    const nextLabels = shouldHavePublished ? [...baseLabels, LABELS.published] : baseLabels;

    if (labels.length === nextLabels.length && labels.every((label) => nextLabels.includes(label))) {
      continue;
    }

    await replaceIssueLabels(issue.number, nextLabels);
  }
}

await main();
