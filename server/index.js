import 'dotenv/config';
import express from 'express';
import path from 'path';
import os from 'os';
import cluster from 'cluster';
import { fileURLToPath } from 'url';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// ============================================================
// 設定常數 (與 config/constants.ts 對應，伺服器端獨立一份)
// ============================================================
const CONFIG = {
  PORT: process.env.PORT || 3001,
  MAX_BODY_SIZE: '25mb',
  MAX_BASE64_SIZE: 35_000_000,
  MAX_PROMPT_LENGTH: 5000,
  AI_MODEL: 'gemini-2.5-flash-image',
  VALID_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // 速率限制
  RATE_WINDOW_MS: 30 * 60 * 1000,          // 30 分鐘
  MAX_REQUESTS_PER_WINDOW: 100,             // 每人每視窗上限
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000,     // 10 分鐘清理一次

  // 請求隊列 (核心：支援 200 人同時使用)
  MAX_CONCURRENT_AI: 10,                    // AI API 同時最大並發
  MAX_QUEUE_SIZE: 200,                      // 隊列最大長度
  REQUEST_TIMEOUT_MS: 3 * 60 * 1000,       // 單次請求 3 分鐘超時

  // Cluster 模式
  USE_CLUSTER: process.env.NODE_ENV === 'production',
  WORKER_COUNT: Math.min(os.cpus().length, 4), // 最多 4 worker
};

// ============================================================
// Cluster 模式 - 多核心利用 (生產環境)
// ============================================================
if (CONFIG.USE_CLUSTER && cluster.isPrimary) {
  console.log(`[Master] PID: ${process.pid}, 啟動 ${CONFIG.WORKER_COUNT} 個 Worker...`);
  
  for (let i = 0; i < CONFIG.WORKER_COUNT; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.error(`[Master] Worker ${worker.process.pid} 已退出 (code: ${code}, signal: ${signal})，重啟中...`);
    cluster.fork(); // 自動重啟
  });
} else {
  // Worker 或 單機模式
  startServer();
}

// ============================================================
// 請求隊列系統 - 控制 AI API 並發數
// ============================================================
class RequestQueue {
  constructor(maxConcurrent, maxQueueSize) {
    this.maxConcurrent = maxConcurrent;
    this.maxQueueSize = maxQueueSize;
    this.running = 0;
    this.queue = [];
    this.stats = { 
      totalProcessed: 0, 
      totalQueued: 0, 
      totalRejected: 0, 
      totalErrors: 0,
      avgProcessingTime: 0,
      processingTimes: [],
    };
  }

  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      ...this.stats,
      avgProcessingTime: this.stats.processingTimes.length > 0
        ? Math.round(this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length)
        : 0,
    };
  }

  /** 取得目前排隊位置 (從 1 開始) */
  getPosition(task) {
    const idx = this.queue.indexOf(task);
    return idx === -1 ? 0 : idx + 1;
  }

  enqueue(taskFn, onQueueUpdate) {
    return new Promise((resolve, reject) => {
      // 檢查隊列是否已滿
      if (this.queue.length >= this.maxQueueSize) {
        this.stats.totalRejected++;
        reject(new Error('QUEUE_FULL'));
        return;
      }

      const task = { taskFn, resolve, reject, enqueuedAt: Date.now(), onQueueUpdate };
      this.queue.push(task);
      this.stats.totalQueued++;

      // 通知所有排隊中的 task 目前位置
      this._notifyQueuePositions();
      this._processNext();
    });
  }

  _notifyQueuePositions() {
    this.queue.forEach((task, idx) => {
      if (task.onQueueUpdate) {
        task.onQueueUpdate({
          position: idx + 1,
          total: this.queue.length,
          running: this.running,
          maxConcurrent: this.maxConcurrent,
        });
      }
    });
  }

  _processNext() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    this.running++;
    const task = this.queue.shift();
    const startTime = Date.now();

    // 超時保護
    const timeoutId = setTimeout(() => {
      task.reject(new Error('REQUEST_TIMEOUT'));
    }, CONFIG.REQUEST_TIMEOUT_MS);

    task.taskFn()
      .then(result => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        this.stats.processingTimes.push(duration);
        // 只保留最近 100 筆
        if (this.stats.processingTimes.length > 100) {
          this.stats.processingTimes = this.stats.processingTimes.slice(-100);
        }
        this.stats.totalProcessed++;
        task.resolve(result);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        this.stats.totalErrors++;
        task.reject(err);
      })
      .finally(() => {
        this.running--;
        this._notifyQueuePositions(); // 通知剩餘排隊者位置更新
        this._processNext();
      });
  }
}

// ============================================================
// 伺服器主體
// ============================================================
function startServer() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const app = express();
  const aiQueue = new RequestQueue(CONFIG.MAX_CONCURRENT_AI, CONFIG.MAX_QUEUE_SIZE);

  // ============================================================
  // 1. 安全標頭
  // ============================================================
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.googleusercontent.com https://drive.google.com; connect-src 'self' https://script.google.com https://script.googleusercontent.com;"
      );
    }
    next();
  });

  // ============================================================
  // 2. CORS 支援 (方便多裝置存取)
  // ============================================================
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:3001'];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // ============================================================
  // 3. Body Parser
  // ============================================================
  app.use(express.json({ limit: CONFIG.MAX_BODY_SIZE }));

  // ============================================================
  // 4. 速率限制中間件
  // ============================================================
  const rateLimitStore = new Map();

  // 定期清理過期記錄
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const active = timestamps.filter(t => t > now - CONFIG.RATE_WINDOW_MS);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, active);
      }
    }
  }, CONFIG.CLEANUP_INTERVAL_MS);

  const rateLimiter = (req, res, next) => {
    const clientId = req.body?.userId || req.ip || 'unknown';
    const now = Date.now();

    if (!rateLimitStore.has(clientId)) {
      rateLimitStore.set(clientId, []);
    }

    const timestamps = rateLimitStore.get(clientId).filter(t => t > now - CONFIG.RATE_WINDOW_MS);

    if (timestamps.length >= CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        error: `已達使用上限 (${CONFIG.MAX_REQUESTS_PER_WINDOW} 次/${CONFIG.RATE_WINDOW_MS / 60000}分鐘)，請稍後再試。`,
      });
    }

    timestamps.push(now);
    rateLimitStore.set(clientId, timestamps);
    next();
  };

  // ============================================================
  // 5. 請求 ID 中間件 (方便追蹤日誌)
  // ============================================================
  let requestCounter = 0;
  app.use((req, res, next) => {
    req.requestId = `R${++requestCounter}-${Date.now().toString(36)}`;
    next();
  });

  // ============================================================
  // 6. Gemini API Proxy (核心端點 - 帶隊列控制)
  // ============================================================
  app.post('/api/gemini/generate', rateLimiter, async (req, res) => {
    const reqId = req.requestId;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      return res.status(500).json({ success: false, error: 'Server: GEMINI_API_KEY 未設定' });
    }

    const { imageData, mimeType, prompt } = req.body;

    // --- 輸入驗證 ---
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ success: false, error: '缺少圖片資料 (imageData)' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: '缺少處理指令 (prompt)' });
    }
    if (prompt.length > CONFIG.MAX_PROMPT_LENGTH) {
      return res.status(400).json({ success: false, error: `指令過長，上限 ${CONFIG.MAX_PROMPT_LENGTH} 字元` });
    }
    if (imageData.length > CONFIG.MAX_BASE64_SIZE) {
      return res.status(400).json({ success: false, error: '圖片資料過大，上限約 25MB' });
    }

    const safeMimeType = CONFIG.VALID_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg';

    // 告知前端目前隊列狀態
    const queueStats = aiQueue.getStats();
    console.log(`[${reqId}] 進入隊列 (等待: ${queueStats.queued}, 執行中: ${queueStats.running}/${CONFIG.MAX_CONCURRENT_AI})`);

    // 在回應 header 中告知目前等待人數（前端可以用來顯示排隊提示）
    res.setHeader('X-Queue-Position', queueStats.queued + 1);
    res.setHeader('X-Queue-Running', queueStats.running);
    res.setHeader('X-Queue-Max', CONFIG.MAX_CONCURRENT_AI);

    try {
      // 進入隊列等待執行
      const result = await aiQueue.enqueue(async () => {
        console.log(`[${reqId}] 開始 AI 處理...`);
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: CONFIG.AI_MODEL,
          contents: {
            parts: [
              { inlineData: { data: imageData, mimeType: safeMimeType } },
              { text: prompt },
            ],
          },
          config: {
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
          },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
          throw new Error('AI_NO_CONTENT');
        }

        for (const part of parts) {
          if (part.inlineData?.data) {
            return {
              success: true,
              resultDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            };
          }
        }

        throw new Error('AI_TEXT_ONLY');
      });

      console.log(`[${reqId}] 處理完成`);
      return res.json(result);

    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      console.error(`[${reqId}] 錯誤:`, error.message || error);

      // 隊列已滿
      if (msg.includes('queue_full')) {
        return res.status(503).json({
          success: false,
          error: '系統繁忙，所有處理通道已滿載，請稍候 30 秒後重試。',
          retryAfter: 30,
        });
      }

      // 請求超時
      if (msg.includes('request_timeout')) {
        return res.status(504).json({
          success: false,
          error: 'AI 處理超時 (3分鐘)，請重試或選擇較小的圖片。',
        });
      }

      // AI 無內容
      if (msg === 'ai_no_content') {
        return res.status(500).json({ success: false, error: 'AI 未產生任何內容' });
      }

      // AI 只回文字
      if (msg === 'ai_text_only') {
        return res.status(500).json({ success: false, error: 'AI 回傳了文字而非圖片，請調整指令後重試' });
      }

      // API Quota
      if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('resource')) {
        return res.status(429).json({ success: false, error: '系統繁忙 (AI Quota)，請稍後再試' });
      }

      // API Key
      if (msg.includes('403') || msg.includes('api key') || msg.includes('permission')) {
        return res.status(403).json({ success: false, error: 'API 金鑰無效或已過期' });
      }

      // Safety
      if (msg.includes('safety') || msg.includes('blocked')) {
        return res.status(400).json({ success: false, error: '圖片觸發安全審查，請調整選取範圍' });
      }

      return res.status(500).json({ success: false, error: '系統錯誤，請稍後再試' });
    }
  });

  // ============================================================
  // 7. Health Check (含隊列狀態)
  // ============================================================
  app.get('/api/health', (req, res) => {
    const queueStats = aiQueue.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY',
      worker: cluster.isWorker ? cluster.worker.id : 'single',
      pid: process.pid,
      queue: {
        running: queueStats.running,
        waiting: queueStats.queued,
        maxConcurrent: queueStats.maxConcurrent,
        totalProcessed: queueStats.totalProcessed,
        totalErrors: queueStats.totalErrors,
        avgProcessingTimeMs: queueStats.avgProcessingTime,
      },
      memory: {
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  });

  // ============================================================
  // 8. 隊列狀態端點 (前端可用來顯示等待提示)
  // ============================================================
  app.get('/api/queue/status', (req, res) => {
    const stats = aiQueue.getStats();
    res.json({
      available: stats.running < CONFIG.MAX_CONCURRENT_AI,
      position: stats.queued,
      estimatedWaitSec: stats.queued > 0 
        ? Math.round((stats.avgProcessingTime || 30000) / 1000 * Math.ceil(stats.queued / CONFIG.MAX_CONCURRENT_AI))
        : 0,
    });
  });

  // ============================================================
  // 9. 生產環境：提供靜態檔案
  // ============================================================
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ============================================================
  // 10. 啟動伺服器
  // ============================================================
  const server = app.listen(CONFIG.PORT, () => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY';
    const workerId = cluster.isWorker ? ` (Worker #${cluster.worker.id})` : '';
    console.log(`\n=== CleanEstate API Server${workerId} ===`);
    console.log(`    Port:           ${CONFIG.PORT}`);
    console.log(`    Environment:    ${process.env.NODE_ENV || 'development'}`);
    console.log(`    API Key:        ${hasKey ? 'Configured' : 'NOT SET'}`);
    console.log(`    Max Concurrent: ${CONFIG.MAX_CONCURRENT_AI} AI requests`);
    console.log(`    Max Queue:      ${CONFIG.MAX_QUEUE_SIZE} requests`);
    console.log(`    PID:            ${process.pid}`);
    console.log('');
  });

  // ============================================================
  // 11. 優雅關機 (Graceful Shutdown)
  // ============================================================
  const shutdown = (signal) => {
    console.log(`\n[${signal}] 開始優雅關機...`);
    server.close(() => {
      console.log('HTTP 伺服器已關閉');
      process.exit(0);
    });
    // 10 秒後強制關閉
    setTimeout(() => {
      console.error('強制關機 (10s timeout)');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 未捕獲的錯誤處理
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
  });
}
