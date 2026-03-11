---
name: course-issue-publisher
description: Publish course entries from the local `course/` directory to the `kevintsai1202/course-schedule` GitHub repository and verify that they appear on the GitHub Pages site. Use this skill whenever the user says a course is already prepared under `course/<folder>/`, wants to publish one folder or all unpublished folders, wants image links inside markdown to work on the page, or wants to avoid re-uploading courses that were already published.
---

# Course Issue Publisher

## Purpose

Use this skill when the user wants you to publish course content that already exists on disk under `course/`.

The skill should:

- read one course folder or batch-publish all unpublished course folders
- detect whether the markdown already has frontmatter
- convert legacy markdown into frontmatter format before publishing when needed
- parse the markdown file and its frontmatter
- copy referenced local images into tracked published assets
- create the GitHub Issue in the required repo format
- wait for GitHub Actions and GitHub Pages to finish
- write a local `.published.json` record so the same course is skipped next time

## Expected Course Folder Format

Each course uses one folder:

```text
course/
  some-course/
    course.md / index.md / context.md
    image/
      cover.png
      demo.png
    .published.json
```

Each course folder should keep one publishable markdown file. The script prefers `course.md`, `index.md`, then `context.md`.

That markdown file must contain frontmatter:

```md
---
title: 課程名稱
outline: 課程大綱摘要
startAt: 2026-04-18 09:00
endAt: 2026-04-19 17:00
price: 0
notes: 其他備註
signupUrl: https://example.com
image: image/cover.png
---

這裡開始是課程內容 markdown。

![封面](image/cover.png)
```

Read [course-template.md](e:/github/course-schedule/skills/course-issue-publisher/references/course-template.md) when you need a starter format.

## Workflow

1. Read [project-context.md](e:/github/course-schedule/skills/course-issue-publisher/references/project-context.md) if repo-specific behavior matters.
2. Check whether the markdown already has frontmatter.
3. If the markdown is legacy content without frontmatter:
   - preserve the original body content
   - add frontmatter fields at the top
   - infer what you can from the existing text
   - if a required field is unknown, leave a clearly visible placeholder like `TODO`
4. Decide the source mode:
   - one folder: `--course-dir`
   - all unpublished folders: `--course-root course --publish-all`
5. Run the project script instead of manually composing `gh issue create`.
6. Inspect the returned JSON.
7. Report the issue URL, page URL, publish result, and whether the folder was skipped because of `.published.json`.

## Commands

Single folder:

```powershell
node scripts/publish-course-issue.mjs --course-dir course/<folder>
```

Publish all unpublished folders:

```powershell
node scripts/publish-course-issue.mjs --course-root course --publish-all
```

Test mode:

```powershell
node scripts/publish-course-issue.mjs --course-dir course/<folder> --close-after-verify
```

## Output Format

Keep the answer concise and include:

- `Issue`：URL 或 `略過`
- `頁面`：URL
- `狀態`：已發布 / 已略過 / 驗證失敗 / 等待逾時
- `補充`：只有在失敗、逾時或略過時才附原因

## Guardrails

- Always use the project script.
- Always preserve `course/` as local-only source content; do not try to add `course/` to git.
- Let the script copy only referenced images into tracked `public/published-assets/`.
- If `.published.json` exists, treat that folder as already published unless the user explicitly asks to force republish.
- If the user asks to republish anyway, use `--force`.
- If frontmatter is missing, rewrite the file into the new format first.
- If a required field cannot be inferred from the original content, leave `TODO` and tell the user what still needs confirmation.

## Example Intent

- 「幫我把 `course/vibe-coding` 發出去」
- 「把 `course` 底下還沒發過的課程全部發佈」
- 「這門課已經有 `.published.json`，先不要重發」
