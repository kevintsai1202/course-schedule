import { defineConfig } from "vite";

/**
 * 根據 GitHub Pages 環境動態調整 base path，避免專案頁面資源路徑錯誤。
 */
function resolveBasePath(): string {
  const explicitBase = process.env.BASE_PATH;

  if (explicitBase) {
    return explicitBase;
  }

  const repository = process.env.GITHUB_REPOSITORY;

  if (!repository) {
    return "/";
  }

  const repositoryName = repository.split("/")[1];

  if (!repositoryName) {
    return "/";
  }

  if (repositoryName.endsWith(".github.io")) {
    return "/";
  }

  return `/${repositoryName}/`;
}

export default defineConfig({
  base: resolveBasePath()
});
