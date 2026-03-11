/**
 * 產生驗證失敗留言，明確列出需要修正的欄位與格式。
 */
export function buildFailureComment(errors) {
  const lines = errors.map((error) => `- ${error}`).join("\n");

  return `課程資料驗證失敗，請修正以下內容：\n\n${lines}\n\n修正後重新儲存 Issue，系統會自動再次驗證。`;
}

