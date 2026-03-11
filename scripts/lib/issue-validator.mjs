import { parseIssue } from "./issue-parser.mjs";

/**
 * 檢查字串是否為合法 HTTP/HTTPS URL。
 */
export function isValidHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 驗證課程 issue 是否符合白名單與欄位規格。
 */
export function validateIssue(issue, allowedPublishers) {
  const errors = [];
  const allowedSet = new Set(allowedPublishers.map((publisher) => publisher.toLowerCase()));
  const parsed = parseIssue(issue);
  const author = parsed.course.createdBy.toLowerCase();

  if (!allowedSet.has(author)) {
    errors.push(`作者 ${parsed.course.createdBy} 不在允許發布名單中。`);
  }

  if (!parsed.course.title) {
    errors.push("Issue 標題不可空白。");
  }

  for (const missingField of parsed.missingFields) {
    errors.push(`缺少欄位：${missingField}。`);
  }

  if (!parsed.course.startAt) {
    errors.push("開始時間格式錯誤，需為 YYYY-MM-DD HH:mm。");
  }

  if (!parsed.course.endAt) {
    errors.push("結束時間格式錯誤，需為 YYYY-MM-DD HH:mm。");
  }

  if (parsed.course.startAt && parsed.course.endAt) {
    const start = new Date(parsed.course.startAt);
    const end = new Date(parsed.course.endAt);

    if (end.getTime() <= start.getTime()) {
      errors.push("結束時間必須晚於開始時間。");
    }
  }

  if (!Number.isFinite(parsed.course.price)) {
    errors.push("售價需為數字，免費請填 0。");
  }

  if (!isValidHttpUrl(parsed.course.signupUrl)) {
    errors.push("報名連結需為合法的 http 或 https 網址。");
  }

  if (!isValidHttpUrl(parsed.course.imageUrl)) {
    errors.push("圖片欄位需提供可解析的圖片網址或 GitHub 附件 markdown。");
  }

  return {
    ok: errors.length === 0,
    errors,
    parsedCourse: errors.length === 0 ? parsed.course : null
  };
}

