// ============================================================
// 統一日誌服務 - 集中管理所有 console 輸出
// 方便除錯、追蹤問題、可隨時關閉或導向外部日誌系統
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// 可在此控制是否輸出各等級日誌 (生產環境可關閉 debug)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 控制最低輸出等級 - 開發時設 debug，生產時可設 warn
const MIN_LEVEL: LogLevel = 'debug';

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #888; font-weight: normal;',
  info: 'color: #00f3ff; font-weight: bold;',
  warn: 'color: #ff6b00; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '[DEBUG]',
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
};

class Logger {
  private module: string;
  private history: LogEntry[] = [];
  private static MAX_HISTORY = 500;
  private static instances: Map<string, Logger> = new Map();

  private constructor(module: string) {
    this.module = module;
  }

  /** 建立或取得模組專用的 Logger 實例 */
  static create(module: string): Logger {
    if (!Logger.instances.has(module)) {
      Logger.instances.set(module, new Logger(module));
    }
    return Logger.instances.get(module)!;
  }

  /** 取得所有日誌歷史 (用於除錯頁面或匯出) */
  static getHistory(): LogEntry[] {
    const all: LogEntry[] = [];
    for (const instance of Logger.instances.values()) {
      all.push(...instance.history);
    }
    return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** 清除所有日誌歷史 */
  static clearHistory(): void {
    for (const instance of Logger.instances.values()) {
      instance.history = [];
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

    const entry: LogEntry = {
      level,
      module: this.module,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    // 儲存到歷史
    this.history.push(entry);
    if (this.history.length > Logger.MAX_HISTORY) {
      this.history = this.history.slice(-Logger.MAX_HISTORY);
    }

    // 輸出到 console
    const prefix = `%c${LEVEL_ICONS[level]} [${this.module}]`;
    const style = LEVEL_STYLES[level];

    if (data !== undefined) {
      console[level === 'debug' ? 'log' : level](prefix, style, message, data);
    } else {
      console[level === 'debug' ? 'log' : level](prefix, style, message);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }
}

export { Logger };
export type { LogEntry, LogLevel };
