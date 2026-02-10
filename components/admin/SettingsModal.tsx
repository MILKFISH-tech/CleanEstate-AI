// ============================================================
// SettingsModal - 系統設定彈窗
// ============================================================

import React, { useState } from 'react';
import { Settings, XCircle, RefreshCw, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { sheetService } from '../../services/sheetService';
import { GAS_TEMPLATE_CODE } from '../../config/gasTemplate';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, onSaved }) => {
  const [scriptUrl, setScriptUrl] = useState(sheetService.getScriptUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage("連線測試中...");
    const result = await sheetService.testConnection(scriptUrl);
    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message);
    } else {
      setTestStatus('error');
      setTestMessage(result.message);
    }
  };

  const handleSave = () => {
    sheetService.setScriptUrl(scriptUrl);
    onSaved();
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("程式碼已複製！請貼上到 Google Apps Script 編輯器中。");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[#0f0f10] border border-zinc-700 w-[600px] max-w-[95vw] m-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="text-neon-orange" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">系統連線設定</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><XCircle size={18} /></button>
        </div>

        <div className="p-4 lg:p-6 space-y-6 overflow-y-auto flex-1">
          {/* URL 輸入 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest block">Google Apps Script URL</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                className="flex-1 bg-black border border-zinc-700 p-2.5 rounded text-white text-xs font-mono focus:border-neon-orange outline-none"
                placeholder="https://script.google.com/macros/s/..../exec"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
              />
              <button 
                onClick={handleTestConnection}
                disabled={!scriptUrl || testStatus === 'testing'}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white text-xs font-bold rounded whitespace-nowrap"
              >
                {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={14}/> : '測試連線'}
              </button>
            </div>
            {testStatus !== 'idle' && (
              <div className={`p-2 rounded text-[10px] font-mono flex items-center gap-2 ${
                testStatus === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 
                testStatus === 'error' ? 'bg-red-900/30 text-red-400 border border-red-800' : 
                'bg-zinc-800 text-zinc-400'
              }`}>
                {testStatus === 'success' && <CheckCircle size={12}/>}
                {testStatus === 'error' && <AlertCircle size={12}/>}
                {testMessage}
              </div>
            )}
          </div>

          {/* 部署教學 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block mb-2">部署教學</label>
            <ol className="list-decimal list-inside text-[11px] text-zinc-400 space-y-1 font-mono pl-2">
              <li>建立 Google Sheet，點選 <code>擴充功能</code> &gt; <code>Apps Script</code>。</li>
              <li>將下方程式碼完全覆蓋編輯器內容。</li>
              <li>點選 <code>部署</code> &gt; <code>新增部署作業</code>。</li>
              <li>類型選「網頁應用程式」，權限設定為 <strong>「任何人」</strong>。</li>
              <li>複製產生的網址，貼入上方欄位並儲存。</li>
              <li className="text-neon-orange">部署後在 Apps Script 中手動執行一次 <code>setupWeeklyCleanup()</code> 函式。</li>
            </ol>
          </div>

          {/* 程式碼區塊 */}
          <div className="relative group">
            <div className="absolute top-2 right-2 z-10">
              <button 
                onClick={() => copyToClipboard(GAS_TEMPLATE_CODE)}
                className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-[10px] flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity"
              >
                <Copy size={12} /> 複製代碼
              </button>
            </div>
            <textarea 
              readOnly
              className="w-full h-48 bg-[#0a0a0a] border border-zinc-800 p-3 rounded text-[10px] text-zinc-500 font-mono resize-none focus:outline-none"
              value={GAS_TEMPLATE_CODE}
            />
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-black/50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-white text-xs font-bold uppercase">取消</button>
          <button onClick={handleSave} className="px-4 py-2 bg-neon-orange text-black hover:bg-white text-xs font-bold uppercase rounded">儲存設定</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
