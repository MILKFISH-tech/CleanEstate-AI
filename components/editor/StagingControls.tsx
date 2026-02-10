// ============================================================
// StagingControls - 虛擬軟裝模式的控制面板
// ============================================================

import React from 'react';
import { PhotoTask } from '../../types';
import { SPACE_OPTIONS, STYLE_PRESETS, FURNITURE_SUGGESTIONS } from '../../utils/promptUtils';

type StagingType = 'style' | 'item';

interface StagingControlsProps {
  stagingType: StagingType;
  setStagingType: (type: StagingType) => void;
  selectedPhoto: PhotoTask;
  selectedId: string;
  onSpaceChange: (space: string) => void;
  onApplyStagingPrompt: (type: StagingType, value: string) => void;
  onUpdatePhoto: (id: string, updates: Partial<PhotoTask>) => void;
}

const StagingControls: React.FC<StagingControlsProps> = ({
  stagingType,
  setStagingType,
  selectedPhoto,
  selectedId,
  onSpaceChange,
  onApplyStagingPrompt,
  onUpdatePhoto,
}) => {
  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row gap-4 md:gap-6 h-full">
      
      {/* Column 1: 設定空間 */}
      <div className="md:w-56 flex flex-col gap-3 md:gap-4 md:border-r md:border-zinc-800 md:pr-6">
        <div>
          <label className="text-xs font-bold text-neon-blue uppercase tracking-widest mb-2 flex items-center gap-2">
            1. 設定空間
            <span className="text-[10px] text-white bg-red-600 px-1 rounded font-bold animate-pulse">必選</span>
          </label>
          <select 
            className={`w-full bg-zinc-900 border text-white text-xs p-2.5 rounded-sm outline-none mb-2 ${
              !selectedPhoto.spaceType ? "border-red-500 text-red-100" : "border-zinc-700 focus:border-neon-blue"
            }`}
            value={SPACE_OPTIONS.some(o => o.value === selectedPhoto.spaceType) ? selectedPhoto.spaceType : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") onSpaceChange(e.target.value);
            }}
          >
            {SPACE_OPTIONS.map(opt => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 md:mt-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">2. 選擇類型</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setStagingType('item')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-sm border ${stagingType === 'item' ? 'bg-neon-blue text-black border-neon-blue' : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
            >
              + 單一家具
            </button>
            <button 
              onClick={() => setStagingType('style')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-sm border ${stagingType === 'style' ? 'bg-neon-blue text-black border-neon-blue' : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
            >
              全室風格
            </button>
          </div>
        </div>
      </div>

      {/* Column 2: 建議模組 */}
      <div className="flex-1 overflow-y-auto pr-2 md:border-r md:border-zinc-800 md:mr-2">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
          3. 選擇建議模組
        </label>
        {stagingType === 'style' ? (
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => {
              const isSelected = selectedPhoto.customPrompt?.includes(preset.desc);
              return (
                <button
                  key={preset.id}
                  onClick={() => onApplyStagingPrompt('style', preset.prompt)}
                  className={`p-2 rounded-sm border text-left transition-all group ${
                    isSelected ? 'bg-zinc-900 border-neon-blue' : 'bg-black border-zinc-800 hover:bg-zinc-900'
                  }`}
                >
                  <span className={`text-[10px] font-bold block ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                    {preset.label}
                  </span>
                  <span className="text-[9px] text-zinc-600">{preset.desc}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {FURNITURE_SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                onClick={() => onApplyStagingPrompt('item', item.value)}
                className="p-2 rounded-sm border text-left transition-all hover:bg-zinc-900 hover:border-zinc-600 border-zinc-800 bg-black"
              >
                <span className="text-[10px] font-bold text-zinc-300 block">
                  {item.label.split(' ')[0]}
                </span>
                <span className="text-[8px] text-zinc-600 truncate">{item.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Column 3: AI 指令編輯 */}
      <div className="md:w-1/3 flex flex-col">
        <label className="text-xs font-bold text-neon-blue uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>4. AI 指令編輯</span>
          <span className="text-[9px] bg-zinc-900 text-zinc-400 px-1 rounded border border-zinc-800">可手動修改</span>
        </label>
        <textarea 
          className="flex-1 min-h-[80px] bg-zinc-950 border border-zinc-800 focus:border-neon-blue text-white p-3 rounded-sm outline-none font-mono text-[10px] resize-none leading-relaxed text-zinc-300"
          placeholder="// 選擇左側風格或家具後，指令將自動產生於此。您也可以直接在此修改指令..."
          value={selectedPhoto.customPrompt || ""}
          onChange={(e) => onUpdatePhoto(selectedId, { customPrompt: e.target.value })}
        />
      </div>
    </div>
  );
};

export default StagingControls;
