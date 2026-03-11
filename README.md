# 凱文大叔課程檔期板

以 `GitHub Pages + GitHub Actions + GitHub Issue Forms` 建立的靜態課程清單網站。

## 本地開發

```powershell
npm install
npm run dev
```

## 本地測試

```powershell
npm test
npm run build
```

## GitHub 設定

1. 將專案推到 GitHub。
2. 到 `Settings > Pages`，將 `Build and deployment` 設為 `GitHub Actions`。
3. 到 `Settings > Secrets and variables > Actions > Variables`。
4. 新增 Repository Variable：`ALLOWED_PUBLISHERS`
5. 值填入允許發布課程的 GitHub 帳號，多個帳號用逗號分隔，例如：

```text
kevintsai
```

## 發布流程

1. 使用 `新增課程／講座` Issue Form 建立課程
2. workflow 自動驗證欄位與作者
3. 驗證成功加上 `publish-ready`
4. 網站重新建置並部署
5. 部署成功後加上 `published`

## 專案技能

- 技能目錄：`skills/course-issue-publisher/`
- 發布單一課程：`node scripts/publish-course-issue.mjs --course-dir course/<folder>`
- 批次發布未發布課程：`node scripts/publish-course-issue.mjs --course-root course --publish-all`
- 測試模式：`node scripts/publish-course-issue.mjs --course-dir course/<folder> --close-after-verify`

這個技能讓代理直接讀取本地 `course/` 目錄中的課程 markdown 與圖片，建立合法課程 Issue，等待 GitHub Pages 更新後回報結果，並在已發布目錄留下 `.published.json`。

## 標籤說明

- `publish-ready`：驗證通過，可發布
- `needs-fix`：驗證失敗，需修正
- `published`：已進入最新網站輸出
