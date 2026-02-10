// ============================================================
// ComparisonView - 前後對比滑桿（已優化觸控和響應式）
// ============================================================

import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ComparisonViewProps {
  originalUrl: string;
  resultUrl: string;
  onRetry: () => void;
  onContinue: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ originalUrl, resultUrl, onRetry, onContinue }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleSliderStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleEnd = () => {
    setIsResizing(false);
    setIsPanning(false);
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (isResizing) {
      const target = containerRef.current?.querySelector('.comparison-container') as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        const pos = getClientPos(e);
        const x = Math.max(0, Math.min(pos.x - rect.left, rect.width));
        setSliderPosition((x / rect.width) * 100);
      }
      return;
    }
    if (isPanning) {
      const pos = getClientPos(e);
      setPan({ x: pos.x - startPan.x, y: pos.y - startPan.y });
    }
  };

  const handleContainerStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing) {
      const pos = getClientPos(e);
      setIsPanning(true);
      setStartPan({ x: pos.x - pan.x, y: pos.y - pan.y });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    const step = 0.1;
    const newScale = Math.min(Math.max(scale + (delta > 0 ? step : -step), 0.5), 5);
    setScale(newScale);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 5));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const resetView = () => { setScale(1); setPan({x:0, y:0}); };

  return (
    <div className="h-full flex flex-col bg-brand-black relative">
      
      {/* 縮放控制 */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-1.5 sm:p-2 rounded-md border border-zinc-800 shadow-xl pointer-events-auto">
        <button onClick={zoomIn} className="p-1.5 sm:p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors"><ZoomIn size={18} /></button>
        <button onClick={zoomOut} className="p-1.5 sm:p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors"><ZoomOut size={18} /></button>
        <button onClick={resetView} className="p-1.5 sm:p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors" title="Reset"><Maximize size={18} /></button>
        <div className="text-[10px] font-mono text-center text-zinc-500 pt-1 border-t border-zinc-800">{Math.round(scale * 100)}%</div>
      </div>

      {/* 主區域 - 支援觸控 */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-[#0a0a0a] to-[#050505] ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onMouseDown={handleContainerStart}
        onTouchStart={handleContainerStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      >
        <div 
          className="transition-transform duration-75 ease-out"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          <div className="comparison-container relative select-none shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800" style={{ maxHeight: '70vh' }}>
            <img src={resultUrl} alt="Result" className="block max-h-[60vh] sm:max-h-[70vh] max-w-full object-contain pointer-events-none" draggable={false} />
            <div className="absolute top-0 left-0 h-full w-full overflow-hidden border-r border-neon-orange/50 pointer-events-none" style={{ width: `${sliderPosition}%` }}>
              <img src={originalUrl} alt="Original" className="block max-h-[60vh] sm:max-h-[70vh] max-w-none object-contain grayscale-[20%]" style={{ height: '100%', width: 'auto' }} />
            </div>
            <div 
              className="absolute top-0 bottom-0 w-px bg-neon-orange/50 cursor-ew-resize flex items-center justify-center z-20 group hover:bg-neon-orange"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={handleSliderStart}
              onTouchStart={handleSliderStart}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black/80 backdrop-blur-md border border-neon-orange text-neon-orange rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.4)] hover:scale-110 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)"/></svg>
              </div>
            </div>
            
            <div className="absolute top-3 left-3 text-[9px] sm:text-[10px] font-bold text-zinc-400 tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">原圖</div>
            <div className="absolute top-3 right-3 text-[9px] sm:text-[10px] font-bold text-neon-orange tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none border border-neon-orange/30">結果</div>
          </div>
        </div>
      </div>
      
      {/* 底部控制 - 響應式 */}
      <div className="h-auto sm:h-20 bg-brand-dark border-t border-brand-border flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-3 sm:py-0 relative z-30 gap-3 sm:gap-0">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-xs font-bold text-neon-orange tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-neon-orange rounded-full animate-pulse"></span>
            成果預覽
          </span>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 hidden sm:block">HIGH_RES</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          <button onClick={onRetry} className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-transparent border border-zinc-700 hover:border-white text-zinc-400 hover:text-white text-[10px] sm:text-xs font-bold rounded-sm transition uppercase tracking-widest">
            放棄重做
          </button>
          <button onClick={onContinue} className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] sm:text-xs font-bold rounded-sm transition uppercase tracking-widest border border-zinc-600" title="將此結果作為新底圖繼續編輯">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="hidden sm:inline">以此圖繼續編輯</span>
            <span className="sm:hidden">繼續編輯</span>
          </button>
          <a href={resultUrl} download="clean_estate_fixed.png" className="flex items-center gap-2 px-4 sm:px-8 py-2 sm:py-2.5 bg-neon-orange text-black text-[10px] sm:text-xs font-bold rounded-sm transition uppercase tracking-widest shadow-[0_0_20px_rgba(255,107,0,0.4)] hover:shadow-[0_0_30px_rgba(255,107,0,0.6)] hover:bg-white border border-transparent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            下載圖片
          </a>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
