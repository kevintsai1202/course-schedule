import { validateIssue } from "./issue-validator.mjs";

export const DEFAULT_COURSE_REPOSITORY = "kevintsai1202/course-schedule";
export const DEFAULT_SITE_URL = "https://kevintsai1202.github.io/course-schedule/";

/**
 * 將課程輸入整理為固定欄位，降低後續組 issue body 時的分支複雜度。
 */
export function normalizeCoursePayload(payload) {
  return {
    title: String(payload.title ?? "").trim(),
    outline: String(payload.outline ?? "").trim(),
    content: String(payload.content ?? "").trim(),
    startAt: String(payload.startAt ?? "").trim(),
    endAt: String(payload.endAt ?? "").trim(),
    price: Number(payload.price ?? Number.NaN),
    notes: String(payload.notes ?? "").trim(),
    signupUrl: String(payload.signupUrl ?? "").trim(),
    imageUrl: String(payload.imageUrl ?? "").trim()
  };
}

/**
 * 依專案既有 parser 契約組成合法 issue body。
 */
export function buildIssueBody(payload) {
  const normalized = normalizeCoursePayload(payload);

  return [
    "### 課程大綱",
    normalized.outline,
    "",
    "### 課程內容",
    normalized.content,
    "",
    "### 開始時間",
    normalized.startAt,
    "",
    "### 結束時間",
    normalized.endAt,
    "",
    "### 售價",
    Number.isFinite(normalized.price) ? String(normalized.price) : "",
    "",
    "### 其他備註",
    normalized.notes,
    "",
    "### 報名連結",
    normalized.signupUrl,
    "",
    "### 圖片",
    `![cover](${normalized.imageUrl})`
  ].join("\n");
}

/**
 * 建立與 workflow 驗證器相容的 issue-like 物件，先在本地驗證格式。
 */
export function buildIssueDraft(payload, authorLogin) {
  const normalized = normalizeCoursePayload(payload);

  return {
    number: 0,
    title: normalized.title,
    body: buildIssueBody(normalized),
    updated_at: new Date().toISOString(),
    user: {
      login: authorLogin
    },
    labels: []
  };
}

/**
 * 使用既有驗證器先檢查 payload，確保發出前就符合 repo 規則。
 */
export function validateCoursePayload(payload, authorLogin, allowedPublishers) {
  const draftIssue = buildIssueDraft(payload, authorLogin);
  return validateIssue(draftIssue, allowedPublishers);
}

/**
 * 根據 repository 名稱推導 GitHub Pages 網址，可由環境變數覆蓋。
 */
export function deriveSiteUrl(repository) {
  if (process.env.COURSE_SITE_URL) {
    return process.env.COURSE_SITE_URL;
  }

  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    return DEFAULT_SITE_URL;
  }

  if (repo.endsWith(".github.io")) {
    return `https://${repo}/`;
  }

  return `https://${owner}.github.io/${repo}/`;
}

