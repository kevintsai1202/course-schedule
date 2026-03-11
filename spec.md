# 凱文大叔課程檔期板規格書

## 1. 架構與選型

- 前端：`Vite + TypeScript + 原生 CSS`
- 部署：`GitHub Pages`
- 內容輸入：`GitHub Issue Forms`
- 自動化：`GitHub Actions`
- 資料來源：GitHub Issue 經驗證後轉為靜態 `JSON`
- 時區：`Asia/Taipei`

選型理由：
- 靜態站適合 GitHub Pages，部署成本最低。
- Issue Forms 可降低手動輸入錯誤，適合非技術維護者。
- GitHub Actions 可串接驗證、資料轉換與自動部署。
- 前端不引入大型 UI 框架，維持 GitHub Pages 輕量與可維護性。

## 2. 資料模型

### 2.1 Course

| 欄位 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| id | string | 是 | 以 issue number 組成的唯一識別碼 |
| issueNumber | number | 是 | GitHub Issue 編號 |
| title | string | 是 | 課程名稱，取自 Issue 標題 |
| outline | string | 是 | 課程大綱 |
| content | string | 是 | 課程內容 |
| startAt | string | 是 | ISO 8601 含時區時間 |
| endAt | string | 是 | ISO 8601 含時區時間 |
| price | number | 是 | 金額，`0` 代表免費 |
| notes | string | 否 | 其他備註 |
| signupUrl | string | 是 | 報名連結 |
| imageUrl | string | 是 | 課程圖片 URL |
| isFree | boolean | 是 | 由 price 衍生 |
| createdBy | string | 是 | Issue 建立者 GitHub 帳號 |
| labels | string[] | 是 | 該 Issue 目前標籤 |
| updatedAt | string | 是 | 資料更新時間 |

### 2.2 ValidationResult

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| ok | boolean | 是否通過驗證 |
| errors | string[] | 驗證錯誤清單 |
| parsedCourse | Course \| null | 解析成功後的課程資料 |

### 2.3 SiteData

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| generatedAt | string | JSON 產生時間 |
| timezone | string | 時區 |
| featuredCourseId | string \| null | 首頁焦點課程 |
| courses | Course[] | 尚未過期且可發布課程 |

## 3. 關鍵流程

### 3.1 Issue 建立與發布流程

```mermaid
flowchart TD
    A[使用者建立課程 Issue] --> B[Issue Form 產生固定格式內容]
    B --> C[GitHub Actions 觸發驗證]
    C --> D{格式與作者合法?}
    D -- 否 --> E[加 needs-fix 標籤並留言錯誤]
    D -- 是 --> F[加 publish-ready 標籤]
    F --> G[重新產生 course-data.json]
    G --> H[建置前端]
    H --> I[部署到 GitHub Pages]
```

### 3.2 Issue 修改再驗證流程

```mermaid
flowchart TD
    A[使用者編輯 Issue] --> B[移除 publish-ready needs-fix published]
    B --> C[重新解析欄位]
    C --> D{驗證是否通過}
    D -- 否 --> E[標記 needs-fix]
    D -- 是 --> F[標記 publish-ready]
    E --> G[重建網站資料]
    F --> G
    G --> H[網站更新後顯示最新狀態]
```

## 4. 虛擬碼

```text
function validateIssue(issue):
  if issue.author not in allowedPublishers:
    return invalid("作者不在白名單")

  parsed = parseIssueBody(issue.body)
  validate required fields
  validate datetime format
  validate endAt > startAt
  validate price is numeric
  validate signupUrl is valid URL
  validate imageUrl can be extracted

  if errors exist:
    return invalid(errors)

  return valid(parsedCourse)

function buildSiteData(issues):
  validatedCourses = []

  for each issue in issues:
    if issue is closed:
      continue
    if issue lacks publish-ready:
      continue
    result = validateIssue(issue)
    if result invalid:
      continue
    if result.parsedCourse.endAt <= now:
      continue
    validatedCourses.append(result.parsedCourse)

  sort validatedCourses by startAt asc
  featured = first item or null

  return {
    generatedAt,
    timezone,
    featuredCourseId: featured?.id,
    courses: validatedCourses
  }
```

## 5. 系統脈絡圖

```mermaid
flowchart LR
    U[凱文大叔] --> GI[GitHub Issue Form]
    GI --> GA[GitHub Actions]
    GA --> GHAPI[GitHub REST API]
    GA --> JSON[course-data.json]
    JSON --> FE[GitHub Pages 靜態前端]
    FE --> V[網站訪客]
```

## 6. 容器/部署概觀

```mermaid
flowchart TD
    A[GitHub Repository] --> B[GitHub Actions Runner]
    B --> C[Build Dist]
    C --> D[GitHub Pages]
    D --> E[瀏覽器]
```

部署說明：
- 主分支推送會觸發完整建置與部署。
- Issue 事件也會觸發驗證、資料重建與部署。
- 部署輸出為 `dist/` 靜態資產。

## 7. 模組關係圖

### Frontend

```mermaid
flowchart LR
    A[main.ts] --> B[api.ts]
    A --> C[render.ts]
    A --> D[calendar.ts]
    A --> E[utils.ts]
    B --> F[course-data.json]
    C --> G[index.html]
```

### Automation

```mermaid
flowchart LR
    A[validate-issue.ts] --> B[issue-parser.ts]
    C[generate-course-data.ts] --> B
    C --> D[github.ts]
```

## 8. 序列圖

```mermaid
sequenceDiagram
    participant User as 凱文大叔
    participant Issue as GitHub Issue
    participant Action as GitHub Actions
    participant API as GitHub API
    participant Pages as GitHub Pages

    User->>Issue: 建立或修改課程 Issue
    Issue->>Action: 觸發 issues event
    Action->>API: 讀取 Issue 與標籤
    Action->>Action: 驗證欄位
    alt 驗證成功
        Action->>API: 設定 publish-ready
    else 驗證失敗
        Action->>API: 設定 needs-fix 並留言
    end
    Action->>API: 讀取所有可發布 Issue
    Action->>Action: 產生課程 JSON 與前端頁面
    Action->>Pages: 部署靜態網站
```

## 9. ER 圖

```mermaid
erDiagram
    ISSUE ||--o| COURSE : "轉換為"
    ISSUE {
      int number
      string title
      string body
      string state
      string author
    }
    COURSE {
      string id
      string title
      string outline
      string content
      string startAt
      string endAt
      int price
      string notes
      string signupUrl
      string imageUrl
    }
```

## 10. 類別圖（後端關鍵類別）

> 本案無獨立後端，以下為建置腳本中的核心類別與型別關係。

```mermaid
classDiagram
    class IssueParser {
      +parseIssue(issue)
      +extractSections(body)
      +extractImageUrl(value)
    }
    class IssueValidator {
      +validateIssue(issue, allowedPublishers)
      +validateDateTime(value)
      +validateUrl(value)
    }
    class CourseDataBuilder {
      +buildSiteData(issues)
      +pickFeaturedCourse(courses)
    }
    class GitHubClient {
      +listOpenIssues()
      +updateLabels()
      +upsertComment()
    }

    IssueValidator --> IssueParser
    CourseDataBuilder --> IssueValidator
    CourseDataBuilder --> GitHubClient
```

## 11. 流程圖

```mermaid
flowchart TD
    A[載入 course-data.json] --> B{是否有課程}
    B -- 否 --> C[顯示目前無可報名活動]
    B -- 是 --> D[渲染近期焦點]
    D --> E[渲染月曆]
    E --> F[渲染收折式卡片清單]
    F --> G[使用者點擊展開]
    G --> H[顯示完整大綱內容備註]
```

## 12. 狀態圖

```mermaid
stateDiagram-v2
    [*] --> Draft: 建立 Issue
    Draft --> NeedsFix: 驗證失敗
    Draft --> PublishReady: 驗證成功
    NeedsFix --> PublishReady: 修正後重新驗證成功
    PublishReady --> NeedsFix: 修改後重新驗證失敗
    PublishReady --> Published: 網站部署完成
    Published --> NeedsFix: 修改後驗證失敗
    Published --> Closed: Issue 關閉
    NeedsFix --> Closed: Issue 關閉
    Closed --> PublishReady: 重新開啟且驗證成功
```

## 驗收標準

- 使用者只能透過固定 Issue Form 建立課程。
- 驗證成功的 Issue 會自動帶上 `publish-ready`。
- 驗證失敗的 Issue 會自動帶上 `needs-fix` 並附上錯誤說明。
- 已過期課程不出現在網站。
- 首頁包含近期焦點、月曆檢視與收折卡片清單。
- `price = 0` 時顯示 `免費`。
- 手機與桌機皆可正常閱讀與操作。
