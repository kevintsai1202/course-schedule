import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * 將 Windows 路徑轉為 URL 與 repo path 可用的正斜線格式。
 */
function toPosixPath(filePath) {
  return filePath.replaceAll("\\", "/");
}

/**
 * 解析簡單 frontmatter，支援單行 key: value 格式。
 */
function parseFrontmatterBlock(rawBlock) {
  const frontmatter = {};

  for (const line of rawBlock.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    frontmatter[key] = value;
  }

  return frontmatter;
}

/**
 * 分離 markdown frontmatter 與內文，若沒有 frontmatter 則回傳空物件。
 */
function splitFrontmatter(markdownSource) {
  const match = markdownSource.match(FRONTMATTER_PATTERN);

  if (!match) {
    return {
      frontmatter: {},
      body: markdownSource.trim()
    };
  }

  return {
    frontmatter: parseFrontmatterBlock(match[1]),
    body: markdownSource.slice(match[0].length).trim()
  };
}

/**
 * 找出課程目錄中要作為發佈來源的 markdown 檔案。
 */
function resolveMarkdownFile(courseDir) {
  const entries = fs.readdirSync(courseDir, {
    withFileTypes: true
  });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name);
  const preferredNames = ["course.md", "index.md", "context.md"];

  for (const preferredName of preferredNames) {
    if (markdownFiles.includes(preferredName)) {
      return path.join(courseDir, preferredName);
    }
  }

  if (markdownFiles.length === 1) {
    return path.join(courseDir, markdownFiles[0]);
  }

  if (markdownFiles.length === 0) {
    throw new Error(`課程目錄 ${courseDir} 中找不到 markdown 檔案。`);
  }

  throw new Error(`課程目錄 ${courseDir} 中有多個 markdown 檔案，請保留一個或改名為 course.md。`);
}

/**
 * 取得課程目錄發布紀錄檔路徑。
 */
export function getPublishedRecordPath(courseDir) {
  return path.join(courseDir, ".published.json");
}

/**
 * 讀取已發布紀錄，若不存在則回傳 null。
 */
export function readPublishedRecord(courseDir) {
  const recordPath = getPublishedRecordPath(courseDir);

  if (!fs.existsSync(recordPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(recordPath, "utf8"));
}

/**
 * 寫入已發布紀錄，避免下次再次重複上傳同一課程。
 */
export function writePublishedRecord(courseDir, record) {
  const recordPath = getPublishedRecordPath(courseDir);
  fs.writeFileSync(`${recordPath}`, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

/**
 * 將 repo 內公開資產路徑轉為 raw GitHub URL。
 */
function buildRawAssetUrl(repository, branchName, repositoryPath) {
  const [owner, repo] = repository.split("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branchName}/${toPosixPath(repositoryPath)}`;
}

/**
 * 將 markdown 內容中的相對圖片路徑改寫為可公開讀取的 raw GitHub URL。
 */
function rewriteMarkdownImages(markdownBody, markdownPath, courseDir, repository, branchName, slug) {
  const assetMappings = [];
  const assetKeys = new Set();

  const rewrittenBody = markdownBody.replace(MARKDOWN_IMAGE_PATTERN, (fullMatch, altText, rawTarget) => {
    const trimmedTarget = rawTarget.trim();

    if (/^(https?:\/\/|data:)/i.test(trimmedTarget)) {
      return fullMatch;
    }

    const sourcePath = path.resolve(path.dirname(markdownPath), trimmedTarget);
    const courseRelativePath = toPosixPath(path.relative(courseDir, sourcePath));
    const publishedRepositoryPath = path.join("public", "published-assets", slug, courseRelativePath);
    const publicUrl = buildRawAssetUrl(repository, branchName, publishedRepositoryPath);

    const assetKey = `${sourcePath}::${publishedRepositoryPath}`;

    if (!assetKeys.has(assetKey)) {
      assetKeys.add(assetKey);
      assetMappings.push({
        sourcePath,
        courseRelativePath,
        publishedRepositoryPath,
        publicUrl
      });
    }

    return `![${altText}](${publicUrl})`;
  });

  return {
    rewrittenBody,
    assetMappings
  };
}

/**
 * 清除 markdown 常見語法，供摘要與 fallback outline 使用。
 */
function stripMarkdown(markdown) {
  return markdown
    .replace(MARKDOWN_IMAGE_PATTERN, " ")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 盡量從 markdown 內容推導課程標題。
 */
function resolveTitle(frontmatter, markdownBody) {
  if (frontmatter.title?.trim()) {
    return frontmatter.title.trim();
  }

  const headingMatch = markdownBody.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : "";
}

/**
 * 盡量從 frontmatter 或內文推導課程大綱。
 */
function resolveOutline(frontmatter, markdownBody) {
  if (frontmatter.outline?.trim()) {
    return frontmatter.outline.trim();
  }

  const stripped = stripMarkdown(markdownBody);
  return stripped.length > 120 ? `${stripped.slice(0, 120)}...` : stripped;
}

/**
 * 解析單一課程目錄，回傳可直接建立 issue 的 payload 與資產映射。
 */
export function parseCourseDirectory(courseDir, repository, branchName = "main") {
  const absoluteCourseDir = path.resolve(courseDir);
  const markdownPath = resolveMarkdownFile(absoluteCourseDir);
  const markdownSource = fs.readFileSync(markdownPath, "utf8");
  const { frontmatter, body } = splitFrontmatter(markdownSource);
  const slug = path.basename(absoluteCourseDir);
  const { rewrittenBody, assetMappings } = rewriteMarkdownImages(
    body,
    markdownPath,
    absoluteCourseDir,
    repository,
    branchName,
    slug
  );
  const coverImageFrontmatter = frontmatter.image?.trim() || frontmatter.imageUrl?.trim() || "";
  let coverImageUrl = coverImageFrontmatter;

  if (coverImageFrontmatter && !/^(https?:\/\/|data:)/i.test(coverImageFrontmatter)) {
    const sourcePath = path.resolve(path.dirname(markdownPath), coverImageFrontmatter);
    const courseRelativePath = toPosixPath(path.relative(absoluteCourseDir, sourcePath));
    const publishedRepositoryPath = path.join("public", "published-assets", slug, courseRelativePath);
    coverImageUrl = buildRawAssetUrl(repository, branchName, publishedRepositoryPath);

    const assetKey = `${sourcePath}::${publishedRepositoryPath}`;

    if (!assetMappings.some((mapping) => `${mapping.sourcePath}::${mapping.publishedRepositoryPath}` === assetKey)) {
      assetMappings.push({
        sourcePath,
        courseRelativePath,
        publishedRepositoryPath,
        publicUrl: coverImageUrl
      });
    }
  }

  if (!coverImageUrl) {
    coverImageUrl = assetMappings[0]?.publicUrl ?? "";
  }

  const payload = {
    title: resolveTitle(frontmatter, rewrittenBody),
    outline: resolveOutline(frontmatter, rewrittenBody),
    content: rewrittenBody,
    startAt: String(frontmatter.startAt ?? "").trim(),
    endAt: String(frontmatter.endAt ?? "").trim(),
    price: Number(frontmatter.price ?? Number.NaN),
    notes: String(frontmatter.notes ?? "").trim(),
    signupUrl: String(frontmatter.signupUrl ?? "").trim(),
    imageUrl: coverImageUrl
  };

  return {
    courseDir: absoluteCourseDir,
    slug,
    markdownPath,
    payload,
    assetMappings
  };
}

/**
 * 掃描課程根目錄下的一層子資料夾，作為批次發佈來源。
 */
export function listCourseDirectories(courseRoot) {
  const absoluteRoot = path.resolve(courseRoot);

  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(`課程根目錄不存在：${courseRoot}`);
  }

  return fs
    .readdirSync(absoluteRoot, {
      withFileTypes: true
    })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("_"))
    .map((entry) => path.join(absoluteRoot, entry.name));
}

/**
 * 將課程目錄路徑轉為 repo 內相對路徑，供紀錄檔與 CLI 回傳使用。
 */
export function toRepositoryRelativePath(filePath) {
  return toPosixPath(path.relative(process.cwd(), filePath));
}
