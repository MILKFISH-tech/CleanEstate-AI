// ============================================================
// UsersTab - 用戶管理頁面
// ============================================================

import React, { useState } from 'react';
import { Search, Plus, RefreshCw, Edit, FileText, XCircle, UserPlus, Key } from 'lucide-react';
import { User } from '../../types';
import { sheetService } from '../../services/sheetService';

interface UsersTabProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  isLoading: boolean;
  onRefresh: (force: boolean) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, setUsers, isLoading, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ id: '', name: '', phone: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return user.id.toLowerCase().includes(lower) || user.name.toLowerCase().includes(lower) || user.phone.includes(lower);
  });

  const toggleUserStatus = async (id: string) => {
    if (id.toUpperCase() === 'ADMIN') {
      alert("系統安全警告：無法停用超級管理員帳號。");
      return;
    }
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    await sheetService.updateStatus(id, newStatus);
  };

  const handleAddUser = async () => {
    if (!newUser.id.trim() || !newUser.name.trim() || !newUser.phone.trim()) {
      alert("請完整填寫 ID、姓名與手機號碼");
      return;
    }
    setIsSyncing(true);
    try {
      await sheetService.addUsers([newUser]);
      onRefresh(true);
      alert(`成功新增員工：${newUser.name}`);
      setNewUser({ id: '', name: '', phone: '' }); 
      setShowAddModal(false);
    } catch {
      alert("新增失敗，請稍後重試");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!editingUser.name.trim() || !editingUser.phone.trim()) {
      alert("姓名與電話不能為空");
      return;
    }
    setIsSyncing(true);
    try {
      await sheetService.updateUser(editingUser.id, { name: editingUser.name, phone: editingUser.phone });
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
    } catch {
      alert("更新失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="bg-zinc-900/30 rounded border border-zinc-800 overflow-hidden backdrop-blur-sm">
        {/* 工具列 */}
        <div className="p-3 lg:p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-black/20">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
            <input 
              type="text" placeholder="搜尋員工..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded text-xs text-white focus:border-neon-orange focus:outline-none w-full uppercase placeholder-zinc-700 font-mono"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => onRefresh(true)} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded transition-colors" title="重新整理">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-neon-orange text-black text-xs font-bold uppercase rounded hover:bg-white transition-colors">
              <Plus size={14} /> 新增用戶
            </button>
          </div>
        </div>

        {/* 表格 - 響應式 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800">
                <th className="px-4 lg:px-6 py-4">ID</th>
                <th className="px-4 lg:px-6 py-4">姓名</th>
                <th className="px-4 lg:px-6 py-4 hidden sm:table-cell">電話</th>
                <th className="px-4 lg:px-6 py-4 text-center">用量</th>
                <th className="px-4 lg:px-6 py-4">狀態</th>
                <th className="px-4 lg:px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-zinc-900/50 transition-colors ${user.status === 'suspended' ? 'opacity-50' : ''}`}>
                  <td className="px-4 lg:px-6 py-4 font-mono text-xs text-neon-blue">{user.id}</td>
                  <td className="px-4 lg:px-6 py-4 font-bold text-white text-sm">{user.name}</td>
                  <td className="px-4 lg:px-6 py-4 font-mono text-zinc-400 text-xs hidden sm:table-cell">{user.phone}</td>
                  <td className="px-4 lg:px-6 py-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                      user.todayUsage > 50 ? 'bg-red-900/30 text-red-500 border border-red-900' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {user.todayUsage || 0}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    {user.status === 'active' ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span> 正常
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> 停權
                      </span>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditingUser(user)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="編輯">
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => toggleUserStatus(user.id)}
                        disabled={user.id.toUpperCase() === 'ADMIN'}
                        className={`text-[10px] font-bold uppercase border px-2 py-1 rounded transition-colors ${
                          user.id.toUpperCase() === 'ADMIN'
                          ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                          : user.status === 'active' 
                            ? 'border-red-900/50 text-red-500 hover:bg-red-900/20' 
                            : 'border-green-900/50 text-green-500 hover:bg-green-900/20'
                        }`}
                      >
                        {user.status === 'active' ? '停用' : '啟用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增用戶 Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#0f0f10] border border-zinc-800 w-[400px] max-w-[95vw] m-4 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-3">
                <div className="text-neon-orange"><UserPlus size={18} /></div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">註冊新用戶</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">員工編號 (ID)</label>
                <input type="text" placeholder="例如: A888" value={newUser.id} onChange={(e) => setNewUser({...newUser, id: e.target.value})} className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-sm text-white focus:border-neon-orange focus:outline-none uppercase font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">完整姓名</label>
                <input type="text" placeholder="例如: 王小明" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-sm text-white focus:border-neon-orange focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">手機號碼 (登入密碼)</label>
                <input type="tel" placeholder="例如: 0912345678" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-sm text-white focus:border-neon-orange focus:outline-none font-mono text-sm" />
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-black/20">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-zinc-500 hover:text-white text-xs font-bold uppercase">取消</button>
              <button onClick={handleAddUser} disabled={isSyncing} className={`px-4 py-2 bg-neon-orange text-black text-xs font-bold uppercase flex items-center gap-2 hover:bg-white transition-colors ${isSyncing ? 'opacity-50' : ''}`}>
                {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <FileText size={14} />} 確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯用戶 Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#0f0f10] border border-neon-blue/30 w-[400px] max-w-[95vw] m-4 shadow-[0_0_50px_rgba(0,243,255,0.1)]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-3">
                <div className="text-neon-blue"><Edit size={18} /></div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">編輯用戶資料</h3>
                  <p className="text-[10px] text-zinc-500 font-mono">ID: {editingUser.id}</p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white"><XCircle size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1 opacity-50 pointer-events-none">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">員工編號 (鎖定)</label>
                <input type="text" value={editingUser.id} readOnly className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-400 font-mono text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">完整姓名</label>
                <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-sm text-white focus:border-neon-blue focus:outline-none text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">手機號碼 (登入密碼) <Key size={10} /></label>
                <input type="tel" value={editingUser.phone} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-sm text-white focus:border-neon-blue focus:outline-none font-mono text-sm" />
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-black/20">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-zinc-500 hover:text-white text-xs font-bold uppercase">取消</button>
              <button onClick={handleUpdateUser} disabled={isSyncing} className={`px-4 py-2 bg-neon-blue text-black text-xs font-bold uppercase flex items-center gap-2 hover:bg-white transition-colors ${isSyncing ? 'opacity-50' : ''}`}>
                {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <FileText size={14} />} 儲存變更
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UsersTab;
