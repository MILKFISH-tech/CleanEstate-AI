// ============================================================
// OverviewTab - 管理員儀表板概覽頁面
// ============================================================

import React from 'react';
import { Image as ImageIcon, Users, TrendingUp, Link as LinkIcon, HardDrive, Clock } from 'lucide-react';
import { User } from '../../types';

interface OverviewTabProps {
  users: User[];
  isConnected: boolean;
  storageStats: { totalFiles: number; totalSizeMB: number } | null;
  onShowSettings: () => void;
  onNavigateToAudit: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  users, isConnected, storageStats, onShowSettings, onNavigateToAudit,
}) => {
  const totalUsage = users.reduce((acc, u) => acc + (u.todayUsage || 0), 0);
  const activeCount = users.filter(u => u.status === 'active').length;
  const topUser = [...users].sort((a, b) => (b.todayUsage || 0) - (a.todayUsage || 0))[0];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <div className="bg-zinc-900/50 p-4 lg:p-6 rounded border border-zinc-800 flex flex-col justify-between h-28 lg:h-32 hover:border-neon-orange/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">總處理圖片數</span>
            <div className="p-1.5 lg:p-2 bg-black text-neon-orange rounded border border-zinc-800 group-hover:text-white"><ImageIcon size={16} /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-mono text-white">{totalUsage} <span className="text-xs text-zinc-600 font-sans">張</span></div>
        </div>
        
        <div className="bg-zinc-900/50 p-4 lg:p-6 rounded border border-zinc-800 flex flex-col justify-between h-28 lg:h-32 hover:border-neon-orange/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">活躍用戶</span>
            <div className="p-1.5 lg:p-2 bg-black text-neon-blue rounded border border-zinc-800 group-hover:text-white"><Users size={16} /></div>
          </div>
          <div className="text-2xl lg:text-3xl font-mono text-white">{activeCount} <span className="text-xs text-zinc-600 font-sans">/ {users.length}</span></div>
        </div>
        
        <div className="bg-zinc-900/50 p-4 lg:p-6 rounded border border-zinc-800 flex flex-col justify-between h-28 lg:h-32 hover:border-neon-orange/50 transition-colors group">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">最佳貢獻者</span>
            <div className="p-1.5 lg:p-2 bg-black text-purple-500 rounded border border-zinc-800 group-hover:text-white"><TrendingUp size={16} /></div>
          </div>
          <div>
            <div className="text-base lg:text-lg font-bold text-white truncate">{topUser?.name || '--'}</div>
            <div className="text-[10px] text-zinc-500 mt-1 uppercase">今日用量: {topUser?.todayUsage || 0}</div>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 p-4 lg:p-6 rounded border border-zinc-800 flex flex-col justify-between h-28 lg:h-32 border-l-4 border-l-zinc-700 cursor-pointer hover:bg-zinc-900" onClick={onShowSettings}>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">資料庫狀態</span>
            <div className="p-1.5 lg:p-2 bg-black text-zinc-400 rounded border border-zinc-800"><LinkIcon size={16} /></div>
          </div>
          <div>
            <div className={`text-sm font-bold font-mono ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? '已連線' : '未連線'}
            </div>
            <div className="text-[10px] text-zinc-600 mt-1 uppercase">{isConnected ? 'Google Sheet Active' : '按此設定連結'}</div>
          </div>
        </div>
      </div>

      {/* 雲端儲存統計 */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded p-4 lg:p-6 hover:border-zinc-700 transition-colors cursor-pointer" onClick={onNavigateToAudit}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3">
            <HardDrive className="text-neon-blue" size={18} />
            <span className="text-sm font-bold text-white uppercase tracking-widest">雲端圖片儲存</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
            <Clock size={10} /> 自動清理：每週一 03:00
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-black rounded p-3 lg:p-4 border border-zinc-800">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">總檔案數</div>
            <div className="text-xl lg:text-2xl font-mono text-white">{storageStats?.totalFiles ?? '—'}</div>
          </div>
          <div className="bg-black rounded p-3 lg:p-4 border border-zinc-800">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">佔用空間</div>
            <div className="text-xl lg:text-2xl font-mono text-white">{storageStats?.totalSizeMB ?? '—'} <span className="text-xs text-zinc-600">MB</span></div>
          </div>
          <div className="bg-black rounded p-3 lg:p-4 border border-zinc-800">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">保留天數</div>
            <div className="text-xl lg:text-2xl font-mono text-neon-orange">7 <span className="text-xs text-zinc-600">天</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
