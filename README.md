# 凱文大叔課程檔期板

以 `GitHub Pages + GitHub Actions + GitHub Issue Forms` 建立的靜態課程清單網站。

## 本地開發

```powershell
npm install
npm run dev
```

## 本地測試

```powershell
npm test
npm run build
```

## GitHub 設定

1. 將專案推到 GitHub。
2. 到 `Settings > Pages`，將 `Build and deployment` 設為 `GitHub Actions`。
3. 到 `Settings > Secrets and variables > Actions > Variables`。
4. 新增 Repository Variable：`ALLOWED_PUBLISHERS`
5. 值填入允許發布課程的 GitHub 帳號，多個帳號用逗號分隔，例如：

```text
kevintsai
```

## 發布流程

1. 使用 `新增課程／講座` Issue Form 建立課程
2. workflow 自動驗證欄位與作者
3. 驗證成功加上 `publish-ready`
4. 網站重新建置並部署
5. 部署成功後加上 `published`

## 標籤說明

- `publish-ready`：驗證通過，可發布
- `needs-fix`：驗證失敗，需修正
- `published`：已進入最新網站輸出
