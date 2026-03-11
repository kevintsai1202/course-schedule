import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  getPublishedRecordPath,
  listCourseDirectories,
  parseCourseDirectory,
  readPublishedRecord,
  toRepositoryRelativePath,
  writePublishedRecord
} from "./lib/course-directory-parser.mjs";
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
 * 解析 CLI 參數，支援 JSON 模式、course 目錄模式與測試下架模式。
 */
function parseArguments(argv) {
  const options = {
    jsonPath: "",
    useStdin: false,
    courseDir: "",
    courseRoot: "",
    publishAll: false,
    force: false,
    repository: process.env.COURSE_REPOSITORY ?? DEFAULT_COURSE_REPOSITORY,
    branchName: process.env.COURSE_PUBLISH_BRANCH ?? "main",
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
      case "--course-dir":
        options.courseDir = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--course-root":
        options.courseRoot = argv[index + 1] ?? "";
        index += 1;
        break;
      case "--publish-all":
        options.publishAll = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--repo":
        options.repository = argv[index + 1] ?? options.repository;
        index += 1;
        break;
      case "--branch":
        options.branchName = argv[index + 1] ?? options.branchName;
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
 * 執行 shell 指令並回傳標準輸出；失敗時附上 stderr 方便定位問題。
 */
function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `${command} 指令失敗：${args.join(" ")}`);
  }

  return result.stdout.trim();
}

/**
 * 封裝 gh 指令呼叫。
 */
function runGh(args, options = {}) {
  return runCommand("gh", args, options);
}

/**
 * 封裝 git 指令呼叫。
 */
function runGit(args, options = {}) {
  return runCommand("git", args, options);
}

/**
 * 檢查指定檔案是否已 staged 變更，供資產同步後判斷是否要 commit。
 */
function hasStagedChanges(filePaths) {
  const result = spawnSync("git", ["diff", "--cached", "--quiet", "--", ...filePaths], {
    stdio: "ignore"
  });

  return result.status === 1;
}

/**
 * 讀取 JSON 來源，支援檔案與 stdin。
 */
function readJsonPayload(options) {
  if (options.useStdin) {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  }

  if (!options.jsonPath) {
    throw new Error("請提供 --json <path>、--stdin、--course-dir 或 --course-root。");
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

    if (labels.includes("needs-fix")) {
      const latestComment = issueState.comments.at(-1)?.body ?? "";
      return {
        ok: false,
        issueState,
        pagePublished: false,
        error: latestComment || "Issue 驗證失敗。"
      };
    }

    if (labels.includes("publish-ready")) {
      try {
        const siteData = await fetchCourseData(siteUrl);
        const foundCourse = siteData.courses.find((course) => course.issueNumber === issueNumber);

        if (foundCourse) {
          return {
            ok: true,
            issueState: getIssueState(repository, issueNumber),
            pagePublished: true,
            course: foundCourse,
            pageUrl: siteUrl
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
 * 同步課程目錄引用的圖片到可發布資產目錄，並提交到 GitHub。
 */
function syncCourseAssets(parsedCourse, options) {
  const publishedAssetPaths = [];

  for (const mapping of parsedCourse.assetMappings) {
    publishedAssetPaths.push(toRepositoryRelativePath(path.resolve(mapping.publishedRepositoryPath)));

    if (options.dryRun) {
      continue;
    }

    if (!fs.existsSync(mapping.sourcePath)) {
      throw new Error(`課程圖片不存在：${mapping.sourcePath}`);
    }

    const destinationPath = path.resolve(mapping.publishedRepositoryPath);
    fs.mkdirSync(path.dirname(destinationPath), {
      recursive: true
    });
    fs.copyFileSync(mapping.sourcePath, destinationPath);
  }

  if (options.dryRun || publishedAssetPaths.length === 0) {
    return publishedAssetPaths;
  }

  runGit(["add", "--", ...publishedAssetPaths]);

  if (!hasStagedChanges(publishedAssetPaths)) {
    return publishedAssetPaths;
  }

  const commitMessage = `chore: publish assets for ${parsedCourse.slug}`;
  runGit(["commit", "-m", commitMessage, "--", ...publishedAssetPaths]);
  runGit(["push"]);

  return publishedAssetPaths;
}

/**
 * 將單次結果整理成一致的 JSON 結構，方便技能與終端回報。
 */
function buildSingleResult({
  repository,
  issueNumber,
  issueUrl,
  siteUrl,
  publishResult,
  dryRun,
  bodyPreview,
  courseDir = "",
  skipped = false,
  recordPath = ""
}) {
  const normalizedCourseDir = courseDir ? toRepositoryRelativePath(courseDir) : "";

  return {
    ok: publishResult?.ok ?? true,
    skipped,
    dryRun,
    repository,
    courseDir: normalizedCourseDir,
    recordPath,
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
 * 建立正式發布紀錄，寫回本地課程目錄。
 */
function buildPublishedRecord(repository, siteUrl, issueNumber, issueUrl, markdownPath) {
  return {
    issueNumber,
    issueUrl,
    pageUrl: siteUrl,
    repository,
    publishedAt: new Date().toISOString(),
    sourceMarkdown: toRepositoryRelativePath(markdownPath)
  };
}

/**
 * 發布單一課程 payload，供 JSON 模式與 course 目錄模式共用。
 */
async function publishPayload(payload, options, extra = {}) {
  const currentLogin = getCurrentLogin();
  const allowedPublishers = (process.env.ALLOWED_PUBLISHERS ?? DEFAULT_ALLOWED_PUBLISHERS.join(","))
    .split(",")
    .map((publisher) => publisher.trim())
    .filter(Boolean);
  const normalizedPayload = normalizeCoursePayload(payload);
  const validationResult = validateCoursePayload(normalizedPayload, currentLogin, allowedPublishers);
  const siteUrl = deriveSiteUrl(options.repository);
  const issueBody = buildIssueBody(normalizedPayload);

  if (!validationResult.ok) {
    return buildSingleResult({
      repository: options.repository,
      issueNumber: 0,
      issueUrl: "",
      siteUrl,
      dryRun: options.dryRun,
      bodyPreview: issueBody,
      courseDir: extra.courseDir ?? "",
      recordPath: extra.recordPath ?? "",
      publishResult: {
        ok: false,
        issueState: {
          labels: []
        },
        error: validationResult.errors.join(" | ")
      }
    });
  }

  if (options.dryRun) {
    return buildSingleResult({
      repository: options.repository,
      issueNumber: 0,
      issueUrl: "",
      siteUrl,
      dryRun: true,
      bodyPreview: issueBody,
      courseDir: extra.courseDir ?? "",
      recordPath: extra.recordPath ?? ""
    });
  }

  const issueUrl = createIssue(options.repository, normalizedPayload.title, issueBody);
  const issueNumber = extractIssueNumber(issueUrl);
  const publishResult = await waitForPublish(options.repository, issueNumber, siteUrl, options.waitSeconds);

  if (publishResult.ok && options.closeAfterVerify) {
    closeIssue(options.repository, issueNumber);
    publishResult.removedAfterClose = await waitForRemoval(issueNumber, siteUrl, options.waitSeconds);
  }

  if (publishResult.ok && extra.courseDir && !options.closeAfterVerify) {
    writePublishedRecord(
      extra.courseDir,
      buildPublishedRecord(options.repository, siteUrl, issueNumber, issueUrl, extra.markdownPath)
    );
  }

  return buildSingleResult({
    repository: options.repository,
    issueNumber,
    issueUrl,
    siteUrl,
    dryRun: false,
    bodyPreview: issueBody,
    courseDir: extra.courseDir ?? "",
    recordPath: extra.recordPath ?? "",
    publishResult
  });
}

/**
 * 發布單一課程目錄，處理發布紀錄略過與資產同步。
 */
async function publishCourseDirectory(courseDir, options) {
  const recordPath = getPublishedRecordPath(courseDir);
  const publishedRecord = readPublishedRecord(courseDir);

  if (publishedRecord && !options.force) {
    return buildSingleResult({
      repository: options.repository,
      issueNumber: publishedRecord.issueNumber ?? 0,
      issueUrl: publishedRecord.issueUrl ?? "",
      siteUrl: publishedRecord.pageUrl ?? deriveSiteUrl(options.repository),
      dryRun: options.dryRun,
      courseDir: toRepositoryRelativePath(courseDir),
      recordPath: toRepositoryRelativePath(recordPath),
      skipped: true,
      bodyPreview: "",
      publishResult: {
        ok: true,
        issueState: {
          labels: []
        }
      }
    });
  }

  const parsedCourse = parseCourseDirectory(courseDir, options.repository, options.branchName);
  syncCourseAssets(parsedCourse, options);

  return publishPayload(parsedCourse.payload, options, {
    courseDir: parsedCourse.courseDir,
    markdownPath: parsedCourse.markdownPath,
    recordPath: toRepositoryRelativePath(recordPath)
  });
}

/**
 * 批次發布所有尚未發布的課程目錄。
 */
async function publishCourseDirectories(options) {
  const courseDirectories = listCourseDirectories(options.courseRoot);
  const results = [];

  for (const courseDir of courseDirectories) {
    results.push(await publishCourseDirectory(courseDir, options));
  }

  const hasFailure = results.some((result) => !result.ok);

  return {
    ok: !hasFailure,
    repository: options.repository,
    pageUrl: deriveSiteUrl(options.repository),
    results
  };
}

/**
 * 根據來源模式執行對應發布流程。
 */
async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.publishAll) {
    if (!options.courseRoot) {
      throw new Error("使用 --publish-all 時必須搭配 --course-root。");
    }

    console.log(JSON.stringify(await publishCourseDirectories(options), null, 2));
    return;
  }

  if (options.courseDir) {
    console.log(JSON.stringify(await publishCourseDirectory(options.courseDir, options), null, 2));
    return;
  }

  const payload = readJsonPayload(options);
  console.log(JSON.stringify(await publishPayload(payload, options), null, 2));
}

await main();
