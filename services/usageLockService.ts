// ============================================================
// UsageLockService - 本地端使用量追蹤與鎖定
// ============================================================

import { RATE_LIMIT_CONFIG, STORAGE_CONFIG } from '../config/constants';
import { Logger } from './logger';

const log = Logger.create('UsageLock');

export interface UsageDecision {
  allowed: boolean;
  lockedUntil?: number;
  remaining?: number;
  reason?: string;
  source: 'remote' | 'local';
}

interface LocalUsageState {
  attempts: number[];
  lockedUntil?: number;
}

const storageKey = (userId: string) => `${STORAGE_CONFIG.USAGE_KEY_PREFIX}${userId}`;

const loadState = (userId: string): LocalUsageState => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { attempts: [] };
    const parsed = JSON.parse(raw) as LocalUsageState;
    if (!parsed || !Array.isArray(parsed.attempts)) return { attempts: [] };
    return {
      attempts: parsed.attempts.filter(n => typeof n === 'number' && Number.isFinite(n)),
      lockedUntil: typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : undefined
    };
  } catch {
    return { attempts: [] };
  }
};

const saveState = (userId: string, state: LocalUsageState) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
};

const formatTaipeiTime = (epochMs: number) => {
  try {
    return new Date(epochMs).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' });
  } catch {
    return new Date(epochMs).toLocaleString('zh-TW', { hour12: false });
  }
};

export const usageLockService = {
  checkAndRecordLocal: (userId: string, now: number = Date.now()): UsageDecision => {
    const state = loadState(userId);

    // 1) 現有鎖定
    if (state.lockedUntil && now < state.lockedUntil) {
      log.warn('使用者被鎖定', { userId, until: formatTaipeiTime(state.lockedUntil) });
      return {
        allowed: false,
        lockedUntil: state.lockedUntil,
        reason: `已達使用上限，帳號已鎖定至 ${formatTaipeiTime(state.lockedUntil)}`,
        source: 'local'
      };
    }

    // 2) 滾動視窗清理
    const windowStart = now - RATE_LIMIT_CONFIG.WINDOW_MS;
    const attempts = state.attempts.filter(ts => ts >= windowStart && ts <= now);

    // 3) 超過限制 → 鎖定
    if (attempts.length >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      const lockedUntil = now + RATE_LIMIT_CONFIG.LOCK_DURATION_MS;
      saveState(userId, { attempts, lockedUntil });
      log.warn('使用者達到限制，已鎖定', { userId, attempts: attempts.length });
      return {
        allowed: false,
        lockedUntil,
        remaining: 0,
        reason: `30 分鐘內使用已達 ${RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW} 次，已鎖定至 ${formatTaipeiTime(lockedUntil)}`,
        source: 'local'
      };
    }

    // 4) 記錄此次使用
    attempts.push(now);
    saveState(userId, { attempts });

    return {
      allowed: true,
      remaining: Math.max(0, RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_WINDOW - attempts.length),
      source: 'local'
    };
  }
};
