import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * 將課程 markdown 內容轉為 HTML，供詳細內容區塊顯示。
 */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string;
}
