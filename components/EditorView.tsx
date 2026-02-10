// ============================================================
// EditorView - 主編輯器頁面 (協調器角色)
// 負責管理狀態、業務邏輯，UI 渲染委託給子元件
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import PhotoList from './PhotoList';
import CanvasEditor, { CanvasEditorRef } from './CanvasEditor';
import ComparisonView from './ComparisonView';
import CursorEffect from './CursorEffect';
import PreviewModal from './PreviewModal';
import EditorToolbar from './editor/EditorToolbar';
import ControlsPanel from './editor/ControlsPanel';
import { ProcessingStatus, BrushSettings } from '../types';
import { removeObjectsWithGemini } from '../services/geminiService';
import { usePhotoManager } from '../hooks/usePhotoManager';
import { sheetService } from '../services/sheetService';
import { storageService } from '../services/storageService';
import { Logger } from '../services/logger';
import { IMAGE_CONFIG, CANVAS_CONFIG } from '../config/constants';
import { 
  STYLE_PRESETS, 
  generateItemPrompt, 
  generateEraserPrompt 
} from '../utils/promptUtils';

const log = Logger.create('EditorView');

type EditorMode = 'eraser' | 'staging';
type EraserSubMode = 'auto' | 'manual';
type StagingType = 'style' | 'item';

interface EditorViewProps {
  onLogout: () => void;
  isAdmin: boolean;
  onNavigateToAdmin: () => void;
  currentUser: { id: string; name: string; role: 'admin' | 'user' } | null;
}

const EditorView: React.FC<EditorViewProps> = ({ onLogout, isAdmin, onNavigateToAdmin, currentUser }) => {
  const { 
    photos, selectedId, selectedPhoto, 
    selectPhoto, addPhotos, removePhoto, updatePhoto,
    applyResultAsSource, registerAbortController, cancelProcessing
  } = usePhotoManager();
  
  // UI State
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: CANVAS_CONFIG.DEFAULT_BRUSH_SIZE,
    color: CANVAS_CONFIG.ERASER_BRUSH_COLOR, 
  });
  const [editorMode, setEditorMode] = useState<EditorMode>('eraser');
  const [eraserSubMode, setEraserSubMode] = useState<EraserSubMode>('auto');
  const [stagingType, setStagingType] = useState<StagingType>('item');
  const [activeTool, setActiveTool] = useState<'brush' | 'hand'>('brush');
  const [canUndo, setCanUndo] = useState(false);
  const [usageNotice, setUsageNotice] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const canvasRef = useRef<CanvasEditorRef>(null);

  // ---- 防止意外關閉 ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (photos.length > 0) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [photos]);

  // ---- 上傳驗證 ----
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const errors: string[] = [];
    const validFiles: File[] = [];

    if (photos.length + files.length > IMAGE_CONFIG.MAX_TOTAL_PHOTOS) {
      alert(`最多只能同時載入 ${IMAGE_CONFIG.MAX_TOTAL_PHOTOS} 張照片。\n目前已有 ${photos.length} 張。`);
      e.target.value = '';
      return;
    }

    for (const file of files) {
      if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
        errors.push(`「${file.name}」格式不支援 (${file.type || '未知'})，僅接受 JPEG/PNG/WebP`);
        continue;
      }
      if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        errors.push(`「${file.name}」(${sizeMB}MB) 超過大小上限 ${IMAGE_CONFIG.MAX_FILE_SIZE_MB}MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) alert(`部分檔案無法載入：\n\n${errors.join('\n')}`);
    if (validFiles.length > 0) {
      addPhotos(validFiles);
      setIsMobileSidebarOpen(false); // 手機上傳後關閉側欄
    }
    e.target.value = '';
  };

  // ---- 模式切換 ----
  const handleModeSwitch = (mode: EditorMode) => {
    setEditorMode(mode);
    if (!selectedId) return;
    if (mode === 'eraser') {
      updatePhoto(selectedId, { customPrompt: "" }); 
      setBrushSettings(prev => ({ ...prev, color: CANVAS_CONFIG.ERASER_BRUSH_COLOR }));
      setEraserSubMode('auto');
    } else {
      setBrushSettings(prev => ({ ...prev, color: CANVAS_CONFIG.STAGING_BRUSH_COLOR }));
      updatePhoto(selectedId, { customPrompt: "" });
    }
  };

  // ---- 軟裝 Prompt 應用 ----
  const applyStagingPrompt = (type: StagingType, value: string) => {
    if (!selectedId || !selectedPhoto) return;
    const space = selectedPhoto.spaceType || "Room";
    let prompt = "";
    if (type === 'style') {
      prompt = value.replace(/\{\{SPACE_TYPE\}\}/g, space);
    } else {
      prompt = generateItemPrompt(space, value);
    }
    updatePhoto(selectedId, { customPrompt: prompt });
  };

  // ---- 空間類型變更 ----
  const handleSpaceChange = (newSpace: string) => {
    if (!selectedId || !selectedPhoto) return;
    updatePhoto(selectedId, { spaceType: newSpace });

    if (editorMode === 'staging' && selectedPhoto.customPrompt) {
      const foundStyle = STYLE_PRESETS.find(p => 
        selectedPhoto.customPrompt?.includes(p.label) || selectedPhoto.customPrompt?.includes(p.desc)
      );
      if (foundStyle) {
        updatePhoto(selectedId, { customPrompt: foundStyle.prompt.replace(/\{\{SPACE_TYPE\}\}/g, newSpace) });
      } else if (selectedPhoto.customPrompt.includes("Object Insertion")) {
        const updated = selectedPhoto.customPrompt.replace(/CONTEXT: This is a .*?\./, `CONTEXT: This is a ${newSpace}.`);
        updatePhoto(selectedId, { customPrompt: updated });
      }
    }
  };

  // ---- 停止/取消 ----
  const handleCancel = () => {
    if (selectedId) cancelProcessing(selectedId);
  };

  // ---- 核心處理邏輯 ----
  const handleProcess = async () => {
    if (!selectedPhoto || !selectedId) return;

    if (!currentUser?.id) {
      alert("系統錯誤：找不到登入資訊，請重新登入。");
      onLogout();
      return;
    }

    const anyRunning = photos.some(p => p.status === ProcessingStatus.PROCESSING);
    if (anyRunning) {
      setUsageNotice("已有任務進行中，請等待目前處理完成後再操作。");
      return;
    }

    const decision = await sheetService.enforceUsagePolicy(currentUser.id);
    if (!decision.allowed) {
      const msg = decision.reason || "已達使用上限，請稍後再試。";
      setUsageNotice(msg);
      alert(msg);
      return;
    } else if (typeof decision.remaining === 'number') {
      setUsageNotice(`本時段剩餘可用次數：${decision.remaining}（來源：${decision.source === 'remote' ? '雲端' : '本機'}）`);
    } else {
      setUsageNotice(null);
    }
    
    if (editorMode === 'staging' && !selectedPhoto.spaceType) {
      alert("請先選擇「空間類型」，以免 AI 誤判環境。");
      return;
    }

    const abortController = new AbortController();
    registerAbortController(selectedId, abortController);

    updatePhoto(selectedId, { 
      status: ProcessingStatus.PROCESSING, 
      errorMessage: undefined, 
      statusMessage: "準備中..." 
    });

    try {
      let finalPrompt = selectedPhoto.customPrompt;
      const spaceType = selectedPhoto.spaceType || "Indoor Room";

      if (editorMode === 'eraser') {
        finalPrompt = generateEraserPrompt(eraserSubMode === 'auto' ? "" : finalPrompt);
      } else {
        const hasMask = !!selectedPhoto.maskBlob;
        if (!finalPrompt && hasMask) {
          finalPrompt = `Insert modern furniture into the masked area of this ${spaceType}. Match perspective.`;
        }
      }

      let fileToProcess = selectedPhoto.file;
      if (selectedPhoto.previewUrl.startsWith('data:')) {
        const res = await fetch(selectedPhoto.previewUrl);
        const blob = await res.blob();
        fileToProcess = new File([blob], "edited_temp.png", { type: "image/png" });
      }

      const resultBase64 = await removeObjectsWithGemini(
        fileToProcess, selectedPhoto.maskBlob, 
        finalPrompt || `Enhance ${spaceType}`, 'high',
        abortController.signal, 
        (msg) => updatePhoto(selectedId, { statusMessage: msg })
      );
      
      updatePhoto(selectedId, { status: ProcessingStatus.COMPLETED, resultUrl: resultBase64 });
      log.info('圖片處理完成', { file: selectedPhoto.file.name, mode: editorMode });

      sheetService.logUsage(
        currentUser?.id || "UNKNOWN_USER", 
        `Processed: ${selectedPhoto.file.name} [${spaceType}] Mode:${editorMode}`
      );

      // 背景上傳到 Google Drive
      (async () => {
        try {
          let originalBase64 = selectedPhoto.previewUrl;
          if (originalBase64.startsWith('blob:')) {
            const resp = await fetch(originalBase64);
            const blob = await resp.blob();
            const reader = new FileReader();
            originalBase64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
          await storageService.uploadImagePair(originalBase64, resultBase64, {
            userId: currentUser?.id || 'UNKNOWN',
            userName: currentUser?.name || 'Unknown',
            fileName: selectedPhoto.file.name,
            spaceType: spaceType,
            mode: editorMode,
          });
          log.info('圖片已自動上傳到 Google Drive');
        } catch (uploadErr) {
          log.warn('自動上傳到 Drive 失敗（不影響結果）', uploadErr);
        }
      })();

    } catch (error: any) {
      if (error.message !== "Operation cancelled") {
        updatePhoto(selectedId, { 
          status: ProcessingStatus.FAILED, 
          errorMessage: error.message || "Unknown error" 
        });
        log.error('圖片處理失敗', error.message);
      }
    }
  };

  const handleRetry = useCallback(() => {
    if (selectedId) {
      updatePhoto(selectedId, { status: ProcessingStatus.IDLE, resultUrl: undefined, errorMessage: undefined });
    }
  }, [selectedId, updatePhoto]);

  const handleContinue = useCallback(() => {
    if (selectedId) applyResultAsSource(selectedId);
  }, [selectedId, applyResultAsSource]);

  // ---- 就緒檢查 ----
  const getReadiness = () => {
    if (!selectedPhoto) return { isReady: false, reason: "No photo" };
    const hasMask = !!selectedPhoto.maskBlob;
    const hasPrompt = !!selectedPhoto.customPrompt && selectedPhoto.customPrompt.trim().length > 0;
    
    if (editorMode === 'eraser') {
      if (!hasMask) return { isReady: false, reason: "請先塗抹要移除的區域" };
      return { isReady: true, reason: "" };
    } else {
      if (!selectedPhoto.spaceType) return { isReady: false, reason: "請選擇空間類型" };
      if (stagingType === 'style') {
        if (!hasPrompt) return { isReady: false, reason: "請選擇一種風格" };
        return { isReady: true, reason: "" };
      } else {
        if (!hasMask) return { isReady: false, reason: "請標記物件放置位置" };
        if (!hasPrompt) return { isReady: false, reason: "請選擇或輸入家具" };
        return { isReady: true, reason: "" };
      }
    }
  };

  const { isReady, reason: notReadyReason } = getReadiness();
  const isProcessing = selectedPhoto?.status === ProcessingStatus.PROCESSING;

  return (
    <div className="flex h-screen bg-brand-black text-brand-text overflow-hidden font-sans selection:bg-neon-orange selection:text-white">
      <CursorEffect />

      {selectedPhoto && (
        <PreviewModal
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={selectedPhoto.file.name}
          originalUrl={selectedPhoto.previewUrl}
          resultUrl={selectedPhoto.resultUrl}
        />
      )}

      {/* 手機版側欄覆蓋 */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 照片側欄 - 手機可收合 */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 md:relative md:transform-none md:w-80
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <PhotoList 
          photos={photos} selectedId={selectedId} 
          onSelect={(id) => { selectPhoto(id); setIsMobileSidebarOpen(false); }}
          onRemove={removePhoto} onUpload={handleUpload}
        />
      </div>

      {/* 主工作區 */}
      <div className="flex-1 flex flex-col min-w-0 bg-brand-dark relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] pointer-events-none opacity-20 z-0"></div>

        {/* 手機版漢堡選單按鈕 */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="absolute top-3 left-3 z-30 md:hidden p-2 bg-zinc-900 border border-zinc-700 rounded-sm text-zinc-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* 工具列 */}
        <EditorToolbar
          selectedPhoto={selectedPhoto ?? null}
          brushSettings={brushSettings}
          setBrushSettings={setBrushSettings}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          canUndo={canUndo}
          canvasRef={canvasRef}
          editorMode={editorMode}
          isReady={isReady}
          notReadyReason={notReadyReason}
          isProcessing={!!isProcessing}
          isAdmin={isAdmin}
          usageNotice={usageNotice}
          onProcess={handleProcess}
          onCancel={handleCancel}
          onPreview={() => setIsPreviewOpen(true)}
          onNavigateToAdmin={onNavigateToAdmin}
          onLogout={onLogout}
        />

        {/* 主畫布 */}
        <main className="flex-1 relative flex flex-col min-h-0 bg-brand-dark overflow-hidden z-10">
          {selectedPhoto ? (
            <>
              <div className="flex-1 relative overflow-hidden bg-[#080808]">
                {selectedPhoto.status === ProcessingStatus.COMPLETED && selectedPhoto.resultUrl ? (
                  <ComparisonView 
                    originalUrl={selectedPhoto.previewUrl}
                    resultUrl={selectedPhoto.resultUrl}
                    onRetry={handleRetry}
                    onContinue={handleContinue}
                  />
                ) : (
                  <>
                    <CanvasEditor 
                      ref={canvasRef}
                      imageUrl={selectedPhoto.previewUrl}
                      brushSettings={brushSettings}
                      onMaskChange={(blob) => updatePhoto(selectedId!, { maskBlob: blob || undefined })}
                      readOnly={selectedPhoto.status === ProcessingStatus.PROCESSING}
                      activeTool={activeTool}
                      onHistoryChange={setCanUndo}
                    />
                    
                    {/* 錯誤顯示 */}
                    {selectedPhoto.errorMessage && (
                      <div className="absolute top-4 sm:top-20 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500 text-red-200 px-4 sm:px-8 py-4 sm:py-6 rounded-sm shadow-[0_0_50px_rgba(239,68,68,0.5)] backdrop-blur-md max-w-sm sm:max-w-lg text-center z-50">
                        <div className="text-red-500 font-bold text-sm sm:text-lg mb-2 flex items-center justify-center gap-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          處理失敗
                        </div>
                        <p className="font-mono text-xs sm:text-sm">{selectedPhoto.errorMessage}</p>
                        <button onClick={handleRetry} className="mt-4 px-6 py-2 bg-red-900/50 hover:bg-red-800 text-white rounded-sm text-xs font-bold uppercase tracking-widest border border-red-700 transition-colors">
                          重試
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 底部控制面板 */}
              {selectedPhoto.status !== ProcessingStatus.COMPLETED && (
                <ControlsPanel
                  editorMode={editorMode}
                  onModeSwitch={handleModeSwitch}
                  eraserSubMode={eraserSubMode}
                  setEraserSubMode={setEraserSubMode}
                  stagingType={stagingType}
                  setStagingType={setStagingType}
                  selectedPhoto={selectedPhoto}
                  selectedId={selectedId!}
                  onSpaceChange={handleSpaceChange}
                  onApplyStagingPrompt={applyStagingPrompt}
                  onUpdatePhoto={updatePhoto}
                />
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <h3 className="text-lg sm:text-xl font-bold text-zinc-700 tracking-[0.4em] uppercase text-center">
                系統待機中 STANDBY
              </h3>
              <p className="text-xs text-zinc-600 mt-2 md:hidden">點擊左上角按鈕匯入照片</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EditorView;
