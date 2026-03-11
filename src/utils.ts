import type { Course } from "./types";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const DAY_NUMBER_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  day: "numeric"
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("zh-TW", {
  month: "long",
  year: "numeric"
});

/**
 * 將 ISO 時間字串轉為 Date 物件，集中處理前端日期運算。
 */
export function toDate(value: string): Date {
  return new Date(value);
}

/**
 * 將課程開始與結束時間格式化為適合卡片顯示的文字。
 */
export function formatDateRange(course: Pick<Course, "startAt" | "endAt">): string {
  const start = toDate(course.startAt);
  const end = toDate(course.endAt);
  return `${DATE_TIME_FORMATTER.format(start)} - ${DATE_TIME_FORMATTER.format(end)}`;
}

/**
 * 將價格轉為展示文字，統一免費與付費課程表現。
 */
export function formatPrice(price: number): string {
  if (price === 0) {
    return "免費";
  }

  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

/**
 * 產出卡片簡述，優先使用大綱，沒有時退回內容。
 */
export function summarizeCourse(course: Pick<Course, "outline" | "content">): string {
  const source = course.outline.trim() || course.content.trim();
  return source.length > 72 ? `${source.slice(0, 72)}…` : source;
}

/**
 * 依課程時間排序，讓最近活動排在前面。
 */
export function sortCoursesByStartAt(courses: Course[]): Course[] {
  return [...courses].sort((left, right) => {
    return toDate(left.startAt).getTime() - toDate(right.startAt).getTime();
  });
}

/**
 * 根據資料中的焦點 ID 取得課程，若無則回退到第一筆。
 */
export function pickFeaturedCourse(courses: Course[], featuredCourseId: string | null): Course | null {
  if (courses.length === 0) {
    return null;
  }

  return courses.find((course) => course.id === featuredCourseId) ?? courses[0];
}

/**
 * 將日期轉為月曆標示使用的月份標題。
 */
export function formatMonthLabel(date: Date): string {
  return MONTH_LABEL_FORMATTER.format(date);
}

/**
 * 取得月曆格上要顯示的日期數字。
 */
export function formatDayNumber(date: Date): string {
  return DAY_NUMBER_FORMATTER.format(date);
}

/**
 * 將純文字換行轉為 HTML 段落，便於呈現課程說明。
 */
export function formatMultilineText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/**
 * 避免使用者輸入文字直接插入 HTML 造成結構或安全問題。
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

