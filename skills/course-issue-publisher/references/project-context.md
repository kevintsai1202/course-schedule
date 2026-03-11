# Project Context

- Repository: `kevintsai1202/course-schedule`
- GitHub Pages: `https://kevintsai1202.github.io/course-schedule/`
- Publish script: `node scripts/publish-course-issue.mjs`
- Source content root: local `course/` directory
- `course/` is local-only and should stay ignored by git
- Published images are copied to tracked `public/published-assets/<course-slug>/...`
- Legacy markdown without frontmatter should be converted in place before publish
- When a required field cannot be inferred, leave a `TODO` placeholder instead of inventing data
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
node scripts/publish-course-issue.mjs --course-dir course/<folder> --close-after-verify
```

- In test-only mode, the script waits for publish success first, then closes the issue and waits for the course to disappear from `course-data.json`.
- Formal publish of one folder uses:

```powershell
node scripts/publish-course-issue.mjs --course-dir course/<folder>
```

- Batch publish uses:

```powershell
node scripts/publish-course-issue.mjs --course-root course --publish-all
```

- After successful formal publish, the script writes `.published.json` into that course folder and will skip it next time unless `--force` is used.

- Production publication should normally use:

```powershell
node scripts/publish-course-issue.mjs --json <temp-json-path>
```
