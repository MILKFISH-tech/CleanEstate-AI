// ============================================================
// EditorToolbar - 編輯器頂部工具列
// 包含：檔名顯示、狀態標籤、筆刷控制、工具切換、執行按鈕
// ============================================================

import React from 'react';
import { Brush, Hand, Undo2, Eraser } from 'lucide-react';
import { ProcessingStatus, BrushSettings, PhotoTask } from '../../types';
import { CANVAS_CONFIG } from '../../config/constants';
import { CanvasEditorRef } from '../CanvasEditor';

interface EditorToolbarProps {
  selectedPhoto: PhotoTask | null;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  activeTool: 'brush' | 'hand';
  setActiveTool: (tool: 'brush' | 'hand') => void;
  canUndo: boolean;
  canvasRef: React.RefObject<CanvasEditorRef | null>;
  editorMode: 'eraser' | 'staging';
  isReady: boolean;
  notReadyReason: string;
  isProcessing: boolean;
  isAdmin: boolean;
  usageNotice: string | null;
  onProcess: () => void;
  onCancel: () => void;
  onPreview: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedPhoto,
  brushSettings,
  setBrushSettings,
  activeTool,
  setActiveTool,
  canUndo,
  canvasRef,
  editorMode,
  isReady,
  notReadyReason,
  isProcessing,
  isAdmin,
  usageNotice,
  onProcess,
  onCancel,
  onPreview,
  onNavigateToAdmin,
  onLogout,
}) => {
  const showToolbar = selectedPhoto && selectedPhoto.status !== ProcessingStatus.COMPLETED;

  return (
    <header className="bg-brand-black border-b border-brand-border flex items-center justify-between px-3 sm:px-6 flex-shrink-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-h-[56px] md:min-h-[80px]">
      
      {/* LEFT: 專案資訊 & 狀態 */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-shrink">
        <h2 className="text-xs sm:text-base font-bold text-white tracking-widest uppercase flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-2 h-2 bg-neon-orange rounded-full flex-shrink-0"></span>
          <span className="truncate max-w-[100px] sm:max-w-[200px] lg:max-w-none">
            {selectedPhoto ? selectedPhoto.file.name : "工作區 WORKSPACE"}
          </span>
        </h2>
        
        {selectedPhoto && (
          <span className={`hidden sm:inline-flex px-2 sm:px-3 py-1 text-[10px] font-mono font-bold rounded-sm border uppercase tracking-wider whitespace-nowrap ${
            selectedPhoto.status === ProcessingStatus.COMPLETED ? 'bg-neon-green/10 text-neon-green border-neon-green/50' : 
            selectedPhoto.status === ProcessingStatus.PROCESSING ? 'bg-neon-orange/10 text-neon-orange border-neon-orange/50 animate-pulse' : 
            selectedPhoto.status === ProcessingStatus.ABORTED ? 'bg-red-900/20 text-red-500 border-red-500/50' :
            'bg-zinc-900 text-zinc-400 border-zinc-800'
          }`}>
            {selectedPhoto.statusMessage || selectedPhoto.status}
          </span>
        )}
        
        {usageNotice && (
          <span className="hidden lg:inline-flex px-3 py-1 text-[10px] font-mono font-bold rounded-sm border uppercase tracking-wider bg-zinc-900 text-zinc-300 border-zinc-700 max-w-[420px] truncate" title={usageNotice}>
            {usageNotice}
          </span>
        )}
      </div>

      {/* RIGHT: 控制項 */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
        
        {/* 預覽按鈕 */}
        {selectedPhoto && (
          <button
            onClick={onPreview}
            className="hidden sm:block text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-widest border border-zinc-800 hover:border-neon-orange/60 bg-zinc-900/30 hover:bg-zinc-900 px-3 lg:px-4 py-2 rounded-sm transition-colors"
            title="開啟預覽視窗 (ESC 關閉)"
          >
            預覽
          </button>
        )}
        
        {/* 筆刷工具列 (僅編輯中顯示) */}
        {showToolbar && (
          <div className="flex items-center">
            <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-1 sm:p-1.5 shadow-lg">
              
              {/* 筆刷大小 */}
              <div className="hidden sm:flex items-center gap-2 px-2">
                <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] text-zinc-400 font-mono">
                  {brushSettings.size}
                </div>
                <input 
                  type="range" 
                  min={CANVAS_CONFIG.MIN_BRUSH_SIZE}
                  max={CANVAS_CONFIG.MAX_BRUSH_SIZE}
                  value={brushSettings.size}
                  onChange={(e) => setBrushSettings({...brushSettings, size: parseInt(e.target.value)})}
                  className="w-16 lg:w-20 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-neon-orange"
                />
              </div>

              {/* 分隔線 */}
              <div className="hidden sm:block w-px h-6 bg-zinc-700 mx-1 sm:mx-2"></div>

              {/* 工具切換 */}
              <div className="flex gap-1">
                <button 
                  onClick={() => setActiveTool('brush')}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded transition-all text-xs font-bold uppercase ${
                    activeTool === 'brush' 
                    ? 'bg-neon-orange text-black shadow-[0_0_10px_rgba(255,107,0,0.3)]' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Brush size={14} /> <span className="hidden sm:inline">筆刷</span>
                </button>
                <button 
                  onClick={() => setActiveTool('hand')}
                  className={`p-1.5 rounded transition-all text-zinc-400 hover:text-white hover:bg-zinc-800 ${
                    activeTool === 'hand' ? 'text-neon-blue bg-zinc-800' : ''
                  }`}
                  title="移動工具 (Hand)"
                >
                  <Hand size={16} />
                </button>
              </div>

              {/* 分隔線 */}
              <div className="w-px h-6 bg-zinc-700 mx-1 sm:mx-2"></div>

              {/* 復原 / 清除 */}
              <div className="flex gap-1">
                <button 
                  onClick={() => canvasRef.current?.undo()}
                  disabled={!canUndo}
                  className={`p-1.5 rounded transition-all ${
                    !canUndo ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title="復原 (Undo)"
                >
                  <Undo2 size={16} />
                </button>
                <button 
                  onClick={() => canvasRef.current?.clear()}
                  className="p-1.5 rounded transition-all text-zinc-400 hover:text-red-500 hover:bg-zinc-800"
                  title="清除全部 (Clear)"
                >
                  <Eraser size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 管理/登出 */}
        <div className="flex items-center gap-2 border-l border-zinc-800 pl-2 sm:pl-6">
          {isAdmin && (
            <button onClick={onNavigateToAdmin} className="hidden sm:block text-zinc-500 hover:text-white text-xs font-bold uppercase transition-colors mr-2">管理後台</button>
          )}
          <button onClick={onLogout} className="text-zinc-500 hover:text-red-500 text-xs font-bold uppercase transition-colors">登出</button>
        </div>
        
        {/* 執行按鈕 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!isReady && !isProcessing && selectedPhoto?.status !== ProcessingStatus.COMPLETED && (
            <span className="hidden lg:flex text-[10px] text-red-500 font-bold uppercase tracking-wider animate-pulse border border-red-500/30 px-2 py-1 rounded-sm bg-red-500/10 items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {notReadyReason}
            </span>
          )}
          
          {isProcessing ? (
            <button 
              onClick={onCancel}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-3 rounded-sm font-bold text-xs sm:text-sm tracking-[0.2em] transition-all uppercase relative overflow-hidden bg-red-900/80 text-white border border-red-500 hover:bg-red-800 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" /></svg>
              <span className="hidden sm:inline">停止 STOP</span>
              <span className="sm:hidden">停止</span>
            </button>
          ) : (
            <button 
              onClick={onProcess}
              disabled={!isReady || selectedPhoto?.status === ProcessingStatus.COMPLETED}
              className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-3 rounded-sm font-bold text-xs sm:text-sm tracking-[0.2em] transition-all uppercase relative overflow-hidden group border ${
                !isReady || selectedPhoto?.status === ProcessingStatus.COMPLETED
                ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                : editorMode === 'eraser' 
                ? 'bg-neon-orange text-black border-neon-orange hover:bg-white hover:text-black shadow-[0_0_20px_rgba(255,107,0,0.4)]'
                : 'bg-neon-blue text-black border-neon-blue hover:bg-white hover:text-black shadow-[0_0_20px_rgba(0,243,255,0.4)]'
              }`}
            >
              <span className="hidden sm:inline">{editorMode === 'eraser' ? "開始清除 ERASE" : "開始生成 RENDER"}</span>
              <span className="sm:hidden">{editorMode === 'eraser' ? "清除" : "生成"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default EditorToolbar;
