/**
 * 建立 GitHub API 請求必要的環境設定。
 */
function getGitHubContext() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token) {
    throw new Error("缺少 GITHUB_TOKEN。");
  }

  if (!repository) {
    throw new Error("缺少 GITHUB_REPOSITORY。");
  }

  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY 格式錯誤：${repository}`);
  }

  return { token, owner, repo };
}

/**
 * 封裝 GitHub REST API 請求，集中處理授權與錯誤訊息。
 */
export async function githubRequest(path, init = {}) {
  const { token } = getGitHubContext();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "course-schedule-bot",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API 失敗 ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * 取得目前倉庫資訊，供其他模組組裝 API 路徑使用。
 */
export function getRepositoryContext() {
  return getGitHubContext();
}

/**
 * 取得特定 issue 的所有留言。
 */
export async function listIssueComments(issueNumber) {
  const { owner, repo } = getRepositoryContext();
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`);
}

/**
 * 更新 issue 標籤為指定集合，避免狀態殘留。
 */
export async function replaceIssueLabels(issueNumber, labels) {
  const { owner, repo } = getRepositoryContext();
  await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    body: JSON.stringify({
      labels
    })
  });
}

/**
 * 新增留言或更新現有驗證留言，讓 issue 只保留一則系統回覆。
 */
export async function upsertIssueComment(issueNumber, marker, body) {
  const { owner, repo } = getRepositoryContext();
  const comments = await listIssueComments(issueNumber);
  const existingComment = comments.find((comment) => comment.body.includes(marker));
  const nextBody = `${marker}\n${body}`;

  if (existingComment) {
    await githubRequest(`/repos/${owner}/${repo}/issues/comments/${existingComment.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        body: nextBody
      })
    });
    return;
  }

  await githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: nextBody
    })
  });
}

/**
 * 刪除帶有指定 marker 的系統留言，避免驗證成功後仍留錯誤提醒。
 */
export async function deleteIssueCommentByMarker(issueNumber, marker) {
  const { owner, repo } = getRepositoryContext();
  const comments = await listIssueComments(issueNumber);
  const existingComment = comments.find((comment) => comment.body.includes(marker));

  if (!existingComment) {
    return;
  }

  await githubRequest(`/repos/${owner}/${repo}/issues/comments/${existingComment.id}`, {
    method: "DELETE"
  });
}

/**
 * 列出 open issue，支援 label 過濾並排除 pull request。
 */
export async function listRepositoryIssues({ state = "open", labels } = {}) {
  const { owner, repo } = getRepositoryContext();
  const searchParams = new URLSearchParams({
    state,
    per_page: "100"
  });

  if (labels) {
    searchParams.set("labels", labels);
  }

  const issues = await githubRequest(`/repos/${owner}/${repo}/issues?${searchParams.toString()}`);
  return issues.filter((issue) => !issue.pull_request);
}

