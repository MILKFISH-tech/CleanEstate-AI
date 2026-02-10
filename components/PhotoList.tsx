// ============================================================
// PhotoList - 側邊照片列表（已優化響應式和觸控）
// ============================================================

import React from 'react';
import { PhotoTask, ProcessingStatus } from '../types';
import { IMAGE_CONFIG } from '../config/constants';

interface PhotoListProps {
  photos: PhotoTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PhotoList: React.FC<PhotoListProps> = ({ photos, selectedId, onSelect, onRemove, onUpload }) => {
  
  const handleDownloadAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const completed = photos.filter(p => p.status === ProcessingStatus.COMPLETED && p.resultUrl);
    completed.forEach((photo, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = photo.resultUrl!;
        link.download = `cleaned_${photo.file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500);
    });
  };

  const completedCount = photos.filter(p => p.status === ProcessingStatus.COMPLETED).length;

  return (
    <div className="w-full flex-shrink-0 bg-brand-black h-full flex flex-col border-r border-brand-border z-30 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-brand-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-orange via-red-500 to-neon-orange opacity-50"></div>

        <div className="flex items-center gap-3 mb-4 lg:mb-6">
          <div className="w-8 h-8 lg:w-9 lg:h-9 border-2 border-neon-orange text-neon-orange rounded-sm flex items-center justify-center font-bold text-sm shadow-[0_0_10px_rgba(255,107,0,0.2)]">
            AI
          </div>
          <h1 className="text-sm lg:text-base font-bold text-white tracking-widest uppercase flex flex-col leading-none">
            <span>CleanEstate</span>
            <span className="text-xs text-neon-orange tracking-[0.2em] mt-1 drop-shadow-[0_0_5px_rgba(255,107,0,0.8)]">NEON VER.</span>
          </h1>
        </div>
        
        {/* 上傳按鈕 - 觸控友善 (min 44px) */}
        <label className="group flex items-center justify-center w-full px-4 py-3 lg:px-5 lg:py-4 border border-zinc-700 hover:border-neon-orange/50 bg-brand-panel hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-sm cursor-pointer transition-all duration-300 font-bold text-sm tracking-widest uppercase relative overflow-hidden min-h-[44px]">
          <span className="absolute inset-0 bg-neon-orange/5 opacity-0 group-hover:opacity-100 transition-opacity"></span>
          <svg className="w-5 h-5 mr-2 text-neon-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>匯入照片</span>
          <input 
            type="file" multiple accept="image/*" className="hidden" 
            onChange={onUpload}
            disabled={photos.length >= IMAGE_CONFIG.MAX_TOTAL_PHOTOS}
          />
        </label>

        <div className="flex justify-between items-end mt-3 lg:mt-4 px-1">
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            專案檔案 ({photos.length}/{IMAGE_CONFIG.MAX_TOTAL_PHOTOS})
          </p>
          {completedCount > 0 && (
            <button onClick={handleDownloadAll} className="text-xs font-bold text-neon-orange hover:text-white border-b border-neon-orange/30 hover:border-neon-orange transition-all pb-0.5 min-h-[32px] flex items-center">
              全部下載
            </button>
          )}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1.5 lg:space-y-2">
        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 border border-dashed border-zinc-800 rounded-sm bg-zinc-900/30 mt-4">
            <p className="text-zinc-500 text-sm font-mono">尚無照片</p>
          </div>
        )}
        
        {photos.map((photo) => (
          <div 
            key={photo.id}
            onClick={() => onSelect(photo.id)}
            className={`relative group flex items-center p-2.5 lg:p-3 rounded-sm cursor-pointer transition-all duration-300 border min-h-[56px] ${
              selectedId === photo.id 
                ? 'bg-zinc-900/80 border-neon-orange/50 shadow-[inset_0_0_20px_rgba(255,107,0,0.1)]' 
                : 'hover:bg-zinc-900 border-transparent hover:border-zinc-700'
            }`}
          >
            <div className="w-11 h-11 lg:w-12 lg:h-12 bg-zinc-950 rounded-sm overflow-hidden flex-shrink-0 relative border border-zinc-800">
              <img src={photo.previewUrl} alt="thumb" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              {photo.status === ProcessingStatus.COMPLETED && (
                <div className="absolute inset-0 bg-neon-orange/20 flex items-center justify-center backdrop-blur-[1px]">
                  <svg className="w-5 h-5 text-neon-orange drop-shadow-[0_0_3px_rgba(255,107,0,1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </div>
            
            <div className="ml-3 lg:ml-4 flex-1 min-w-0 flex flex-col justify-center h-full gap-0.5 lg:gap-1">
              <p className={`text-xs lg:text-sm truncate font-bold font-mono ${selectedId === photo.id ? 'text-neon-orange' : 'text-zinc-300 group-hover:text-white'}`}>
                {photo.file.name}
              </p>
              <div className="flex items-center h-4">
                {photo.status === ProcessingStatus.PROCESSING ? (
                  <span className="text-xs text-neon-orange font-mono animate-pulse tracking-tight">運算中...</span>
                ) : photo.status === ProcessingStatus.FAILED ? (
                  <span className="text-xs text-red-500 font-mono tracking-tight">處理失敗</span>
                ) : photo.status === ProcessingStatus.COMPLETED ? (
                  <span className="text-xs text-neon-orange font-mono tracking-tight font-bold">完成</span>
                ) : (
                  <span className="text-xs text-zinc-500 font-mono tracking-tight">等待中</span>
                )}
              </div>
            </div>

            {/* 刪除按鈕 - 觸控友善 */}
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(photo.id); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-500 hover:text-red-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="p-3 lg:p-4 border-t border-brand-border bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[10px] lg:text-xs text-zinc-400 font-mono">
          <span>GEMINI v2.5</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_5px_#39ff14]"></span>
            <span className="text-neon-green/90 font-bold">連線正常</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoList;
