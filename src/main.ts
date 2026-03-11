import "./style.css";
import { fetchSiteData } from "./api";
import { renderApp } from "./render";

const appElement = document.querySelector<HTMLDivElement>("#app");

/**
 * 顯示錯誤畫面，避免資料載入失敗時整頁空白。
 */
function renderError(message: string): void {
  if (!appElement) {
    return;
  }

  appElement.innerHTML = `
    <main class="page-shell">
      <section class="error-panel">
        <p class="section-kicker">資料載入失敗</p>
        <h1>目前無法取得課程資料</h1>
        <p>${message}</p>
      </section>
    </main>
  `;
}

/**
 * 初始化首頁，載入資料後完成整體渲染。
 */
async function bootstrap(): Promise<void> {
  if (!appElement) {
    return;
  }

  try {
    const siteData = await fetchSiteData();
    appElement.innerHTML = renderApp(siteData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    renderError(message);
  }
}

void bootstrap();

