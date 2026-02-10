// ============================================================
// AuditTab - 審計圖庫頁面
// ============================================================

import React, { useState } from 'react';
import { RefreshCw, Trash2, CheckCircle, HardDrive, Clock, Image as ImageIcon, Download, XCircle } from 'lucide-react';
import { AuditRecord } from '../../types';

interface AuditTabProps {
  auditRecords: AuditRecord[];
  isAuditLoading: boolean;
  storageStats: { totalFiles: number; totalSizeMB: number } | null;
  onRefresh: (force: boolean) => void;
  onDeleteRecord: (recordId: string) => void;
  onCleanup: () => void;
  isCleaningUp: boolean;
  cleanupResult: string | null;
}

const AuditTab: React.FC<AuditTabProps> = ({
  auditRecords, isAuditLoading, storageStats,
  onRefresh, onDeleteRecord, onCleanup, isCleaningUp, cleanupResult,
}) => {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="space-y-6">
      {/* 統計列 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800 rounded p-3 lg:p-4">
        <div className="flex flex-wrap items-center gap-3 lg:gap-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <HardDrive size={16} className="text-neon-blue" />
            <span className="text-xs font-mono">
              {storageStats ? `${storageStats.totalFiles} 個檔案 / ${storageStats.totalSizeMB} MB` : '載入中...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock size={16} className="text-neon-orange" />
            <span className="text-xs font-mono">自動清理：每週一 3:00</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <ImageIcon size={16} />
            <span className="text-xs font-mono">{auditRecords.length} 筆記錄</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onRefresh(true)} className="p-2 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded transition-colors" title="重新整理">
            <RefreshCw size={16} className={isAuditLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={onCleanup} disabled={isCleaningUp} className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-red-900/50 border border-red-800 hover:bg-red-900 text-red-400 hover:text-red-300 text-xs font-bold uppercase rounded transition-colors">
            {isCleaningUp ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
            <span className="hidden sm:inline">清理 7 天前圖片</span>
            <span className="sm:hidden">清理</span>
          </button>
        </div>
      </div>

      {/* 清理結果 */}
      {cleanupResult && (
        <div className="p-3 rounded text-xs font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center gap-2">
          <CheckCircle size={14} className="text-neon-green" /> {cleanupResult}
        </div>
      )}

      {/* 圖片網格 */}
      {isAuditLoading && auditRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="animate-spin text-zinc-500 mb-4" size={24} />
          <p className="text-xs text-zinc-500 font-mono">載入圖片記錄中...</p>
        </div>
      ) : auditRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 border border-zinc-800 border-dashed rounded">
          <div className="w-16 h-16 bg-black border border-zinc-800 text-zinc-600 rounded-full flex items-center justify-center mb-4">
            <ImageIcon size={24} />
          </div>
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">尚無圖片記錄</h3>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono">使用者處理圖片後將自動上傳至此</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {auditRecords.map((record) => (
            <div key={record.id} className="bg-zinc-900/50 border border-zinc-800 rounded overflow-hidden hover:border-zinc-600 transition-colors group">
              <div className="flex h-32 sm:h-40 bg-black">
                <div className="flex-1 relative cursor-pointer overflow-hidden" onClick={() => setPreviewImage({ url: record.originalUrl, title: '原圖' })}>
                  <img src={record.originalUrl} alt="Original" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                  <span className="absolute top-1 left-1 bg-black/70 text-[8px] text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">原圖</span>
                </div>
                <div className="w-px bg-zinc-700"></div>
                <div className="flex-1 relative cursor-pointer overflow-hidden" onClick={() => setPreviewImage({ url: record.resultUrl, title: '結果' })}>
                  <img src={record.resultUrl} alt="Result" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                  <span className="absolute top-1 left-1 bg-neon-orange/80 text-[8px] text-black px-1.5 py-0.5 rounded font-mono uppercase font-bold">結果</span>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{record.userName}</span>
                    <span className="text-[10px] font-mono text-neon-blue">{record.userId}</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    record.mode === 'eraser' ? 'text-neon-orange border-neon-orange/50 bg-neon-orange/10' : 'text-neon-blue border-neon-blue/50 bg-neon-blue/10'
                  }`}>
                    {record.mode === 'eraser' ? '清除' : '軟裝'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{record.fileName || '—'}</span>
                  <span>{record.spaceType || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {record.timestamp ? new Date(record.timestamp).toLocaleString('zh-TW') : '—'}
                  </span>
                  <div className="flex items-center gap-1">
                    <a href={record.resultUrl} target="_blank" rel="noreferrer" className="p-1 text-zinc-600 hover:text-neon-blue transition-colors" title="在新分頁開啟">
                      <Download size={12} />
                    </a>
                    <button onClick={() => onDeleteRecord(record.id)} className="p-1 text-zinc-600 hover:text-red-500 transition-colors" title="刪除此記錄">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 圖片預覽 Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm cursor-pointer" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img src={previewImage.url} alt={previewImage.title} className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-widest">{previewImage.title}</div>
            <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 bg-black/70 text-white hover:text-red-400 p-2 rounded transition-colors">
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTab;
