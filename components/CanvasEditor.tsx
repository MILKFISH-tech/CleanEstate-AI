
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { BrushSettings } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export interface CanvasEditorRef {
    undo: () => void;
    clear: () => void;
}

interface CanvasEditorProps {
  imageUrl: string;
  brushSettings: BrushSettings;
  onMaskChange: (blob: Blob | null) => void;
  readOnly: boolean;
  activeTool: 'brush' | 'hand';
  onHistoryChange?: (hasHistory: boolean) => void;
}

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({ 
    imageUrl, 
    brushSettings, 
    onMaskChange, 
    readOnly,
    activeTool,
    onHistoryChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null); // Direct DOM access for cursor
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // UX State
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    undo: handleUndo,
    clear: clearCanvas
  }));

  // Update history state in parent
  useEffect(() => {
      onHistoryChange?.(history.length > 0);
  }, [history.length, onHistoryChange]);

  // Reset View when image changes
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [imageUrl]);

  // Keyboard Shortcuts (Space for Pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
            setIsSpacePressed(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacePressed(false);
            setIsPanning(false); // Stop panning if space released
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Setup canvas size based on image natural size
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImgLoaded(true);
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = img.naturalWidth;
        canvasRef.current.height = img.naturalHeight;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
          setHistory([]);
        }
      }
    };
    imageRef.current = img;
  }, [imageUrl]);

  // --- Coordinate Mapping ---
  // Improved to handle both Mouse and Touch events uniformly
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let clientX, clientY;
    // Check if it's a TouchEvent (using type guard logic)
    if ('touches' in e) {
      // Use the first touch point
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        // Fallback for touchend where touches might be empty
        clientX = (e as React.TouchEvent).changedTouches[0].clientX;
        clientY = (e as React.TouchEvent).changedTouches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
     if ('touches' in e && e.touches.length > 0) {
         return { x: e.touches[0].clientX, y: e.touches[0].clientY };
     } else if ('changedTouches' in e && e.changedTouches.length > 0) {
         return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
     } else {
         return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
     }
  };

  // --- History Management ---
  const saveToHistory = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
        const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHistory(prev => {
            const newHistory = [...prev, data];
            if (newHistory.length > 10) return newHistory.slice(1);
            return newHistory;
        });
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory(prev => prev.slice(0, -1));
    exportMask();
  };

  // --- Interaction Handlers (Unified for Mouse & Touch) ---

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgLoaded) return;
    
    // Determine if it's a "right click" or specialized touch
    const isRightClick = ('button' in e && e.button === 1) || ('button' in e && e.button === 2);
    const isHandMode = activeTool === 'hand' || isSpacePressed || isRightClick;

    const { x: clientX, y: clientY } = getClientCoordinates(e);

    // Hand Tool Logic
    if (isHandMode) { 
      setIsPanning(true);
      setStartPan({ x: clientX - pan.x, y: clientY - pan.y });
      e.preventDefault(); // Prevent scrolling on touch
      return;
    }

    // Brush Logic
    if (readOnly) return;
    saveToHistory();
    setIsDrawing(true);
    
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Smooth Brush Settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushSettings.color;
    
    // Soft Edge Trick: Use shadow with same color
    ctx.shadowBlur = 2; 
    ctx.shadowColor = brushSettings.color;

    ctx.lineWidth = brushSettings.size * (canvasRef.current!.width / 1000) * 5; 
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const { x: clientX, y: clientY } = getClientCoordinates(e);

    // Update Cursor Position using DIRECT DOM MANIPULATION (Zero Lag)
    if (cursorRef.current && !readOnly && activeTool !== 'hand' && !isSpacePressed) {
        cursorRef.current.style.transform = `translate(${clientX}px, ${clientY}px) translate(-50%, -50%)`;
        cursorRef.current.style.display = 'block';
    } else if (cursorRef.current) {
        cursorRef.current.style.display = 'none';
    }

    // Pan Logic
    if (isPanning) {
        setPan({
            x: clientX - startPan.x,
            y: clientY - startPan.y
        });
        e.preventDefault(); // Critical for mobile
        return;
    }

    // Brush Logic
    if (!isDrawing || readOnly || !imgLoaded) return;
    e.preventDefault(); // Prevent scrolling while drawing

    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (isPanning) {
        setIsPanning(false);
    } else if (isDrawing) {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.closePath();
        exportMask();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
      // Prevent default browser zoom
      if (e.ctrlKey) {
          e.preventDefault();
      }
      const delta = -e.deltaY;
      const step = 0.1;
      const newScale = Math.min(Math.max(scale + (delta > 0 ? step : -step), 0.1), 5);
      setScale(newScale);
  };

  // --- Mask Export ---
  const exportMask = () => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const sourceData = ctx.getImageData(0, 0, width, height);
    const sourcePixels = sourceData.data;
    const maskData = ctx.createImageData(width, height);
    const maskPixels = maskData.data;

    for (let i = 0; i < sourcePixels.length; i += 4) {
      const alpha = sourcePixels[i + 3];
      // Threshold check: Even soft edges (low alpha) are captured
      if (alpha > 10) {
        maskPixels[i] = 255; maskPixels[i + 1] = 255; maskPixels[i + 2] = 255; maskPixels[i + 3] = 255;
      } else {
        maskPixels[i] = 0; maskPixels[i + 1] = 0; maskPixels[i + 2] = 0; maskPixels[i + 3] = 255;
      }
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    tempCanvas.getContext('2d')?.putImageData(maskData, 0, 0);
    tempCanvas.toBlob((blob) => onMaskChange(blob), 'image/png');
  };

  const clearCanvas = () => {
    saveToHistory();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onMaskChange(null);
    }
  };

  // --- Zoom Controls ---
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 5));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.1));
  const resetView = () => { setScale(1); setPan({x:0, y:0}); };

  // Calculate actual brush size in Screen Pixels for the overlay cursor
  const getScreenBrushSize = () => {
      if (!canvasRef.current) return brushSettings.size;
      const baseSize = brushSettings.size * (canvasRef.current.width / 1000) * 5;
      return baseSize * scale; 
  };

  const isHandActive = activeTool === 'hand' || isSpacePressed || isPanning;

  // React Re-render Optimization: 
  // We update the cursor size via key prop or specialized effect only when scale/brushSize changes,
  // but position updates via Ref in handleMove.
  useEffect(() => {
     if(cursorRef.current) {
         const size = getScreenBrushSize();
         cursorRef.current.style.width = `${size}px`;
         cursorRef.current.style.height = `${size}px`;
     }
  }, [scale, brushSettings.size]);

  return (
    <div className="flex flex-col h-full relative group bg-[#080808]">
      
      {/* --- Floating Zoom Controls (Bottom-Right) --- */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-black/80 backdrop-blur-md p-2 rounded-md border border-zinc-800 shadow-xl">
        <button onClick={zoomIn} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors"><ZoomIn size={20} /></button>
        <button onClick={zoomOut} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors"><ZoomOut size={20} /></button>
        <button onClick={resetView} className="p-2 text-zinc-300 hover:text-neon-orange hover:bg-zinc-800 rounded transition-colors" title="Reset View"><Maximize size={20} /></button>
        <div className="text-[10px] font-mono text-center text-zinc-500 pt-1 border-t border-zinc-800">{Math.round(scale * 100)}%</div>
      </div>

      {/* --- Performance Optimized Cursor Overlay (Ref based) --- */}
      <div 
            ref={cursorRef}
            className="fixed pointer-events-none z-[9999] rounded-full border border-white shadow-[0_0_2px_rgba(0,0,0,0.8)] mix-blend-difference hidden"
            style={{
                top: 0, left: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                // Transition only on width/height, not transform (transform needs to be instant)
                transition: 'width 0.1s, height 0.1s' 
            }}
        />

      {/* --- Main Canvas Area --- */}
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-hidden relative select-none touch-none ${isHandActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'}`}
        onWheel={handleWheel}
        
        // Mouse Events
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        
        // Touch Events (Critical for Tablet/Mobile)
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        
        style={{ touchAction: 'none' }} // PREVENTS SCROLLING ON TOUCH
      >
        {!imgLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neon-orange/50 pointer-events-none">
                <div className="w-12 h-12 border-2 border-neon-orange/30 border-t-neon-orange rounded-full animate-spin"></div>
                <span className="font-mono text-xs tracking-widest uppercase">載入影像資料中...</span>
            </div>
        )}
        
        {/* Transform Layer - Added will-change for GPU acceleration */}
        <div 
            className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                willChange: 'transform' // GPU Hint
            }}
        >
            <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-800/50" style={{ lineHeight: 0 }}>
                <img 
                    src={imageUrl} 
                    className="block pointer-events-none select-none max-w-[80vw] max-h-[70vh] object-contain"
                    alt="Original"
                    draggable={false}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                />
            </div>
        </div>
      </div>

      {/* Mode Indicator Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-md border border-neon-orange/30 px-3 py-1.5 rounded-sm shadow-lg text-[10px] font-bold text-neon-orange uppercase tracking-widest flex items-center gap-2">
           <div className={`w-1.5 h-1.5 rounded-full ${readOnly ? 'bg-zinc-500' : 'bg-neon-orange animate-pulse'}`}></div>
           {readOnly ? "預覽模式 (VIEW ONLY)" : (isHandActive ? "移動模式 (PANNING)" : "標記模式 (MASKING)")}
        </div>
      </div>
    </div>
  );
});

export default CanvasEditor;
