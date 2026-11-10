import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Copy,
  Check,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Shuffle,
  LayoutGrid,
  Columns,
  Sparkles,
  Camera,
  GitMerge,
} from 'lucide-react';
import { ColorData, getReadableTextColor } from '../utils/colorUtils';

interface PaletteDisplayProps {
  colors: ColorData[];
  onColorChange: (colors: ColorData[]) => void;
  onEditColor: (color: ColorData) => void;
  onOpenAddTone: () => void;
  onResetOriginal: () => void;
  onCopyText: (text: string, label: string) => void;
}

export const PaletteDisplay: React.FC<PaletteDisplayProps> = ({
  colors,
  onColorChange,
  onEditColor,
  onOpenAddTone,
  onResetOriginal,
  onCopyText,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'proportional' | 'editorial'>('proportional');

  const handleCopyHex = (color: ColorData) => {
    onCopyText(color.hex, `Copied ${color.hex}`);
    setCopiedId(color.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleLock = (id: string) => {
    const updated = colors.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c));
    onColorChange(updated);
  };

  const removeColor = (id: string) => {
    if (colors.length <= 3) return;
    const updated = colors.filter((c) => c.id !== id);
    onColorChange(updated);
  };

  const moveColor = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= colors.length) return;
    const newColors = [...colors];
    const temp = newColors[index];
    newColors[index] = newColors[targetIndex];
    newColors[targetIndex] = temp;
    onColorChange(newColors);
  };

  const shuffleUnlocked = () => {
    const unlocked = colors.filter((c) => !c.locked);
    const shuffled = [...unlocked].sort(() => Math.random() - 0.5);
    let sIndex = 0;
    const result = colors.map((c) => {
      if (c.locked) return c;
      return shuffled[sIndex++];
    });
    onColorChange(result);
  };

  const getOriginBadge = (color: ColorData) => {
    switch (color.origin) {
      case 'interpolated':
        return { label: 'Bridge', class: 'bg-stone-200 text-stone-700' };
      case 'curated-accent':
        return { label: 'Artistic Accent', class: 'bg-amber-100 text-amber-900 border border-amber-300' };
      case 'custom':
        return { label: 'Custom', class: 'bg-blue-100 text-blue-800' };
      default:
        return { label: 'Photo', class: 'bg-stone-100 text-stone-700' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E0D6] pb-3">
        <div>
          <h3 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
            Chromatic Spectrum
          </h3>
          <p className="text-xs text-stone-500 font-sans">
            {colors.length} calibrated tones grounded in source exposure
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout Mode Selector */}
          <div className="flex items-center p-0.5 bg-stone-200/70 rounded text-xs text-stone-700">
            <button
              onClick={() => setLayoutMode('proportional')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                layoutMode === 'proportional' ? 'bg-white font-medium text-stone-900 shadow-xs' : 'hover:text-stone-900'
              }`}
              title="Proportional to image prominence"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Proportional</span>
            </button>
            <button
              onClick={() => setLayoutMode('editorial')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                layoutMode === 'editorial' ? 'bg-white font-medium text-stone-900 shadow-xs' : 'hover:text-stone-900'
              }`}
              title="Editorial asymmetrical specimen"
            >
              <LayoutGrid className="w-3 h-3" />
              <span className="hidden sm:inline">Editorial Deck</span>
            </button>
          </div>

          {/* Quick Actions */}
          <button
            onClick={shuffleUnlocked}
            className="p-1.5 rounded border border-stone-300 bg-white hover:border-stone-400 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
            title="Reorder unlocked swatches"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetOriginal}
            className="p-1.5 rounded border border-stone-300 bg-white hover:border-stone-400 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer"
            title="Reset to 1:1 original extraction"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenAddTone}
            disabled={colors.length >= 10}
            className="px-2.5 py-1 text-xs font-semibold rounded border border-stone-900 bg-stone-900 hover:bg-stone-800 text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tone</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PROPORTIONAL FREQUENCY COMPOSITION */}
      {layoutMode === 'proportional' && (
        <div className="space-y-3">
          {/* Continuous Proportional Ribbon */}
          <div className="h-32 sm:h-44 w-full rounded-md overflow-hidden flex border border-stone-300 shadow-xs bg-stone-100">
            {colors.map((color) => {
              const textColor = getReadableTextColor(color.hex);
              const flexGrow = Math.max(0.08, color.weight);

              return (
                <div
                  key={color.id}
                  style={{
                    backgroundColor: color.hex,
                    flex: `${flexGrow} 0 0%`,
                  }}
                  onClick={() => onEditColor(color)}
                  className="relative group transition-all duration-200 cursor-pointer overflow-hidden p-3 flex flex-col justify-between hover:brightness-105"
                >
                  {/* Top: Lock badge & Prominence & Origin */}
                  <div
                    className="flex items-center justify-between opacity-85 group-hover:opacity-100 transition-opacity"
                    style={{ color: textColor }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(color.id);
                      }}
                      className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                      title={color.locked ? 'Unlock color' : 'Lock color'}
                    >
                      {color.locked ? (
                        <Lock className="w-3.5 h-3.5 drop-shadow-xs" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 drop-shadow-xs" />
                      )}
                    </button>
                    <span className="font-mono text-[10px] tracking-tight">
                      {Math.round(color.weight * 100)}%
                    </span>
                  </div>

                  {/* Bottom: Hex & name & origin */}
                  <div
                    className="transform translate-y-1 group-hover:translate-y-0 transition-transform"
                    style={{ color: textColor }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <p className="font-mono font-bold text-xs sm:text-sm tracking-wider truncate">
                        {color.hex}
                      </p>
                    </div>
                    <p className="text-[11px] opacity-90 truncate font-sans">
                      {color.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Color Specimen Cards Below */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {colors.map((color, index) => {
              const badge = getOriginBadge(color);

              return (
                <div
                  key={color.id}
                  className="border border-stone-200 bg-white rounded p-2.5 hover:border-stone-400 transition-all flex flex-col justify-between group shadow-2xs"
                >
                  <div>
                    {/* Header: Index, Prominence, and Origin Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-stone-500">
                          0{index + 1}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${badge.class}`}>
                          {badge.label}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleLock(color.id)}
                        className="text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                        title={color.locked ? 'Locked' : 'Lock'}
                      >
                        {color.locked ? (
                          <Lock className="w-3 h-3 text-stone-900" />
                        ) : (
                          <Unlock className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </button>
                    </div>

                    {/* Swatch Mini Bar */}
                    <div
                      onClick={() => onEditColor(color)}
                      className="h-10 rounded-xs mb-2 cursor-pointer border border-black/5 hover:scale-[1.02] transition-transform"
                      style={{ backgroundColor: color.hex }}
                    />

                    {/* Hex & Name */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-stone-900">
                          {color.hex}
                        </span>
                        <button
                          onClick={() => handleCopyHex(color)}
                          className="text-stone-400 hover:text-stone-800 transition-colors p-0.5 cursor-pointer"
                          title="Copy HEX"
                        >
                          {copiedId === color.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-600 truncate font-sans">{color.name}</p>
                    </div>

                    {/* RGB / HSL specs */}
                    <div className="text-[10px] font-mono text-stone-600 space-y-0.5 border-t border-stone-100 pt-1.5">
                      <p>RGB {color.rgb.r}, {color.rgb.g}, {color.rgb.b}</p>
                      <p>HSL {color.hsl.h}° · {color.hsl.s}% · {color.hsl.l}%</p>
                      {color.sourceNote && (
                        <p className="text-[9px] text-stone-500 font-sans truncate" title={color.sourceNote}>
                          {color.sourceNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Controls */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-stone-400">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveColor(index, 'left')}
                        disabled={index === 0}
                        className="p-1 hover:text-stone-800 disabled:opacity-20 cursor-pointer"
                        title="Move left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveColor(index, 'right')}
                        disabled={index === colors.length - 1}
                        className="p-1 hover:text-stone-800 disabled:opacity-20 cursor-pointer"
                        title="Move right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditColor(color)}
                        className="p-1 hover:text-stone-800 cursor-pointer"
                        title="Edit tone"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {colors.length > 3 && (
                        <button
                          onClick={() => removeColor(color.id)}
                          className="p-1 hover:text-red-600 cursor-pointer"
                          title="Remove tone"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: EDITORIAL SPECIMEN DECK */}
      {layoutMode === 'editorial' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((color, index) => {
            const textColor = getReadableTextColor(color.hex);
            const badge = getOriginBadge(color);

            return (
              <div
                key={color.id}
                className="border border-stone-200 bg-white rounded-md overflow-hidden hover:border-stone-400 transition-all flex flex-col group shadow-2xs"
              >
                {/* Large Color Field */}
                <div
                  onClick={() => onEditColor(color)}
                  className="h-36 p-4 flex flex-col justify-between cursor-pointer relative"
                  style={{ backgroundColor: color.hex }}
                >
                  <div
                    className="flex items-center justify-between"
                    style={{ color: textColor }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold tracking-wider">
                        SPECIMEN № 0{index + 1}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${badge.class}`}>
                        {badge.label}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(color.id);
                      }}
                      className="p-1 rounded hover:bg-black/10 transition-colors cursor-pointer"
                    >
                      {color.locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>

                  <div style={{ color: textColor }}>
                    <span className="font-serif text-2xl font-semibold tracking-tight block">
                      {color.name}
                    </span>
                    <span className="font-mono text-sm tracking-wider opacity-90">
                      {color.hex}
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="p-3 bg-[#FAF8F5] border-t border-stone-200 flex items-center justify-between text-xs">
                  <div className="font-mono text-[11px] text-stone-600 space-y-0.5">
                    <div>RGB: {color.rgb.r}, {color.rgb.g}, {color.rgb.b}</div>
                    <div>Luminance: {Math.round(color.hsl.l)}% · Weight: {Math.round(color.weight * 100)}%</div>
                    {color.sourceNote && (
                      <div className="text-[10px] text-stone-500 font-sans truncate">{color.sourceNote}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyHex(color)}
                      className="px-2 py-1 rounded border border-stone-200 bg-white hover:border-stone-400 text-stone-700 flex items-center gap-1 font-mono text-[11px] cursor-pointer"
                    >
                      {copiedId === color.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => onEditColor(color)}
                      className="px-2 py-1 rounded bg-stone-900 text-white text-[11px] hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Understated Helper */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-stone-500 pt-1 border-t border-stone-200/60">
        <span>Tones originating directly from photo are tagged <strong className="text-stone-700 font-semibold">[Photo]</strong></span>
        <span>Use <strong className="text-stone-700 font-semibold">Add Tone</strong> to discover grounded dominant, secondary, or accent tones</span>
      </div>
    </div>
  );
};
