// ============================================================
// ControlsPanel - 編輯器底部控制面板
// 包含：模式切換 (橡皮擦/軟裝) + 對應子面板
// ============================================================

import React from 'react';
import EraserControls from './EraserControls';
import StagingControls from './StagingControls';
import { PhotoTask } from '../../types';

type EditorMode = 'eraser' | 'staging';
type EraserSubMode = 'auto' | 'manual';
type StagingType = 'style' | 'item';

interface ControlsPanelProps {
  editorMode: EditorMode;
  onModeSwitch: (mode: EditorMode) => void;
  eraserSubMode: EraserSubMode;
  setEraserSubMode: (mode: EraserSubMode) => void;
  stagingType: StagingType;
  setStagingType: (type: StagingType) => void;
  selectedPhoto: PhotoTask;
  selectedId: string;
  onSpaceChange: (space: string) => void;
  onApplyStagingPrompt: (type: StagingType, value: string) => void;
  onUpdatePhoto: (id: string, updates: Partial<PhotoTask>) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  editorMode,
  onModeSwitch,
  eraserSubMode,
  setEraserSubMode,
  stagingType,
  setStagingType,
  selectedPhoto,
  selectedId,
  onSpaceChange,
  onApplyStagingPrompt,
  onUpdatePhoto,
}) => {
  return (
    <div className="bg-brand-black border-t border-brand-border/80 flex-shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col">
      
      {/* 模式切換 Tab */}
      <div className="flex border-b border-brand-border">
        <button 
          onClick={() => onModeSwitch('eraser')}
          className={`flex-1 py-2.5 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
            editorMode === 'eraser' 
            ? 'bg-zinc-900 text-neon-orange border-b-2 border-neon-orange' 
            : 'bg-black text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
          }`}
        >
          <span>🧹 <span className="hidden sm:inline">智慧</span>橡皮擦</span>
        </button>
        <button 
          onClick={() => onModeSwitch('staging')}
          className={`flex-1 py-2.5 sm:py-3 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
            editorMode === 'staging' 
            ? 'bg-zinc-900 text-neon-blue border-b-2 border-neon-blue' 
            : 'bg-black text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
          }`}
        >
          <span>🎨 虛擬軟裝</span>
        </button>
      </div>

      {/* 內容區域 - 響應式高度 */}
      <div className="p-3 sm:p-4 md:p-6 h-auto sm:h-40 md:h-48 overflow-y-auto">
        {editorMode === 'eraser' ? (
          <EraserControls 
            eraserSubMode={eraserSubMode}
            setEraserSubMode={setEraserSubMode}
            selectedPhoto={selectedPhoto}
            selectedId={selectedId}
            onUpdatePhoto={onUpdatePhoto}
          />
        ) : (
          <StagingControls 
            stagingType={stagingType}
            setStagingType={setStagingType}
            selectedPhoto={selectedPhoto}
            selectedId={selectedId}
            onSpaceChange={onSpaceChange}
            onApplyStagingPrompt={onApplyStagingPrompt}
            onUpdatePhoto={onUpdatePhoto}
          />
        )}
      </div>
    </div>
  );
};

export default ControlsPanel;
