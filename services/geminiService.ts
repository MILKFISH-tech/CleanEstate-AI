// ============================================================
// Gemini Service - 透過後端 Proxy 呼叫 AI
// 統一錯誤處理、重試機制、日誌追蹤
// ============================================================

import { QualityLevel } from "../types";
import { optimizeImage, createCompositeVisualPrompt } from "./imageUtils";
import { Logger } from "./logger";
import { RETRY_CONFIG } from "../config/constants";

const log = Logger.create('GeminiService');
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- 錯誤訊息映射 ---
const mapGeminiError = (error: any): string => {
  const msg = (error.message || error.toString()).toLowerCase();
  
  if (msg.includes("abort") || msg.includes("cancel")) return "ABORTED";
  if (msg.includes("api key") || msg.includes("403") || msg.includes("金鑰")) return "API 金鑰無效或過期";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("繁忙") || msg.includes("上限")) return "系統繁忙，請稍後再試";
  if (msg.includes("queue_full") || msg.includes("503")) return "系統繁忙，所有通道滿載，請稍候重試";
  if (msg.includes("timeout") || msg.includes("504") || msg.includes("超時")) return "AI 處理超時，請重試或選擇較小的圖片";
  if (msg.includes("500") || msg.includes("overloaded")) return "AI 伺服器暫時無法回應";
  if (msg.includes("safety") || msg.includes("blocked") || msg.includes("安全")) return "圖片觸發安全審查，請調整選取範圍";
  if (msg.includes("type") || msg.includes("format")) return "圖片格式不支援";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed")) return "網路連線不穩定";
  
  return `系統錯誤: ${msg.substring(0, 80)}`;
};

// --- 模擬模式 (API 失敗時的降級方案) ---
const runSimulationMode = async (originalFile: File, onProgress?: (msg: string) => void, reason: string = "API Quota Exceeded"): Promise<string> => {
  if (onProgress) onProgress(`模擬模式: ${reason}`);
  log.warn('進入模擬模式', { reason });
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(originalFile);
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const bannerHeight = Math.max(60, canvas.height * 0.1);
        ctx.fillStyle = "rgba(24, 24, 27, 0.8)"; 
        ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);
        ctx.font = `bold ${Math.max(24, canvas.height * 0.04)}px monospace`;
        ctx.fillStyle = "#ff6b00";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`SIMULATION MODE: ${reason}`, canvas.width / 2, canvas.height - (bannerHeight / 2));
      }
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png').split(',')[1]); 
    };
    img.src = url;
  });
};

// --- 指數退避重試 ---
const retryWithBackoff = async <T>(
  fn: () => Promise<T>, 
  signal: AbortSignal,
  retries: number = RETRY_CONFIG.MAX_RETRIES, 
  baseDelay: number = RETRY_CONFIG.BASE_DELAY, 
  onProgress?: (msg: string) => void
): Promise<T> => {
  try {
    if (signal.aborted) throw new Error("Operation cancelled");
    return await fn();
  } catch (error: any) {
    if (signal.aborted || error.message === "Operation cancelled") throw error;
    if (retries === 0) throw error;

    const msg = (typeof error === 'string' ? error : error instanceof Error ? error.message : JSON.stringify(error)).toLowerCase();

    const shouldRetry = 
      msg.includes("429") || msg.includes("quota") || msg.includes("exhausted") ||
      msg.includes("resource") || msg.includes("overloaded") || msg.includes("busy") ||
      msg.includes("繁忙") || msg.includes("timeout") || msg.includes("fetch failed") ||
      msg.includes("queue_full");

    if (shouldRetry) {
      const waitTime = baseDelay * (2 ** (RETRY_CONFIG.MAX_RETRIES - retries)) + Math.random() * 1000;
      const seconds = (waitTime / 1000).toFixed(1);
      
      log.info(`重試中 (剩餘 ${retries} 次)`, { waitTime: seconds + 's' });
      if (onProgress) onProgress(`系統繁忙，${seconds}秒後重試...`);

      await delay(waitTime);
      return retryWithBackoff(fn, signal, retries - 1, baseDelay, onProgress);
    }
    throw error;
  }
};

// --- 查詢隊列狀態 ---
export const getQueueStatus = async (): Promise<{ available: boolean; position: number; estimatedWaitSec: number }> => {
  try {
    const res = await fetch('/api/queue/status');
    if (!res.ok) return { available: true, position: 0, estimatedWaitSec: 0 };
    return await res.json();
  } catch {
    return { available: true, position: 0, estimatedWaitSec: 0 };
  }
};

// --- 呼叫後端 Proxy ---
const callGeminiProxy = async (
  imageData: string,
  mimeType: string,
  prompt: string,
  signal: AbortSignal,
  userId?: string,
  onProgress?: (msg: string) => void
): Promise<string> => {
  // 先查詢隊列狀態，給使用者排隊提示
  if (onProgress) {
    const queueStatus = await getQueueStatus();
    if (queueStatus.position > 0) {
      const waitMin = Math.ceil(queueStatus.estimatedWaitSec / 60);
      onProgress(`排隊中（前方 ${queueStatus.position} 人，預估 ${waitMin > 0 ? waitMin + ' 分鐘' : '即將開始'}）...`);
    } else {
      onProgress('AI 處理中...');
    }
  }

  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, mimeType, prompt, userId }),
    signal,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error || `API 錯誤 (HTTP ${response.status})`);
  }

  return json.resultDataUrl;
};

// --- 主要匯出函數 ---
export const removeObjectsWithGemini = async (
  originalFile: File,
  maskBlob: Blob | undefined, 
  customInstructions: string,
  quality: QualityLevel,
  signal: AbortSignal,
  onProgress?: (msg: string) => void
): Promise<string> => {
  if (signal.aborted) throw new Error("Operation cancelled");

  const startTime = Date.now();
  log.info('開始處理圖片', { fileName: originalFile.name, hasMask: !!maskBlob, quality });

  try {
    let imageData: string;
    let mimeType: string;
    let finalPrompt = "";
    
    let qualitySuffix = "Ensure standard professional real estate photo quality.";
    if (quality === 'high') {
      qualitySuffix = "CRITICAL: Photorealistic, 4k resolution details, sharp textures, perfect lighting, no blur.";
    }

    if (maskBlob) {
      if (onProgress) onProgress("圖片壓縮合成中...");
      imageData = await createCompositeVisualPrompt(originalFile, maskBlob);
      mimeType = 'image/png';
      if (signal.aborted) throw new Error("Operation cancelled");
      
      finalPrompt = `
        TASK: Image Inpainting.
        INPUT: Image with MAGENTA (#FF00FF) mask.
        ACTION: Identify magenta areas. Replace/Remove based on: "${customInstructions}".
        CONTEXT: Fill naturally with background (floor, wall).
        QUALITY: ${qualitySuffix}
      `;
    } else {
      if (onProgress) onProgress("壓縮上傳中...");
      imageData = await optimizeImage(originalFile);
      mimeType = 'image/jpeg';
      if (signal.aborted) throw new Error("Operation cancelled");
      
      finalPrompt = `
        TASK: Virtual Staging / Redesign.
        INSTRUCTIONS: "${customInstructions}"
        CONSTRAINTS: Maintain structural perspective. Output ONLY image.
        QUALITY: ${qualitySuffix}
      `;
    }

    if (onProgress) onProgress("連接 AI 伺服器...");
    
    const result = await retryWithBackoff(
      () => callGeminiProxy(imageData, mimeType, finalPrompt, signal, undefined, onProgress),
      signal,
      RETRY_CONFIG.MAX_RETRIES, 
      RETRY_CONFIG.BASE_DELAY, 
      onProgress
    );

    const duration = Date.now() - startTime;
    log.info(`處理完成 (${(duration / 1000).toFixed(1)}s)`, { fileName: originalFile.name });
    return result;

  } catch (error: any) {
    if (signal.aborted || error.message === "Operation cancelled") {
      log.info('使用者取消處理');
      throw new Error("Operation cancelled");
    }

    const friendlyMsg = mapGeminiError(error);
    log.error('Gemini API 錯誤', { message: friendlyMsg, original: error.message });
    
    const isHardFailure = friendlyMsg.includes("伺服器") || friendlyMsg.includes("繁忙");
    if (isHardFailure) {
      return await runSimulationMode(originalFile, onProgress, friendlyMsg);
    }
    throw new Error(friendlyMsg);
  }
};
