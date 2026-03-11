/**
 * 課程資料型別，對應 GitHub Actions 產出的靜態 JSON。
 */
export interface Course {
  id: string;
  issueNumber: number;
  title: string;
  outline: string;
  content: string;
  startAt: string;
  endAt: string;
  price: number;
  notes: string;
  signupUrl: string;
  imageUrl: string;
  isFree: boolean;
  createdBy: string;
  labels: string[];
  updatedAt: string;
}

/**
 * 站點資料型別，供首頁渲染與焦點課程查找使用。
 */
export interface SiteData {
  generatedAt: string;
  timezone: string;
  featuredCourseId: string | null;
  courses: Course[];
}

