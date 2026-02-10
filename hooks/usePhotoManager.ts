
import { useState, useCallback, useEffect, useRef } from 'react';
import { PhotoTask, ProcessingStatus } from '../types';

export const usePhotoManager = () => {
  const [photos, setPhotos] = useState<PhotoTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Auto-select first photo if none selected
  useEffect(() => {
    if (!selectedId && photos.length > 0) {
      setSelectedId(photos[0].id);
    }
  }, [photos.length, selectedId]);

  // Clean up memory when photos are removed to prevent browser crash
  const cleanupUrl = (url?: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const addPhotos = useCallback((newFiles: File[]) => {
    const newTasks: PhotoTask[] = newFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: ProcessingStatus.IDLE,
      customPrompt: "",
      spaceType: "" // Default to empty to force user selection (Safety)
    }));
    
    setPhotos(prev => [...prev, ...newTasks]);
    if (!selectedId && newTasks.length > 0) {
      setSelectedId(newTasks[0].id);
    }
  }, [selectedId]);

  const removePhoto = useCallback((id: string) => {
    // Abort if running
    if (abortControllers.current.has(id)) {
        abortControllers.current.get(id)?.abort();
        abortControllers.current.delete(id);
    }

    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      if (target) {
        cleanupUrl(target.previewUrl);
        if (target.resultUrl && target.resultUrl.startsWith('blob:')) {
            cleanupUrl(target.resultUrl);
        }
      }

      const filtered = prev.filter(p => p.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [selectedId]);

  const updatePhoto = useCallback((id: string, updates: Partial<PhotoTask>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const registerAbortController = useCallback((id: string, controller: AbortController) => {
      abortControllers.current.set(id, controller);
  }, []);

  const cancelProcessing = useCallback((id: string) => {
      if (abortControllers.current.has(id)) {
          abortControllers.current.get(id)?.abort();
          abortControllers.current.delete(id);
          updatePhoto(id, { 
              status: ProcessingStatus.ABORTED, 
              statusMessage: "已手動取消 (Cancelled)",
              errorMessage: undefined 
          });
      }
  }, [updatePhoto]);

  // Feature to use the result as the new source for iterative editing
  const applyResultAsSource = useCallback(async (id: string) => {
    setPhotos(prev => {
        const target = prev.find(p => p.id === id);
        if (!target || !target.resultUrl) return prev;
        
        return prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    previewUrl: target.resultUrl!, 
                    resultUrl: undefined,
                    status: ProcessingStatus.IDLE,
                    maskBlob: undefined,
                    statusMessage: "已套用上一步驟，可繼續編輯"
                };
            }
            return p;
        });
    });
  }, []);

  return {
    photos,
    selectedId,
    selectedPhoto: photos.find(p => p.id === selectedId),
    selectPhoto: setSelectedId,
    addPhotos,
    removePhoto,
    updatePhoto,
    applyResultAsSource,
    registerAbortController,
    cancelProcessing
  };
};
