import fs from "node:fs";
import process from "node:process";
import { DEFAULT_TIMEZONE, LABELS } from "./constants.mjs";
import { validateIssue } from "./issue-validator.mjs";

/**
 * 判斷課程是否尚未結束，超過結束時間即不輸出到網站。
 */
export function isUpcomingCourse(course) {
  return new Date(course.endAt).getTime() > Date.now();
}

/**
 * 讀取目前 workflow 的 issue event payload，讓剛驗證完成的當前 Issue 也能被納入資料計算。
 */
export function readCurrentIssueFromEvent() {
  if (process.env.GITHUB_EVENT_NAME !== "issues") {
    return null;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath || !fs.existsSync(eventPath)) {
    return null;
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
  return payload.issue ?? null;
}

/**
 * 將當前 issue 事件補進抓到的 issue 清單，避免同一輪 workflow 中標籤查詢尚未同步。
 */
export function mergeCurrentIssue(issues, currentIssue, allowedPublishers) {
  if (!currentIssue || currentIssue.state !== "open") {
    return issues;
  }

  const validationResult = validateIssue(currentIssue, allowedPublishers);

  if (!validationResult.ok) {
    return issues;
  }

  const exists = issues.some((issue) => issue.number === currentIssue.number);

  if (exists) {
    return issues;
  }

  return [
    ...issues,
    {
      ...currentIssue,
      labels: [
        ...(currentIssue.labels ?? []),
        {
          name: LABELS.publishReady
        }
      ]
    }
  ];
}

/**
 * 組裝最終網站 JSON，集中排序與焦點課程挑選規則。
 */
export function buildSiteData(courses) {
  const sortedCourses = [...courses].sort((left, right) => {
    return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
  });

  return {
    generatedAt: new Date().toISOString(),
    timezone: process.env.SITE_TIMEZONE ?? DEFAULT_TIMEZONE,
    featuredCourseId: sortedCourses[0]?.id ?? null,
    courses: sortedCourses
  };
}
