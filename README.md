<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CleanEstate AI - 房仲 AI 圖片生成系統

> 使用 Gemini AI 為房仲照片自動去雜物、虛擬佈置傢俱的 Web 應用程式

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 後端 (自建) | Express + Node.js (含隊列系統、速率限制) |
| 後端 (Cloudflare) | Cloudflare Pages Functions (Serverless) |
| AI | Google Gemini 2.5 Flash Image |
| 資料管理 | Google Apps Script + Google Sheets + Drive |

## 本地開發

**前置需求：** Node.js 18+

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，填入你的 GEMINI_API_KEY

# 3. 啟動開發伺服器 (前端 + 後端)
npm run dev:server   # 啟動 Express API 伺服器 (port 3001)
npm run dev          # 啟動 Vite 開發伺服器 (port 3000)
```

## 部署到 Cloudflare Pages

### 方式一：透過 Cloudflare Dashboard（推薦）

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create**
2. 選擇 **Pages** → **Connect to Git**
3. 選擇 GitHub 倉庫 `CleanEstate-AI`
4. 設定建置組態：
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`（預設）
   - **Node.js version:** `18`（在 Environment variables 加 `NODE_VERSION = 18`）
5. 設定環境變數（**Settings → Environment variables**）：
   - `GEMINI_API_KEY` = 你的 Gemini API Key（設為 **Encrypted**）
6. 點擊 **Save and Deploy**

> 部署完成後會獲得一個 `*.pages.dev` 網址，之後每次 push 到 `master` 分支會自動重新部署。

### 方式二：透過 CLI

```bash
# 安裝 Wrangler CLI
npm install -g wrangler

# 登入 Cloudflare
wrangler login

# 建置並部署
npm run build
npx wrangler pages deploy dist
```

首次部署時會引導你建立專案，之後在 Dashboard 中設定 `GEMINI_API_KEY` 環境變數。

### Cloudflare Functions 說明

專案的 `functions/` 目錄包含 Cloudflare Pages Functions，會自動部署為 Serverless API：

| 檔案 | 端點 | 說明 |
|------|------|------|
| `functions/api/gemini/generate.js` | `POST /api/gemini/generate` | Gemini AI 代理（隱藏 API Key） |
| `functions/api/queue/status.js` | `GET /api/queue/status` | 隊列狀態 |
| `functions/api/health.js` | `GET /api/health` | 健康檢查 |
| `functions/api/_middleware.js` | — | CORS + 安全標頭中間件 |

## 部署到自建伺服器（Express）

如果需要完整的隊列系統和多核心支援：

```bash
# 建置前端
npm run build

# 設定環境變數
export GEMINI_API_KEY=your_key_here
export NODE_ENV=production
export PORT=3001

# 啟動伺服器
npm start
```

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API Key ([取得](https://aistudio.google.com/apikey)) |
| `PORT` | ❌ | Express 伺服器端口（預設 3001） |
| `NODE_ENV` | ❌ | 環境模式（development / production） |
| `ALLOWED_ORIGINS` | ❌ | CORS 允許的來源（逗號分隔） |

## 專案結構

```
├── index.html              # 入口 HTML
├── index.tsx               # React 入口
├── App.tsx                 # 根元件
├── components/             # UI 元件
│   ├── EditorView.tsx      # 編輯器主頁
│   ├── LoginView.tsx       # 登入頁
│   ├── AdminDashboard.tsx  # 管理後台
│   ├── CanvasEditor.tsx    # Canvas 畫布編輯器
│   └── admin/              # 管理後台子元件
├── services/               # 服務層
│   ├── geminiService.ts    # Gemini AI 呼叫
│   ├── sheetService.ts     # Google Sheets 操作
│   └── imageUtils.ts       # 圖片處理工具
├── config/                 # 設定檔
├── server/                 # Express 後端
│   └── index.js            # API 伺服器
├── functions/              # Cloudflare Pages Functions
│   └── api/                # API 端點
├── GAS_v3.js              # Google Apps Script
└── wrangler.toml          # Cloudflare 設定
```
