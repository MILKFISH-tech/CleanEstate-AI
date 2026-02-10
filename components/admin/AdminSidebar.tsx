// ============================================================
// AdminSidebar - 管理員側邊欄 (響應式)
// ============================================================

import React from 'react';
import { LayoutDashboard, Users, Image as ImageIcon, LogOut, Settings, AlertCircle } from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'audit';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  isConnected: boolean;
  onShowSettings: () => void;
  onNavigateToEditor: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab, setActiveTab, isConnected,
  onShowSettings, onNavigateToEditor, onLogout,
  isMobileOpen, onMobileClose,
}) => {
  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    onMobileClose();
  };

  return (
    <>
      {/* 手機遮罩 */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-zinc-900 flex flex-col flex-shrink-0
        transform transition-transform duration-300
        lg:relative lg:transform-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 lg:p-6 border-b border-zinc-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-neon-orange text-black rounded flex items-center justify-center font-bold text-lg">A</div>
          <div>
            <h2 className="font-bold text-white tracking-widest uppercase text-sm">管理員中樞</h2>
            <p className="text-[10px] text-zinc-500 font-mono">SYSTEM CONTROL</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {([
            { tab: 'overview' as AdminTab, icon: LayoutDashboard, label: '系統概覽' },
            { tab: 'users' as AdminTab, icon: Users, label: '用戶管理' },
            { tab: 'audit' as AdminTab, icon: ImageIcon, label: '操作日誌' },
          ]).map(({ tab, icon: Icon, label }) => (
            <button 
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? 'bg-zinc-900 text-neon-orange border-l-2 border-neon-orange' 
                : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50 border-l-2 border-transparent'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-900 space-y-2">
          {!isConnected && (
            <button onClick={onShowSettings} className="w-full text-left mb-4 p-3 bg-yellow-900/10 border border-yellow-700/50 rounded text-yellow-500 text-[10px] font-mono hover:bg-yellow-900/20 transition-colors flex items-center gap-2">
              <AlertCircle size={12} />
              <span>資料庫未連接 (點此設定)</span>
            </button>
          )}
          <button onClick={onShowSettings} className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-neon-blue text-xs uppercase font-bold bg-zinc-900/30 rounded hover:bg-zinc-900 transition-colors">
            <Settings size={16} /> 系統設定
          </button>
          <button onClick={onNavigateToEditor} className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-white text-xs uppercase font-bold bg-zinc-900/50 rounded hover:bg-zinc-900 transition-colors">
            <ImageIcon size={16} /> 開啟編輯器
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:text-red-400 text-xs uppercase font-bold">
            <LogOut size={16} /> 登出系統
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
