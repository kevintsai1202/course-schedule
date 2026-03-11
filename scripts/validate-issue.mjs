import fs from "node:fs";
import process from "node:process";
import { buildFailureComment } from "./lib/comment-builder.mjs";
import { LABELS, VALIDATION_COMMENT_MARKER } from "./lib/constants.mjs";
import { deleteIssueCommentByMarker, replaceIssueLabels, upsertIssueComment } from "./lib/github.mjs";
import { validateIssue } from "./lib/issue-validator.mjs";

/**
 * 解析允許發布帳號設定，支援逗號分隔的 GitHub 帳號清單。
 */
function getAllowedPublishers() {
  return (process.env.ALLOWED_PUBLISHERS ?? "")
    .split(",")
    .map((publisher) => publisher.trim())
    .filter(Boolean);
}

/**
 * 從 GitHub event payload 取得目前處理中的 issue 資料。
 */
function readIssueFromEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventPath) {
    throw new Error("缺少 GITHUB_EVENT_PATH。");
  }

  const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));

  if (!payload.issue) {
    throw new Error("目前事件不含 issue 資料。");
  }

  return payload.issue;
}

/**
 * 計算下一版應套用到 issue 的標籤集合。
 */
function buildNextLabels(existingLabels, validationPassed) {
  const filteredLabels = existingLabels.filter((label) => !Object.values(LABELS).includes(label));

  if (validationPassed) {
    return [...filteredLabels, LABELS.publishReady];
  }

  return [...filteredLabels, LABELS.needsFix];
}

/**
 * 執行單一 issue 驗證，並同步標籤與系統留言。
 */
async function main() {
  const issue = readIssueFromEvent();
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventAction = process.env.GITHUB_EVENT_ACTION;
  const existingLabels = (issue.labels ?? []).map((label) => label.name);

  if (eventName === "issues" && eventAction === "closed") {
    const nextLabels = existingLabels.filter((label) => !Object.values(LABELS).includes(label));
    await replaceIssueLabels(issue.number, nextLabels);
    await deleteIssueCommentByMarker(issue.number, VALIDATION_COMMENT_MARKER);
    console.log(`Issue #${issue.number} 已關閉，驗證標籤已清除。`);
    return;
  }

  const validationResult = validateIssue(issue, getAllowedPublishers());
  const nextLabels = buildNextLabels(existingLabels, validationResult.ok);

  await replaceIssueLabels(issue.number, nextLabels);

  if (validationResult.ok) {
    await deleteIssueCommentByMarker(issue.number, VALIDATION_COMMENT_MARKER);
    console.log(`Issue #${issue.number} 驗證通過。`);
    return;
  }

  await upsertIssueComment(
    issue.number,
    VALIDATION_COMMENT_MARKER,
    buildFailureComment(validationResult.errors)
  );

  console.log(`Issue #${issue.number} 驗證失敗。`);
}

await main();

