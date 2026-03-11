import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  buildIssueBody,
  DEFAULT_COURSE_REPOSITORY,
  deriveSiteUrl,
  normalizeCoursePayload,
  validateCoursePayload
} from "./lib/course-issue-template.mjs";

const DEFAULT_WAIT_SECONDS = 180;
const DEFAULT_ALLOWED_PUBLISHERS = ["kevintsai1202"];

/**
 * 解析 CLI 參數，支援 JSON 檔、stdin、dry-run 與測試關閉流程。
 */
function parseArguments(argv) {
  const options = {
    jsonPath: "",
    useStdin: false,
    repository: process.env.COURSE_REPOSITORY ?? DEFAULT_COURSE_REPOSITORY,
    waitSeconds: Number(process.env.COURSE_WAIT_SECONDS ?? DEFAULT_WAIT_SECONDS),
    dryRun: false,
    closeAfterVerify: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--json":
        options.jsonPath = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--stdin":
        options.useStdin = true;
        break;
      case "--repo":
        options.repository = argv[index + 1] ?? options.repository;
        index += 1;
        break;
      case "--wait-seconds":
        options.waitSeconds = Number(argv[index + 1] ?? options.waitSeconds);
        index += 1;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--close-after-verify":
        options.closeAfterVerify = true;
        break;
      default:
        break;
    }
  }

  return options;
}

/**
 * 執行 gh 指令並回傳標準輸出；失敗時附上 stderr 方便定位問題。
 */
function runGh(args, options = {}) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `gh 指令失敗：${args.join(" ")}`);
  }

  return result.stdout.trim();
}

/**
 * 讀取 JSON 來源，支援檔案與 stdin。
 */
function readPayload(options) {
  if (options.useStdin) {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  }

  if (!options.jsonPath) {
    throw new Error("請提供 --json <path> 或 --stdin。");
  }

  return JSON.parse(fs.readFileSync(path.resolve(options.jsonPath), "utf8"));
}

/**
 * 取得目前 gh 登入帳號，供本地驗證白名單使用。
 */
function getCurrentLogin() {
  const output = runGh(["api", "user"]);
  const user = JSON.parse(output);
  return String(user.login ?? "").trim();
}

/**
 * 建立 issue，回傳 GitHub issue URL。
 */
function createIssue(repository, title, body) {
  const temporaryBodyPath = path.join(os.tmpdir(), `course-issue-${Date.now()}.md`);
  fs.writeFileSync(temporaryBodyPath, body, "utf8");

  try {
    return runGh(["issue", "create", "--repo", repository, "--title", title, "--body-file", temporaryBodyPath]);
  } finally {
    fs.rmSync(temporaryBodyPath, {
      force: true
    });
  }
}

/**
 * 從 issue URL 取出 issue 編號，供後續輪詢與查詢使用。
 */
function extractIssueNumber(issueUrl) {
  const match = issueUrl.match(/\/issues\/(\d+)$/);

  if (!match) {
    throw new Error(`無法從 Issue URL 解析編號：${issueUrl}`);
  }

  return Number(match[1]);
}

/**
 * 查詢單一 issue 狀態，取得標籤、留言與網址。
 */
function getIssueState(repository, issueNumber) {
  const output = runGh([
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repository,
    "--json",
    "number,title,state,labels,comments,url"
  ]);

  return JSON.parse(output);
}

/**
 * 取得 GitHub Pages 輸出的課程資料，用來確認頁面是否已經更新。
 */
async function fetchCourseData(siteUrl) {
  const response = await fetch(new URL("course-data.json", siteUrl));

  if (!response.ok) {
    throw new Error(`無法讀取 course-data.json：${response.status}`);
  }

  return response.json();
}

/**
 * 輪詢 issue 標籤與頁面資料，直到成功發布或逾時。
 */
async function waitForPublish(repository, issueNumber, siteUrl, waitSeconds) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < waitSeconds * 1000) {
    const issueState = getIssueState(repository, issueNumber);
    const labels = issueState.labels.map((label) => label.name);
    const hasNeedsFix = labels.includes("needs-fix");
    const hasPublishReady = labels.includes("publish-ready");
    const hasPublished = labels.includes("published");

    if (hasNeedsFix) {
      const latestComment = issueState.comments.at(-1)?.body ?? "";
      return {
        ok: false,
        issueState,
        pagePublished: false,
        error: latestComment || "Issue 驗證失敗。"
      };
    }

    if (hasPublishReady) {
      try {
        const siteData = await fetchCourseData(siteUrl);
        const foundCourse = siteData.courses.find((course) => course.issueNumber === issueNumber);

        if (foundCourse) {
          return {
            ok: true,
            issueState: getIssueState(repository, issueNumber),
            pagePublished: true,
            course: foundCourse,
            pageUrl: siteUrl,
            publishedFlagSeen: hasPublished
          };
        }
      } catch {
        // Pages 更新存在短暫延遲，持續輪詢即可。
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return {
    ok: false,
    issueState: getIssueState(repository, issueNumber),
    pagePublished: false,
    error: `等待發布逾時，已超過 ${waitSeconds} 秒。`
  };
}

/**
 * 測試模式下等待課程自網站移除，確認關閉 Issue 後下架完成。
 */
async function waitForRemoval(issueNumber, siteUrl, waitSeconds) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < waitSeconds * 1000) {
    try {
      const siteData = await fetchCourseData(siteUrl);
      const foundCourse = siteData.courses.find((course) => course.issueNumber === issueNumber);

      if (!foundCourse) {
        return true;
      }
    } catch {
      // Pages 更新存在短暫延遲，持續輪詢即可。
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return false;
}

/**
 * 關閉測試 issue，避免測試課程長期留在公開頁面。
 */
function closeIssue(repository, issueNumber) {
  runGh([
    "issue",
    "close",
    String(issueNumber),
    "--repo",
    repository,
    "--comment",
    "由發布技能測試流程自動關閉。"
  ]);
}

/**
 * 將最終結果格式化成穩定 JSON，方便技能與終端回報。
 */
function buildResult({ repository, issueNumber, issueUrl, siteUrl, publishResult, dryRun, bodyPreview }) {
  return {
    ok: publishResult?.ok ?? true,
    dryRun,
    repository,
    issueNumber,
    issueUrl,
    pageUrl: siteUrl,
    pagePublished: publishResult?.pagePublished ?? false,
    removedAfterClose: publishResult?.removedAfterClose ?? false,
    labels: publishResult?.issueState?.labels?.map((label) => label.name) ?? [],
    error: publishResult?.error ?? "",
    bodyPreview
  };
}

/**
 * 主流程：讀取資料、本地驗證、建立 issue、等待網站發布，必要時自動關閉測試 issue。
 */
async function main() {
  const options = parseArguments(process.argv.slice(2));
  const payload = normalizeCoursePayload(readPayload(options));
  const currentLogin = getCurrentLogin();
  const allowedPublishers = (process.env.ALLOWED_PUBLISHERS ?? DEFAULT_ALLOWED_PUBLISHERS.join(","))
    .split(",")
    .map((publisher) => publisher.trim())
    .filter(Boolean);
  const validationResult = validateCoursePayload(payload, currentLogin, allowedPublishers);
  const siteUrl = deriveSiteUrl(options.repository);
  const issueBody = buildIssueBody(payload);

  if (!validationResult.ok) {
    console.log(
      JSON.stringify(
        buildResult({
          repository: options.repository,
          issueNumber: 0,
          issueUrl: "",
          siteUrl,
          dryRun: options.dryRun,
          bodyPreview: issueBody,
          publishResult: {
            ok: false,
            issueState: {
              labels: []
            },
            error: validationResult.errors.join(" | ")
          }
        }),
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        buildResult({
          repository: options.repository,
          issueNumber: 0,
          issueUrl: "",
          siteUrl,
          dryRun: true,
          bodyPreview: issueBody
        }),
        null,
        2
      )
    );
    return;
  }

  const issueUrl = createIssue(options.repository, payload.title, issueBody);
  const issueNumber = extractIssueNumber(issueUrl);
  const publishResult = await waitForPublish(options.repository, issueNumber, siteUrl, options.waitSeconds);

  if (publishResult.ok && options.closeAfterVerify) {
    closeIssue(options.repository, issueNumber);
    publishResult.removedAfterClose = await waitForRemoval(issueNumber, siteUrl, options.waitSeconds);
  }

  console.log(
    JSON.stringify(
      buildResult({
        repository: options.repository,
        issueNumber,
        issueUrl,
        siteUrl,
        dryRun: false,
        bodyPreview: issueBody,
        publishResult
      }),
      null,
      2
    )
  );

  if (!publishResult.ok) {
    process.exitCode = 1;
  }
}

await main();
