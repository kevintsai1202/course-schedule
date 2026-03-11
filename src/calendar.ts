import type { Course } from "./types";
import { escapeHtml, formatDayNumber, formatMonthLabel, toDate } from "./utils";

interface CalendarDay {
  date: Date;
  isoDate: string;
  courses: Course[];
}

/**
 * 依課程日期建立月曆資料，讓首頁可呈現簡潔的活動檔期板。
 */
function buildCalendarDays(courses: Course[]): CalendarDay[] {
  const dayMap = new Map<string, CalendarDay>();

  for (const course of courses) {
    const startDate = toDate(course.startAt);
    const isoDate = startDate.toISOString().slice(0, 10);
    const existingDay = dayMap.get(isoDate);

    if (existingDay) {
      existingDay.courses.push(course);
      continue;
    }

    dayMap.set(isoDate, {
      date: startDate,
      isoDate,
      courses: [course]
    });
  }

  return [...dayMap.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
}

/**
 * 渲染月曆區塊 HTML，提供日期導覽與課程數量提示。
 */
export function renderCalendar(courses: Course[]): string {
  const days = buildCalendarDays(courses);

  if (days.length === 0) {
    return `
      <section class="calendar-panel">
        <div class="section-heading">
          <span class="section-kicker">月曆檢視</span>
          <h2>近期沒有可報名活動</h2>
        </div>
      </section>
    `;
  }

  const monthLabel = formatMonthLabel(days[0].date);
  const dayMarkup = days
    .map((day) => {
      const items = day.courses
        .map((course) => `<li><a href="#${escapeHtml(course.id)}">${escapeHtml(course.title)}</a></li>`)
        .join("");

      return `
        <article class="calendar-day">
          <div class="calendar-day__number">${formatDayNumber(day.date)}</div>
          <div class="calendar-day__body">
            <p class="calendar-day__count">${day.courses.length} 場活動</p>
            <ul>${items}</ul>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="calendar-panel" aria-labelledby="calendar-title">
      <div class="section-heading">
        <span class="section-kicker">月曆檢視</span>
        <h2 id="calendar-title">${escapeHtml(monthLabel)} 活動安排</h2>
      </div>
      <div class="calendar-grid">
        ${dayMarkup}
      </div>
    </section>
  `;
}

