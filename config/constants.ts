// ============================================================
// 全域設定常數 - 所有魔術數字集中在此管理
// 修改此檔案即可調整系統行為，無需深入各元件
// ============================================================

// --- 圖片處理設定 ---
export const IMAGE_CONFIG = {
  /** 上傳檔案大小上限 (MB) */
  MAX_FILE_SIZE_MB: 20,
  /** 上傳檔案大小上限 (bytes) */
  get MAX_FILE_SIZE_BYTES() { return this.MAX_FILE_SIZE_MB * 1024 * 1024; },
  /** 允許的圖片格式 */
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as string[],
  /** 同時載入照片上限 */
  MAX_TOTAL_PHOTOS: 10,
  /** AI 處理前壓縮最大邊長 (px) */
  MAX_DIMENSION: 1536,
  /** JPEG 壓縮品質 (0-1) */
  JPEG_QUALITY: 0.85,
} as const;

// --- 使用限制設定 ---
export const RATE_LIMIT_CONFIG = {
  /** 滾動視窗長度 (毫秒) - 30 分鐘 */
  WINDOW_MS: 30 * 60 * 1000,
  /** 視窗內最大請求數 */
  MAX_REQUESTS_PER_WINDOW: 100,
  /** 超過限制後鎖定時長 (毫秒) - 12 小時 */
  LOCK_DURATION_MS: 12 * 60 * 60 * 1000,
  /** 伺服器端速率限制清理週期 (毫秒) - 10 分鐘 */
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000,
} as const;

// --- 登入安全設定 ---
export const AUTH_CONFIG = {
  /** 最大登入嘗試次數 */
  MAX_LOGIN_ATTEMPTS: 5,
  /** 鎖定時長 (毫秒) - 15 分鐘 */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
} as const;

// --- 快取設定 ---
export const CACHE_CONFIG = {
  /** 使用者列表快取有效期 (毫秒) - 5 分鐘 */
  USER_CACHE_TTL: 5 * 60 * 1000,
  /** 審計記錄快取有效期 (毫秒) - 2 分鐘 */
  AUDIT_CACHE_TTL: 2 * 60 * 1000,
} as const;

// --- Canvas 編輯器設定 ---
export const CANVAS_CONFIG = {
  /** 預設筆刷大小 */
  DEFAULT_BRUSH_SIZE: 20,
  /** 最小筆刷大小 */
  MIN_BRUSH_SIZE: 1,
  /** 最大筆刷大小 */
  MAX_BRUSH_SIZE: 100,
  /** 最大歷史記錄數 */
  MAX_HISTORY_STATES: 10,
  /** 最小縮放比例 */
  MIN_ZOOM: 0.1,
  /** 最大縮放比例 */
  MAX_ZOOM: 5,
  /** 縮放步進 */
  ZOOM_STEP: 0.1,
  /** 橡皮擦筆刷顏色 */
  ERASER_BRUSH_COLOR: 'rgba(255, 107, 0, 0.8)',
  /** 軟裝筆刷顏色 */
  STAGING_BRUSH_COLOR: 'rgba(0, 243, 255, 0.7)',
  /** Mask 透明度閾值 */
  MASK_ALPHA_THRESHOLD: 10,
  /** Mask 紅色通道閾值 (for magenta conversion) */
  MASK_RED_THRESHOLD: 50,
} as const;

// --- 伺服器設定 ---
export const SERVER_CONFIG = {
  /** 預設伺服器端口 */
  DEFAULT_PORT: 3001,
  /** 最大 Body 大小 */
  MAX_BODY_SIZE: '25mb',
  /** Base64 圖片大小上限 (bytes) - 約 25MB 圖片 */
  MAX_BASE64_SIZE: 35_000_000,
  /** Prompt 最大字元數 */
  MAX_PROMPT_LENGTH: 5000,
  /** AI 模型名稱 */
  AI_MODEL: 'gemini-2.5-flash-image',
  /** 請求隊列 - 同時處理的最大並發數 */
  MAX_CONCURRENT_AI_REQUESTS: 10,
  /** 請求隊列 - 最大等待長度 */
  MAX_QUEUE_SIZE: 200,
  /** 請求超時時間 (毫秒) - 3 分鐘 */
  REQUEST_TIMEOUT_MS: 3 * 60 * 1000,
  /** 有效的 MIME 類型 */
  VALID_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// --- Gemini 客戶端重試設定 ---
export const RETRY_CONFIG = {
  /** 最大重試次數 */
  MAX_RETRIES: 3,
  /** 重試基礎延遲 (毫秒) */
  BASE_DELAY: 2000,
} as const;

// --- 儲存服務設定 ---
export const STORAGE_CONFIG = {
  /** LocalStorage 的 GAS URL key */
  SHEET_URL_KEY: 'clean_estate_sheet_url',
  /** LocalStorage 的登入鎖定 key */
  LOGIN_LOCK_KEY: 'ce_login_lock',
  /** 使用量追蹤 key prefix */
  USAGE_KEY_PREFIX: 'cleanestate_usage_v1:',
  /** Google Drive 清理天數 */
  CLEANUP_DAYS: 7,
} as const;

// --- UI 響應式斷點 ---
export const BREAKPOINTS = {
  /** 手機 */
  SM: 640,
  /** 平板 */
  MD: 768,
  /** 小桌面 */
  LG: 1024,
  /** 大桌面 */
  XL: 1280,
} as const;
