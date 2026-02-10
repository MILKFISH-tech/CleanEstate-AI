
import { User, UserStatus } from '../types';
import { UsageDecision, usageLockService } from './usageLockService';

const STORAGE_KEY = 'clean_estate_sheet_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKZuIcKsI_n1T35e4oomUU-gA6y-UGHA86SZXr0fRU3LsBJGTnRvUsg0cgKLBkKhDs-Q/exec';

// 緩存設定
let userCache: User[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 緩存 5 分鐘

// 預設 Mock Data (當連線失敗或未設定時使用)
const MOCK_USERS: User[] = [
  { id: 'A888', name: '測試員工 (Local)', phone: '0900000000', todayUsage: 5, status: 'active' },
  { id: 'ADMIN', name: '系統管理員 (Local)', phone: '0000', todayUsage: 0, status: 'active' },
];

export const sheetService = {
  // 取得目前設定的 URL
  getScriptUrl: (): string => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_SCRIPT_URL;
  },

  // 設定新的 URL (並清除緩存)
  setScriptUrl: (url: string) => {
    localStorage.setItem(STORAGE_KEY, url.trim());
    sheetService.clearCache();
  },

  clearCache: () => {
      userCache = null;
      lastFetchTime = 0;
  },

  // 測試連線
  testConnection: async (url: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!url) return { success: false, message: "網址為空" };
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      const json = await res.json();
      if (json.status === 'success' || Array.isArray(json.data)) {
         return { success: true, message: "連線成功！資料結構正確。" };
      } else {
         return { success: false, message: "連線成功但回傳格式錯誤 (缺少 status: success)" };
      }
    } catch (e: any) {
      console.error(e);
      return { success: false, message: `連線失敗: ${e.message || "CORS 或 權限錯誤"}` };
    }
  },

  getUsers: async (forceRefresh = false): Promise<User[]> => {
    const url = sheetService.getScriptUrl();
    
    // 1. Check Cache (Speed Optimization)
    if (!forceRefresh && userCache && (Date.now() - lastFetchTime < CACHE_DURATION)) {
        console.log("🚀 Using Cached Users Data");
        return userCache;
    }
    
    if (!url) {
      console.warn("⚠️ No Sheet URL configured. Using Mock Data.");
      return new Promise(resolve => setTimeout(() => resolve(MOCK_USERS), 500));
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network response was not ok");
      
      const json = await res.json();
      if (json.status === 'success') {
        // Update Cache
        userCache = json.data;
        lastFetchTime = Date.now();
        return json.data;
      }
      throw new Error(json.message || "Failed to fetch users");
    } catch (e) {
      console.error("Sheet Fetch Error:", e);
      return userCache || MOCK_USERS; // Return cache if network fails, else Mock
    }
  },

  addUsers: async (users: Partial<User>[]): Promise<void> => {
    sheetService.clearCache(); // Invalidate cache
    const url = sheetService.getScriptUrl();
    
    if (!url) {
      MOCK_USERS.push(...users as User[]); 
      return;
    }

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'add_users', users }),
      headers: { 'Content-Type': 'text/plain' } 
    });
  },

  updateUser: async (id: string, data: { name: string, phone: string }): Promise<void> => {
    sheetService.clearCache();
    const url = sheetService.getScriptUrl();
    if (!url) {
        const index = MOCK_USERS.findIndex(u => u.id === id);
        if (index !== -1) MOCK_USERS[index] = { ...MOCK_USERS[index], ...data };
        return;
    }

    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_user', id, data }),
        headers: { 'Content-Type': 'text/plain' }
    });
  },

  updateStatus: async (id: string, status: UserStatus): Promise<void> => {
    sheetService.clearCache();
    const url = sheetService.getScriptUrl();
    if (!url) {
        const index = MOCK_USERS.findIndex(u => u.id === id);
        if (index !== -1) MOCK_USERS[index].status = status;
        return;
    }
    await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'update_status', id, status }),
        headers: { 'Content-Type': 'text/plain' }
    });
  },

  logUsage: async (userId: string, details: string): Promise<void> => {
    // Usage logs usually don't affect user list cache, so strictly no cache clearing needed
    // unless we track usage count in the user list.
    // If we track usage count, we should clear cache or optimistically update it.
    // For performance, let's NOT clear cache on every log, but wait for refresh.
    const url = sheetService.getScriptUrl();
    if (!url) return;
    
    fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'log_usage', userId, details }),
        headers: { 'Content-Type': 'text/plain' }
    }).catch(console.error);
  }

  ,

  // Usage policy enforcement: prefer remote if Apps Script supports it; fallback to local.
  enforceUsagePolicy: async (userId: string): Promise<UsageDecision> => {
    const url = sheetService.getScriptUrl();
    if (!url) {
      return usageLockService.checkAndRecordLocal(userId);
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'check_usage', userId, now: Date.now() }),
        headers: { 'Content-Type': 'text/plain' }
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!json || json.status !== 'success') throw new Error(json?.message || 'Invalid response');

      // Expected: {status:'success', allowed:boolean, lockedUntil?:number, remaining?:number, reason?:string}
      const decision: UsageDecision = {
        allowed: !!json.allowed,
        lockedUntil: typeof json.lockedUntil === 'number' ? json.lockedUntil : undefined,
        remaining: typeof json.remaining === 'number' ? json.remaining : undefined,
        reason: typeof json.reason === 'string' ? json.reason : undefined,
        source: 'remote'
      };
      return decision;
    } catch (e) {
      console.warn('Remote usage policy failed, fallback to local:', e);
      return usageLockService.checkAndRecordLocal(userId);
    }
  }
};
