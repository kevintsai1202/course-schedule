# 凱文大叔課程檔期板介面文件

## 概述

本專案無傳統後端服務，對外介面分為兩類：
- GitHub Issue Form 輸入契約
- GitHub Pages 提供的靜態資料介面
- 本地發布工具與專案技能介面

## 1. 課程輸入契約

### 1.1 Issue 標題

- 用途：課程名稱
- 規則：不得為空

### 1.2 Issue Body 區段格式

```md
### 課程大綱
...

### 課程內容
...

### 開始時間
2026-03-20 19:00

### 結束時間
2026-03-20 21:00

### 售價
0

### 其他備註
...

### 報名連結
https://example.com

### 圖片
![cover](https://github.com/user-attachments/assets/...)
```

### 1.3 欄位驗證規則

| 欄位 | 規則 |
| --- | --- |
| 課程大綱 | 必填 |
| 課程內容 | 必填 |
| 開始時間 | 必填，格式 `YYYY-MM-DD HH:mm` |
| 結束時間 | 必填，格式 `YYYY-MM-DD HH:mm` |
| 售價 | 必填，數字格式，`0` 表示免費 |
| 其他備註 | 可空 |
| 報名連結 | 必填，需為合法 `http` 或 `https` URL |
| 圖片 | 必填，需可解析出圖片 URL 或 GitHub 附件 markdown |

## 2. 靜態資料 API

### 2.1 取得課程資料

- Method：`GET`
- Path：`/course-data.json`
- 說明：提供前端渲染使用的課程資料

#### Response 200

```json
{
  "generatedAt": "2026-03-12T13:00:00+08:00",
  "timezone": "Asia/Taipei",
  "featuredCourseId": "issue-12",
  "courses": [
    {
      "id": "issue-12",
      "issueNumber": 12,
      "title": "AI 自動化免費講座",
      "outline": "帶你看 GitHub Actions 與自動化流程",
      "content": "介紹課程案例與示範流程",
      "startAt": "2026-03-20T19:00:00+08:00",
      "endAt": "2026-03-20T21:00:00+08:00",
      "price": 0,
      "notes": "名額有限",
      "signupUrl": "https://example.com",
      "imageUrl": "https://github.com/user-attachments/assets/example",
      "isFree": true,
      "createdBy": "kevintsai",
      "labels": [
        "publish-ready",
        "published"
      ],
      "updatedAt": "2026-03-12T13:00:00Z"
    }
  ]
}
```

#### Response 規則

- 僅包含 `open` 且具備 `publish-ready` 標籤之 Issue
- 僅包含 `endAt > 現在時間` 的課程
- 依 `startAt` 由近到遠排序

## 3. 驗證狀態標籤契約

| 標籤 | 說明 |
| --- | --- |
| publish-ready | 驗證通過，可進入網站資料 |
| needs-fix | 驗證失敗，需要修正 |
| published | 已被最新網站輸出採用 |

## 4. 本地發布工具契約

### 4.1 指令

```powershell
node scripts/publish-course-issue.mjs --json <path-to-json>
```

### 4.2 JSON Input

```json
{
  "title": "AI 自動化免費講座",
  "outline": "帶你看 GitHub Actions 與自動化流程",
  "content": "介紹課程案例與示範流程",
  "startAt": "2026-03-20 19:00",
  "endAt": "2026-03-20 21:00",
  "price": 0,
  "notes": "名額有限",
  "signupUrl": "https://example.com",
  "imageUrl": "https://github.com/user-attachments/assets/example"
}
```

### 4.3 CLI Options

| 參數 | 說明 |
| --- | --- |
| `--json <path>` | 從 JSON 檔案讀取課程資料 |
| `--stdin` | 從標準輸入讀取 JSON |
| `--repo <owner/repo>` | 指定發文倉庫，預設 `kevintsai1202/course-schedule` |
| `--wait-seconds <n>` | 等待驗證與頁面發布秒數，預設 `180` |
| `--dry-run` | 只做本地格式驗證與 body 預覽，不建立 Issue |
| `--close-after-verify` | 驗證成功後自動關閉 Issue，供測試用途 |

### 4.4 Output

```json
{
  "ok": true,
  "issueNumber": 12,
  "issueUrl": "https://github.com/kevintsai1202/course-schedule/issues/12",
  "pageUrl": "https://kevintsai1202.github.io/course-schedule/",
  "pagePublished": true,
  "removedAfterClose": false,
  "labels": [
    "publish-ready",
    "published"
  ]
}
```

### 4.5 規則

- 建 Issue 前先用與 workflow 相同的驗證器做本地檢查。
- 發 Issue 後輪詢標籤狀態與 `course-data.json`，確認頁面是否已上線。
- `--close-after-verify` 只用於測試，不作為正式發布預設行為，且會等待該課程自網站移除。

## 5. GitHub Actions 事件契約

### 5.1 驗證與部署觸發

| Event | 說明 |
| --- | --- |
| issues.opened | 建立課程後立即驗證 |
| issues.edited | 修改內容後重新驗證 |
| issues.reopened | 重新開啟後重新驗證 |
| issues.closed | 關閉後從資料集中移除並重新部署 |
| push on main | 程式碼、技能或樣式變更後重新部署 |

### 5.2 環境變數

| 名稱 | 必填 | 說明 |
| --- | --- | --- |
| GITHUB_TOKEN | 是 | GitHub Actions 內建 Token |
| ALLOWED_PUBLISHERS | 是 | 允許發布的 GitHub 帳號，逗號分隔 |
| SITE_TIMEZONE | 否 | 預設 `Asia/Taipei` |

## 6. 錯誤回應策略

### 6.1 驗證失敗留言格式

```md
課程資料驗證失敗，請修正以下欄位：

- 開始時間格式錯誤，需為 YYYY-MM-DD HH:mm
- 圖片欄位未提供可解析圖片
```

### 6.2 驗證成功處理

- 移除 `needs-fix`
- 加上 `publish-ready`
- 後續建站成功後可補上 `published`

## 7. 相容性說明

- 前端僅依賴 `course-data.json`，不直接讀 GitHub API。
- GitHub Issue Form 說明與 parser 必須同步維護，避免欄位名稱漂移。
- 專案技能透過本地指令呼叫 `gh` CLI 發文，需先完成 `gh auth login`。
