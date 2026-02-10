
import { AuditRecord } from '../types';

/**
 * storageService - 透過 Google Apps Script 將圖片上傳到 Google Drive
 * 
 * 架構：前端 → GAS doPost → DriveApp 存入 Google Drive 資料夾
 * 清理：GAS 每週時間觸發器自動刪除 > 7天 的圖片
 */

// 取得 GAS URL（複用 sheetService 的 localStorage key）
const getScriptUrl = (): string => {
  return localStorage.getItem('clean_estate_sheet_url') || '';
};

// 圖片快取
let auditCache: AuditRecord[] | null = null;
let lastAuditFetch = 0;
const AUDIT_CACHE_DURATION = 2 * 60 * 1000; // 2 分鐘

export const storageService = {

  /**
   * 上傳處理後的圖片到 Google Drive
   * @param base64Data - base64 字串 (含或不含 data:image/... prefix)
   * @param metadata - 圖片相關資訊
   * @returns 上傳後的 Drive 檔案 URL，失敗時回傳 null
   */
  uploadImage: async (
    base64Data: string,
    metadata: {
      userId: string;
      userName: string;
      fileName: string;
      spaceType?: string;
      mode?: string;
    }
  ): Promise<{ fileUrl: string; fileId: string } | null> => {
    const url = getScriptUrl();
    if (!url) {
      console.warn('⚠️ storageService: No GAS URL configured, skipping upload.');
      return null;
    }

    try {
      // 移除 data:image/xxx;base64, prefix (若有)
      const pureBase64 = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      const mimeType = base64Data.startsWith('data:image/png') 
        ? 'image/png' 
        : 'image/jpeg';

      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload_image',
          imageData: pureBase64,
          mimeType,
          fileName: metadata.fileName || `result_${Date.now()}`,
          userId: metadata.userId,
          userName: metadata.userName,
          spaceType: metadata.spaceType || '',
          mode: metadata.mode || '',
        }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success' && json.fileUrl) {
        // 清除快取以便下次列表能取得新資料
        auditCache = null;
        return { fileUrl: json.fileUrl, fileId: json.fileId };
      }

      console.error('Upload response error:', json);
      return null;
    } catch (e) {
      console.error('storageService.uploadImage failed:', e);
      return null;
    }
  },

  /**
   * 同時上傳原圖和結果圖
   */
  uploadImagePair: async (
    originalBase64: string,
    resultBase64: string,
    metadata: {
      userId: string;
      userName: string;
      fileName: string;
      spaceType?: string;
      mode?: string;
    }
  ): Promise<{ originalUrl: string; resultUrl: string; recordId: string } | null> => {
    const url = getScriptUrl();
    if (!url) {
      console.warn('⚠️ storageService: No GAS URL configured, skipping upload.');
      return null;
    }

    try {
      const cleanBase64 = (data: string) => data.includes(',') ? data.split(',')[1] : data;

      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload_image_pair',
          originalData: cleanBase64(originalBase64),
          resultData: cleanBase64(resultBase64),
          originalMime: originalBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          resultMime: resultBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          fileName: metadata.fileName || `result_${Date.now()}`,
          userId: metadata.userId,
          userName: metadata.userName,
          spaceType: metadata.spaceType || '',
          mode: metadata.mode || '',
        }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success') {
        auditCache = null;
        return {
          originalUrl: json.originalUrl,
          resultUrl: json.resultUrl,
          recordId: json.recordId,
        };
      }

      console.error('Upload pair response error:', json);
      return null;
    } catch (e) {
      console.error('storageService.uploadImagePair failed:', e);
      return null;
    }
  },

  /**
   * 取得審計圖片列表
   */
  getAuditRecords: async (forceRefresh = false): Promise<AuditRecord[]> => {
    // 快取檢查
    if (!forceRefresh && auditCache && (Date.now() - lastAuditFetch < AUDIT_CACHE_DURATION)) {
      return auditCache;
    }

    const url = getScriptUrl();
    if (!url) return [];

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'list_images' }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        auditCache = json.data;
        lastAuditFetch = Date.now();
        return json.data;
      }

      return [];
    } catch (e) {
      console.error('storageService.getAuditRecords failed:', e);
      return auditCache || [];
    }
  },

  /**
   * 手動刪除指定圖片
   */
  deleteImage: async (recordId: string): Promise<boolean> => {
    const url = getScriptUrl();
    if (!url) return false;

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_image', recordId }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success') {
        auditCache = null;
        return true;
      }
      return false;
    } catch (e) {
      console.error('storageService.deleteImage failed:', e);
      return false;
    }
  },

  /**
   * 手動觸發清理（刪除 N 天前的圖片）
   */
  triggerCleanup: async (daysOld: number = 7): Promise<{ deleted: number } | null> => {
    const url = getScriptUrl();
    if (!url) return null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'cleanup_images', daysOld }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success') {
        auditCache = null;
        return { deleted: json.deleted || 0 };
      }
      return null;
    } catch (e) {
      console.error('storageService.triggerCleanup failed:', e);
      return null;
    }
  },

  /**
   * 取得雲端儲存統計
   */
  getStorageStats: async (): Promise<{ totalFiles: number; totalSizeMB: number } | null> => {
    const url = getScriptUrl();
    if (!url) return null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'storage_stats' }),
        headers: { 'Content-Type': 'text/plain' },
      });

      const json = await res.json();
      if (json.status === 'success') {
        return { totalFiles: json.totalFiles, totalSizeMB: json.totalSizeMB };
      }
      return null;
    } catch (e) {
      console.error('storageService.getStorageStats failed:', e);
      return null;
    }
  },

  clearCache: () => {
    auditCache = null;
    lastAuditFetch = 0;
  },
};
