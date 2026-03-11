# Todo List

## 任務狀態

| ID | 任務 | 狀態 | 備註 |
| --- | --- | --- | --- |
| T1 | 建立與完成 `spec.md`、`api.md`、`todolist.md` | Completed | 文件已建立完成 |
| T2 | 初始化前端專案骨架與靜態資料模型 | Completed | 已完成骨架與範例資料 |
| T3 | 實作課程首頁、月曆檢視與收折卡片 | Completed | 首頁與收折卡片已完成 |
| T4 | 建立 Issue Form 與模板設定 | Completed | 已建立固定課程發文格式 |
| T5 | 實作 Issue 驗證、標籤狀態機與資料產生腳本 | Completed | 驗證與 JSON 產生腳本已完成 |
| T6 | 建立 GitHub Actions 與 GitHub Pages 部署 | Completed | issue / push 皆可重建部署 |
| T7 | 補齊測試、範例資料與驗證命令 | Completed | 測試與 build 均已通過 |
| T8 | 初始化 Git、建立 GitHub Repo 並推送主分支 | Completed | Repo、Pages、變數與標籤已建立 |
| T9 | 建立測試 Issue 並驗證發布流程 | Completed | 已驗證上架、網站顯示與關閉後下架流程 |
| T10 | 建立專案技能以直接發布課程 Issue | Completed | 技能、腳本、測試與端到端驗證已完成 |
| T11 | 更新技能為讀取 course 目錄並寫入發布紀錄 | Completed | 已支援本地 course 目錄、公開資產同步與發布紀錄 |
| T12 | 將既有課程 markdown 轉為 frontmatter 並更新技能說明 | Completed | 已完成新格式轉換規則與技能文件更新 |
| T13 | 修正首頁課程資料快取導致需手動強制重新整理 | Completed | 已加入 cache-busting、no-store 與測試 |
| T14 | 修正 `.gitignore` 誤傷公開課程圖片資產 | Completed | 已改為只忽略根目錄 `/course/` 並完成實際發布驗證 |

## 執行紀錄

- 2026-03-12：建立初版任務拆分，開始進行 T1。
- 2026-03-12：完成 T1，開始進行 T2。
- 2026-03-12：完成 T2、T3，測試與建置通過，開始進行 T4。
- 2026-03-12：完成 T4、T5、T6、T7，整體測試與建置再次通過。
- 2026-03-12：開始進行 T8，準備建立 GitHub repo 並推送主分支。
- 2026-03-12：完成 T8，已建立 GitHub repo、推送主分支並成功部署 Pages。
- 2026-03-12：開始進行 T9，準備建立測試 Issue 驗證實際發布流程。
- 2026-03-12：完成 T9，已驗證 Issue 建立、發布、網站顯示與關閉後自動下架。
- 2026-03-12：開始進行 T10，準備建立可直接發佈課程 Issue 的專案技能。
- 2026-03-12：完成 T10，已建立技能、發布腳本，並完成 dry-run 與端到端測試。
- 2026-03-12：開始進行 T11，準備將技能改為讀取 course 目錄與發布紀錄。
- 2026-03-12：完成 T11，已驗證 course 目錄發布、圖片同步、上站與下架流程。
- 2026-03-12：開始進行 T12，準備將既有課程內容轉成 frontmatter 並補進技能說明。
- 2026-03-12：完成 T12，已將既有課程改為 frontmatter 格式，並補上技能中的舊格式轉換規則。
- 2026-03-12：開始進行 T13，準備修正首頁抓取 `course-data.json` 的快取問題。
- 2026-03-12：完成 T13，已為首頁課程資料請求加入 cache-busting 與 no-store，並補上測試。
- 2026-03-12：開始進行 T14，準備修正 `.gitignore` 對 `public/published-assets/**/image/course/` 的誤判。
- 2026-03-12：完成 T14，已修正 `.gitignore` 範圍並以 `spring-ai-free` 實際發布驗證通過。
