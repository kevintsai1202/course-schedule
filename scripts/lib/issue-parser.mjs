import { FIELD_TITLES, TAIPEI_OFFSET } from "./constants.mjs";

const SECTION_PATTERN = /^###\s+(.+?)\r?\n([\s\S]*?)(?=^###\s+.+?\r?\n|$)/gm;

/**
 * 將 Issue body 依 `### 欄位名稱` 區段切開，轉成易於驗證的物件。
 */
export function extractSections(body = "") {
  const sections = {};

  for (const match of body.matchAll(SECTION_PATTERN)) {
    const [, rawTitle, rawValue] = match;
    sections[rawTitle.trim()] = rawValue.trim();
  }

  return sections;
}

/**
 * 從圖片欄位取出 markdown 中的圖片 URL，若無 markdown 則接受純 URL。
 */
export function extractImageUrl(value = "") {
  const markdownMatch = value.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i);

  if (markdownMatch) {
    return markdownMatch[1];
  }

  const urlMatch = value.match(/https?:\/\/\S+/i);
  return urlMatch ? urlMatch[0] : "";
}

/**
 * 解析單一課程 issue，整理出後續驗證與輸出的標準結構。
 */
export function parseIssue(issue) {
  const sections = extractSections(issue.body ?? "");
  const missingFields = FIELD_TITLES.filter((fieldTitle) => !(fieldTitle in sections));
  const imageUrl = extractImageUrl(sections["圖片"] ?? "");
  const labels = (issue.labels ?? []).map((label) => (typeof label === "string" ? label : label.name));

  const startAt = toTaipeiIsoString(sections["開始時間"] ?? "");
  const endAt = toTaipeiIsoString(sections["結束時間"] ?? "");
  const price = Number(sections["售價"] ?? Number.NaN);

  return {
    missingFields,
    sections,
    course: {
      id: `issue-${issue.number}`,
      issueNumber: issue.number,
      title: issue.title?.trim() ?? "",
      outline: sections["課程大綱"] ?? "",
      content: sections["課程內容"] ?? "",
      startAt,
      endAt,
      price,
      notes: sections["其他備註"] ?? "",
      signupUrl: (sections["報名連結"] ?? "").trim(),
      imageUrl,
      isFree: price === 0,
      createdBy: issue.user?.login ?? "",
      labels,
      updatedAt: issue.updated_at ?? new Date().toISOString()
    }
  };
}

/**
 * 將 `YYYY-MM-DD HH:mm` 轉為固定台北時區 ISO 字串，失敗時回傳空字串。
 */
export function toTaipeiIsoString(value = "") {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/);

  if (!match) {
    return "";
  }

  const [, datePart, timePart] = match;
  return `${datePart}T${timePart}:00${TAIPEI_OFFSET}`;
}

