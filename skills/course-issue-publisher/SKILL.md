---
name: course-issue-publisher
description: Publish a course or lecture entry to the `kevintsai1202/course-schedule` GitHub repository and verify that it appears on the GitHub Pages site. Use this skill whenever the user gives course data such as title, outline, content, date/time, price, notes, signup link, or image and wants you to create the repo issue for them, validate the format, and confirm the web page result.
---

# Course Issue Publisher

## Purpose

Use this skill when the user wants to provide course data in chat and have you:

- convert it into the exact issue format required by this repo
- publish the issue to `kevintsai1202/course-schedule`
- wait for validation and GitHub Pages deployment
- report the issue URL and whether the page has updated

## Required Input

Collect or infer these fields before publishing:

- `title`
- `outline`
- `content`
- `startAt` in `YYYY-MM-DD HH:mm`
- `endAt` in `YYYY-MM-DD HH:mm`
- `price` where `0` means free
- `notes` (can be empty)
- `signupUrl`
- `imageUrl`

If the user omits `notes`, use an empty string. Do not invent any other missing required field.

## Workflow

1. Read [project-context.md](e:/github/course-schedule/skills/course-issue-publisher/references/project-context.md) if you need repo-specific details.
2. Convert the user input into a JSON object matching the required fields.
3. Save that JSON to a temporary file in the workspace, or pipe it via stdin.
4. Run:

```powershell
node scripts/publish-course-issue.mjs --json <temp-json-path>
```

5. Inspect the JSON result.
6. Report:
   - issue number and issue URL
   - whether `publish-ready` / `published` was observed
   - whether the page update was confirmed
   - the public Pages URL
7. If the user explicitly says this is only a test, rerun or publish with:

```powershell
node scripts/publish-course-issue.mjs --json <temp-json-path> --close-after-verify
```

## Output Format

Keep the answer concise and include:

- `Issue`：URL
- `頁面`：URL
- `狀態`：已發布 / 驗證失敗 / 等待逾時
- `補充`：只有在失敗或逾時時才附錯誤原因

## Guardrails

- Always use the project script instead of hand-building a `gh issue create` command.
- Always let the script do local validation first.
- Never skip checking the page result unless the user explicitly says they only want issue creation.
- If the script returns failure, relay the exact validation reason rather than paraphrasing away the actionable detail.

## Example

**Input concept**

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

**Expected result**

- 建立合法 Issue
- 等待 repo 自動加上 `publish-ready`
- 確認該課程進入 `course-data.json`
- 回報 Pages 網址與 Issue 網址

