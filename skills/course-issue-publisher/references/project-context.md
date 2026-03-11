# Project Context

- Repository: `kevintsai1202/course-schedule`
- GitHub Pages: `https://kevintsai1202.github.io/course-schedule/`
- Publish script: `node scripts/publish-course-issue.mjs`
- Issue format must match these exact section titles:
  - `課程大綱`
  - `課程內容`
  - `開始時間`
  - `結束時間`
  - `售價`
  - `其他備註`
  - `報名連結`
  - `圖片`
- Validation labels:
  - `publish-ready`
  - `needs-fix`
  - `published`
- Allowed publisher default:
  - `kevintsai1202`
- Test-only publication can use:

```powershell
node scripts/publish-course-issue.mjs --json <temp-json-path> --close-after-verify
```

- In test-only mode, the script waits for publish success first, then closes the issue and waits for the course to disappear from `course-data.json`.

- Production publication should normally use:

```powershell
node scripts/publish-course-issue.mjs --json <temp-json-path>
```
