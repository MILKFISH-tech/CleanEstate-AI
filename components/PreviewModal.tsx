import React, { useEffect, useMemo, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';

type PreviewMode = 'compare' | 'original' | 'result';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  originalUrl: string;
  resultUrl?: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const PreviewModal: React.FC<PreviewModalProps> = ({ open, onClose, title, originalUrl, resultUrl }) => {
  const hasResult = !!resultUrl;

  const defaultMode: PreviewMode = useMemo(() => (hasResult ? 'compare' : 'original'), [hasResult]);
  const [mode, setMode] = useState<PreviewMode>(defaultMode);

  // Zoom & Pan
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Compare slider
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);

  // Reset when opened / image changes
  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSliderPosition(50);
    setIsPanning(false);
    setIsResizing(false);
  }, [open, defaultMode, originalUrl, resultUrl]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const zoomIn = () => setScale((s) => clamp(s + 0.25, 0.1, 5));
  const zoomOut = () => setScale((s) => clamp(s - 0.25, 0.1, 5));
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    // prevent browser zoom on ctrl+wheel
    if (e.ctrlKey) e.preventDefault();
    const delta = -e.deltaY;
    const step = 0.1;
    const next = clamp(scale + (delta > 0 ? step : -step), 0.1, 5);
    setScale(next);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setIsPanning(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Slider
    if (mode === 'compare' && isResizing) {
      const target = e.currentTarget.querySelector('.preview-compare-container');
      if (target) {
        const rect = (target as HTMLElement).getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        setSliderPosition((x / rect.width) * 100);
      }
      return;
    }
    // Pan
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  const downloadCurrent = () => {
    const href =
      mode === 'original' ? originalUrl : mode === 'result' ? (resultUrl || originalUrl) : (resultUrl || originalUrl);
    const link = document.createElement('a');
    link.href = href;
    const suffix = mode === 'original' ? 'original' : mode === 'result' ? 'result' : 'compare';
    link.download = `preview_${suffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => {
        // click on backdrop closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[96vw] h-[92vh] bg-brand-black border border-brand-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-brand-border bg-black/60">
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-2 h-2 bg-neon-orange rounded-full" />
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-widest uppercase text-white truncate">
                {title || '預覽視窗 PREVIEW'}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">ESC 關閉 • 滾輪縮放 • 拖曳移動</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-lg p-1">
              <button
                onClick={() => setMode('original')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                  mode === 'original' ? 'bg-neon-orange text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                原圖
              </button>
              {hasResult && (
                <>
                  <button
                    onClick={() => setMode('compare')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                      mode === 'compare' ? 'bg-neon-orange text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    比對
                  </button>
                  <button
                    onClick={() => setMode('result')}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded ${
                      mode === 'result' ? 'bg-neon-orange text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    結果
                  </button>
                </>
              )}
            </div>

            <button
              onClick={downloadCurrent}
              className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors border border-zinc-800"
              title="下載目前畫面"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-300 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors border border-zinc-800"
              title="關閉"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className={`flex-1 relative overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#050505] ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleContainerMouseDown}
          onWheel={handleWheel}
        >
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-md border border-zinc-800 shadow-xl pointer-events-auto">
            <button onClick={zoomIn} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors">
              <ZoomIn size={20} />
            </button>
            <button onClick={zoomOut} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors">
              <ZoomOut size={20} />
            </button>
            <button onClick={resetView} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors" title="重置視角">
              <Maximize size={20} />
            </button>
            <div className="text-[10px] font-mono text-center text-zinc-500 pt-1 border-t border-zinc-800">
              {Math.round(scale * 100)}%
            </div>
          </div>

          {/* Transformed content */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            {mode === 'compare' && hasResult ? (
              <div className="preview-compare-container relative select-none shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-zinc-800">
                {/* Base image (result) */}
                <img
                  src={resultUrl}
                  alt="Result"
                  className="block max-h-[78vh] max-w-[92vw] object-contain pointer-events-none"
                  draggable={false}
                />

                {/* Overlay (original) clipped */}
                <div
                  className="absolute top-0 left-0 h-full w-full overflow-hidden border-r border-neon-orange/50 pointer-events-none"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="block max-h-[78vh] max-w-none object-contain grayscale-[20%]"
                    style={{ height: '100%', width: 'auto' }}
                    draggable={false}
                  />
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-neon-orange/50 cursor-ew-resize flex items-center justify-center z-20 group hover:bg-neon-orange"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={handleSliderMouseDown}
                >
                  <div className="w-8 h-8 bg-black/80 backdrop-blur-md border border-neon-orange text-neon-orange rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.4)] hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                        transform="rotate(90 12 12)"
                      />
                    </svg>
                  </div>
                </div>

                <div className="absolute top-3 left-3 text-[10px] font-bold text-zinc-400 tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                  原圖
                </div>
                <div className="absolute top-3 right-3 text-[10px] font-bold text-neon-orange tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none border border-neon-orange/30">
                  結果
                </div>
              </div>
            ) : (
              <div className="relative select-none shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-zinc-800">
                <img
                  src={mode === 'result' && hasResult ? (resultUrl as string) : originalUrl}
                  alt={mode === 'result' ? 'Result' : 'Original'}
                  className="block max-h-[78vh] max-w-[92vw] object-contain pointer-events-none"
                  draggable={false}
                />
                <div className="absolute top-3 left-3 text-[10px] font-bold text-zinc-400 tracking-widest uppercase bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                  {mode === 'result' ? '結果' : '原圖'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

