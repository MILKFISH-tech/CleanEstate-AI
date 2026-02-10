// ============================================================
// AdminDashboard - 管理員儀表板 (協調器角色)
// 子元件：AdminSidebar, OverviewTab, UsersTab, AuditTab, SettingsModal
// ============================================================

import React, { useState, useEffect } from 'react';
import { RefreshCw, Menu } from 'lucide-react';
import { User, AuditRecord } from '../types';
import { sheetService } from '../services/sheetService';
import { storageService } from '../services/storageService';
import { Logger } from '../services/logger';
import AdminSidebar from './admin/AdminSidebar';
import OverviewTab from './admin/OverviewTab';
import UsersTab from './admin/UsersTab';
import AuditTab from './admin/AuditTab';
import SettingsModal from './admin/SettingsModal';

const log = Logger.create('AdminDashboard');

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateToEditor: () => void;
  currentUser: { id: string; name: string; role: 'admin' | 'user' } | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigateToEditor, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Audit State
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [storageStats, setStorageStats] = useState<{ totalFiles: number; totalSizeMB: number } | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // ---- 資料載入 ----
  const fetchUsers = async (force = false) => {
    setIsLoading(true);
    try {
      const data = await sheetService.getUsers(force);
      setUsers(data);
    } catch (err) {
      log.error('載入使用者失敗', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditData = async (force = false) => {
    setIsAuditLoading(true);
    try {
      const [records, stats] = await Promise.all([
        storageService.getAuditRecords(force),
        storageService.getStorageStats(),
      ]);
      setAuditRecords(records);
      if (stats) setStorageStats(stats);
    } catch (e) {
      log.error('載入審計資料失敗', e);
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('確定要刪除這筆圖片記錄嗎？此操作會同時刪除 Google Drive 上的檔案。')) return;
    const ok = await storageService.deleteImage(recordId);
    if (ok) {
      setAuditRecords(prev => prev.filter(r => r.id !== recordId));
      fetchAuditData(true);
    } else {
      alert('刪除失敗，請稍後重試。');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('確定要清理 7 天以前的所有圖片嗎？此操作不可復原！')) return;
    setIsCleaningUp(true);
    setCleanupResult(null);
    try {
      const result = await storageService.triggerCleanup(7);
      if (result) {
        setCleanupResult(`清理完成！已刪除 ${result.deleted} 筆記錄。`);
        fetchAuditData(true);
      } else {
        setCleanupResult('清理失敗，請確認 GAS 已更新。');
      }
    } catch {
      setCleanupResult('清理過程發生錯誤。');
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditData();
    if (activeTab === 'overview') {
      storageService.getStorageStats().then(stats => { if (stats) setStorageStats(stats); });
    }
  }, [activeTab]);

  const isConnected = !!sheetService.getScriptUrl();

  const tabTitles = {
    overview: '系統儀表板',
    users: '用戶資料庫',
    audit: '審計圖庫',
  };

  return (
    <div className="flex h-screen bg-[#050505] font-sans text-zinc-300 relative selection:bg-neon-orange selection:text-black">
      
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onShowSettings={() => setShowSettings(true)}
        onNavigateToEditor={onNavigateToEditor}
        onLogout={onLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 主內容區 */}
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,30,30,0)_1px,transparent_1px),linear-gradient(90deg,rgba(30,30,30,0)_1px,transparent_1px)] bg-[size:40px_40px] opacity-10 pointer-events-none z-0"></div>

        {/* Header */}
        <header className="bg-black/80 backdrop-blur-md border-b border-zinc-900 h-14 lg:h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3 lg:gap-4">
            {/* 手機漢堡按鈕 */}
            <button onClick={() => setIsMobileSidebarOpen(true)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
              <Menu size={20} />
            </button>
            <h2 className="text-sm lg:text-lg font-bold text-white uppercase tracking-widest flex items-center gap-3">
              <span className="w-1.5 h-5 lg:h-6 bg-neon-orange hidden sm:block"></span>
              {tabTitles[activeTab]}
            </h2>
            {isLoading && <span className="text-xs text-neon-orange flex items-center gap-1 font-mono"><RefreshCw className="animate-spin" size={12}/> 同步中...</span>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white uppercase">{currentUser?.name || '管理員'}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{currentUser?.id || 'ROOT'}</p>
            </div>
            <div className="w-9 h-9 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 relative z-10">
          {activeTab === 'overview' && (
            <OverviewTab 
              users={users}
              isConnected={isConnected}
              storageStats={storageStats}
              onShowSettings={() => setShowSettings(true)}
              onNavigateToAudit={() => setActiveTab('audit')}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab 
              users={users}
              setUsers={setUsers}
              isLoading={isLoading}
              onRefresh={fetchUsers}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTab 
              auditRecords={auditRecords}
              isAuditLoading={isAuditLoading}
              storageStats={storageStats}
              onRefresh={fetchAuditData}
              onDeleteRecord={handleDeleteRecord}
              onCleanup={handleCleanup}
              isCleaningUp={isCleaningUp}
              cleanupResult={cleanupResult}
            />
          )}
        </div>
      </main>

      {/* 設定 Modal */}
      <SettingsModal 
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={() => fetchUsers(true)}
      />
    </div>
  );
};

export default AdminDashboard;
