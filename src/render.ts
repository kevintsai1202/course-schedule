import type { Course, SiteData } from "./types";
import { renderMarkdown } from "./markdown";
import { renderCalendar } from "./calendar";
import {
  escapeHtml,
  formatDateRange,
  formatPrice,
  pickFeaturedCourse,
  sortCoursesByStartAt,
  summarizeCourse
} from "./utils";

/**
 * 組裝整個首頁 HTML，統一管理焦點區、月曆與課程清單輸出。
 */
export function renderApp(siteData: SiteData): string {
  const courses = sortCoursesByStartAt(siteData.courses);
  const featuredCourse = pickFeaturedCourse(courses, siteData.featuredCourseId);

  return `
    <main class="page-shell">
      <section class="hero-panel">
        <div class="hero-panel__intro">
          <p class="hero-panel__eyebrow">Kevin Schedule Board</p>
          <h1>凱文大叔課程與免費講座</h1>
          <p class="hero-panel__lead">
            用一頁掌握近期可報名活動。預設只看重點資訊，點開卡片再展開完整課綱、內容與備註。
          </p>
        </div>
        ${renderFeaturedCourse(featuredCourse)}
      </section>
      ${renderCalendar(courses)}
      ${renderCourseSection(courses)}
      <footer class="page-footer">
        <p>資料更新時間：${escapeHtml(new Date(siteData.generatedAt).toLocaleString("zh-TW"))}</p>
      </footer>
    </main>
  `;
}

/**
 * 渲染首頁焦點課程，優先展示最近且可報名的一場活動。
 */
function renderFeaturedCourse(course: Course | null): string {
  if (!course) {
    return `
      <article class="featured-course featured-course--empty">
        <span class="section-kicker">近期焦點</span>
        <h2>目前沒有可報名活動</h2>
        <p>你之後新增並通過驗證的課程，會自動出現在這裡。</p>
      </article>
    `;
  }

  return `
    <article class="featured-course">
      <div class="featured-course__media">
        <img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(course.title)}" class="featured-course__image" />
      </div>
      <div class="featured-course__content">
        <div class="featured-course__topline">
          <span class="section-kicker">近期焦點</span>
          <span class="featured-course__type">${course.isFree ? "免費講座" : "付費課程"}</span>
        </div>
        <h2>${escapeHtml(course.title)}</h2>
        <div class="featured-course__meta-row">
          <p class="featured-course__meta">${escapeHtml(formatDateRange(course))}</p>
          <span class="price-chip">${escapeHtml(formatPrice(course.price))}</span>
        </div>
        <p class="featured-course__summary">${escapeHtml(summarizeCourse(course))}</p>
        <div class="featured-course__actions">
          <span class="featured-course__hint">完整內容可在下方課程卡展開查看</span>
          <a class="cta-button" href="${escapeHtml(course.signupUrl)}" target="_blank" rel="noreferrer">立即報名</a>
        </div>
      </div>
    </article>
  `;
}

/**
 * 渲染課程清單，卡片預設收折，展開後顯示完整內容。
 */
function renderCourseSection(courses: Course[]): string {
  if (courses.length === 0) {
    return `
      <section class="course-section">
        <div class="section-heading">
          <span class="section-kicker">課程清單</span>
          <h2>目前沒有可報名活動</h2>
        </div>
      </section>
    `;
  }

  const courseCards = courses.map((course) => renderCourseCard(course)).join("");

  return `
    <section class="course-section" aria-labelledby="course-list-title">
      <div class="section-heading">
        <span class="section-kicker">課程清單</span>
        <h2 id="course-list-title">預設只顯示重點，點開看完整內容</h2>
      </div>
      <div class="course-grid">
        ${courseCards}
      </div>
    </section>
  `;
}

/**
 * 渲染單張課程卡片，使用 details/summary 讓收折互動保留原生可及性。
 */
function renderCourseCard(course: Course): string {
  return `
    <details class="course-card" id="${escapeHtml(course.id)}">
      <summary class="course-card__summary" aria-label="展開 ${escapeHtml(course.title)} 課程資訊">
        <div class="course-card__image-wrap">
          <img src="${escapeHtml(course.imageUrl)}" alt="${escapeHtml(course.title)}" class="course-card__image" />
        </div>
        <div class="course-card__quick">
          <div class="course-card__topline">
            <span class="course-card__tag">${course.isFree ? "免費講座" : "付費課程"}</span>
            <span class="price-chip">${escapeHtml(formatPrice(course.price))}</span>
          </div>
          <h3>${escapeHtml(course.title)}</h3>
          <p class="course-card__meta">${escapeHtml(formatDateRange(course))}</p>
          <p class="course-card__excerpt">${escapeHtml(summarizeCourse(course))}</p>
          <div class="course-card__controls">
            <span class="course-card__hint">點擊展開完整內容</span>
            <a class="text-link" href="${escapeHtml(course.signupUrl)}" target="_blank" rel="noreferrer">報名連結</a>
          </div>
        </div>
      </summary>
      <div class="course-card__detail">
        <section>
          <h4>課程大綱</h4>
          <div class="course-markdown">${renderMarkdown(course.outline)}</div>
        </section>
        <section>
          <h4>課程內容</h4>
          <div class="course-markdown">${renderMarkdown(course.content)}</div>
        </section>
        <section>
          <h4>其他備註</h4>
          <div class="course-markdown">${renderMarkdown(course.notes || "目前沒有其他備註。")}</div>
        </section>
      </div>
    </details>
  `;
}
