// ============================================================
// EraserControls - 橡皮擦模式的控制面板
// ============================================================

import React from 'react';
import { ProcessingStatus, PhotoTask } from '../../types';

type EraserSubMode = 'auto' | 'manual';

interface EraserControlsProps {
  eraserSubMode: EraserSubMode;
  setEraserSubMode: (mode: EraserSubMode) => void;
  selectedPhoto: PhotoTask;
  selectedId: string;
  onUpdatePhoto: (id: string, updates: Partial<PhotoTask>) => void;
}

const EraserControls: React.FC<EraserControlsProps> = ({
  eraserSubMode,
  setEraserSubMode,
  selectedPhoto,
  selectedId,
  onUpdatePhoto,
}) => {
  return (
    <div className="max-w-4xl mx-auto w-full h-full flex flex-col md:flex-row gap-4 md:gap-8">
      
      {/* Left: 選擇清除方式 */}
      <div className="md:w-1/3 flex flex-col gap-3 md:gap-4 md:border-r md:border-zinc-800 md:pr-8">
        <h3 className="text-neon-orange font-bold text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-orange rounded-full"></span>
          1. 選擇清除方式
        </h3>
        <div className="flex flex-row md:flex-col gap-2 md:gap-3">
          <button 
            onClick={() => setEraserSubMode('auto')}
            className={`flex-1 md:flex-none p-3 rounded-sm border text-left flex items-center gap-3 transition-all ${
              eraserSubMode === 'auto' 
              ? 'bg-neon-orange text-black border-neon-orange shadow-[0_0_15px_rgba(255,107,0,0.3)]' 
              : 'bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <span className="text-xl">🪄</span>
            <div>
              <div className="text-xs font-bold uppercase">AI 自動清除</div>
              <div className={`text-[10px] opacity-70 ${eraserSubMode === 'auto' ? 'text-black' : 'text-zinc-500'}`}>推薦！自動識別並填補背景</div>
            </div>
          </button>

          <button 
            onClick={() => setEraserSubMode('manual')}
            className={`flex-1 md:flex-none p-3 rounded-sm border text-left flex items-center gap-3 transition-all ${
              eraserSubMode === 'manual' 
              ? 'bg-zinc-900 text-white border-neon-orange' 
              : 'bg-black text-zinc-400 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <span className="text-xl">📝</span>
            <div>
              <div className="text-xs font-bold uppercase">指定描述</div>
              <div className="text-[10px] text-zinc-500">精準控制要移除的物件</div>
            </div>
          </button>
        </div>
      </div>

      {/* Right: 內容區域 */}
      <div className="flex-1 flex flex-col justify-center">
        {eraserSubMode === 'auto' ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-80">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-700 mb-3">
              <span className="text-2xl animate-pulse">✨</span>
            </div>
            <p className="text-white text-sm font-bold">已啟用自動智慧清除</p>
            <p className="text-zinc-500 text-xs mt-1">請直接用畫筆塗抹您想消失的任何東西。</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 h-full justify-center">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              2. 輸入移除指令
            </label>
            <textarea
              className="w-full h-20 md:h-24 p-4 bg-zinc-900/50 border border-zinc-700 rounded-sm focus:border-neon-orange text-white outline-none font-mono text-xs placeholder-zinc-600 resize-none"
              placeholder="例如：Remove the red chair and the shadow... (移除紅色的椅子與陰影)"
              value={selectedPhoto.customPrompt || ""}
              onChange={(e) => onUpdatePhoto(selectedId, { customPrompt: e.target.value })}
              disabled={selectedPhoto.status === ProcessingStatus.PROCESSING}
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EraserControls;
