import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Copy,
  Check,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Shuffle,
  LayoutGrid,
  Columns,
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

  // Only call out tones that didn't come straight from extraction
  const getOriginLabel = (color: ColorData): string | null => {
    if (color.userAdded) return 'Added';
    switch (color.origin) {
      case 'interpolated':
        return 'Bridge';
      case 'curated-accent':
        return 'Accent';
      case 'custom':
        return 'Edited';
      default:
        return null;
    }
  };

  const iconBtn =
    'p-2 rounded-full text-ink-soft hover:text-ink hover:bg-black/[0.04] transition-colors cursor-pointer';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">{colors.length} tones</p>

        <div className="flex items-center gap-1">
          <div className="debossed rounded-full p-0.5 flex text-xs mr-1">
            {(
              [
                { id: 'proportional', icon: Columns, label: 'Proportional' },
                { id: 'editorial', icon: LayoutGrid, label: 'Large swatches' },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setLayoutMode(id)}
                title={label}
                aria-label={label}
                aria-pressed={layoutMode === id}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  layoutMode === id
                    ? 'bg-paper text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(74,58,40,0.18)]'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <button onClick={shuffleUnlocked} className={iconBtn} title="Shuffle unlocked tones" aria-label="Shuffle unlocked tones">
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button onClick={onResetOriginal} className={iconBtn} title="Reset to original colors" aria-label="Reset to original colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onOpenAddTone} disabled={colors.length >= 10} className="btn-ink ml-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Add tone</span>
          </button>
        </div>
      </div>

      {layoutMode === 'proportional' && (
        <div className="space-y-4">
          {/* Proportional ribbon, pressed into the page */}
          <div className="debossed p-1.5 rounded-[16px]">
            <div className="h-36 sm:h-48 w-full rounded-[11px] overflow-hidden flex">
              {colors.map((color) => {
                const textColor = getReadableTextColor(color.hex);
                return (
                  <div
                    key={color.id}
                    style={{ backgroundColor: color.hex, flex: `${Math.max(0.08, color.weight)} 0 0%` }}
                    onClick={() => onEditColor(color)}
                    className="relative group cursor-pointer overflow-hidden p-3 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between" style={{ color: textColor }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(color.id);
                        }}
                        className="p-1 -m-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                        title={color.locked ? 'Unlock' : 'Lock'}
                        aria-label={color.locked ? 'Unlock' : 'Lock'}
                      >
                        {color.locked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                        )}
                      </button>
                      <span className="font-mono text-[10px] opacity-0 group-hover:opacity-80 transition-opacity">
                        {Math.round(color.weight * 100)}%
                      </span>
                    </div>
                    <div style={{ color: textColor }} className="min-w-0">
                      <p className="font-mono text-xs tracking-wide truncate">{color.hex}</p>
                      <p className="text-[11px] opacity-75 truncate">{color.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Swatch details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {colors.map((color, index) => {
              const origin = getOriginLabel(color);
              return (
                <div key={color.id} className="sheet !rounded-[12px] p-2 flex flex-col group">
                  <button
                    onClick={() => onEditColor(color)}
                    title="Edit"
                    className="h-16 rounded-[8px] mb-2.5 cursor-pointer relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                    style={{ backgroundColor: color.hex }}
                  >
                    {color.locked && (
                      <Lock className="w-3 h-3 absolute top-1.5 right-1.5" style={{ color: getReadableTextColor(color.hex) }} />
                    )}
                  </button>

                  <div className="px-1 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs text-ink">{color.hex}</span>
                      <button
                        onClick={() => handleCopyHex(color)}
                        className="text-ink-faint hover:text-ink transition-colors cursor-pointer"
                        title="Copy HEX"
                        aria-label="Copy HEX"
                      >
                        {copiedId === color.id ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-soft truncate">{color.name}</p>
                    <p className="font-mono text-[10px] text-ink-faint mt-1.5 leading-relaxed">
                      {color.rgb.r} {color.rgb.g} {color.rgb.b}
                      {origin && <span className="ml-1.5 text-ink-soft">· {origin}</span>}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-ink-faint opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <div className="flex items-center">
                      <button
                        onClick={() => moveColor(index, 'left')}
                        disabled={index === 0}
                        className="p-1 hover:text-ink disabled:opacity-20 cursor-pointer"
                        aria-label="Move left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveColor(index, 'right')}
                        disabled={index === colors.length - 1}
                        className="p-1 hover:text-ink disabled:opacity-20 cursor-pointer"
                        aria-label="Move right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleLock(color.id)}
                        className="p-1 hover:text-ink cursor-pointer"
                        aria-label={color.locked ? 'Unlock' : 'Lock'}
                        title={color.locked ? 'Unlock' : 'Lock'}
                      >
                        {color.locked ? <Lock className="w-3 h-3 text-ink" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button onClick={() => onEditColor(color)} className="p-1 hover:text-ink cursor-pointer" aria-label="Edit" title="Edit">
                        <Pencil className="w-3 h-3" />
                      </button>
                      {colors.length > 3 && (
                        <button
                          onClick={() => removeColor(color.id)}
                          className="p-1 hover:text-red-700 cursor-pointer"
                          aria-label="Remove"
                          title="Remove"
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

      {layoutMode === 'editorial' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {colors.map((color, index) => {
            const textColor = getReadableTextColor(color.hex);
            const origin = getOriginLabel(color);
            return (
              <div key={color.id} className="sheet overflow-hidden flex flex-col group">
                <div
                  onClick={() => onEditColor(color)}
                  className="h-40 m-1.5 mb-0 rounded-[10px] p-4 flex flex-col justify-between cursor-pointer"
                  style={{ backgroundColor: color.hex, color: textColor }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest opacity-80">
                      № {String(index + 1).padStart(2, '0')}
                      {origin && ` · ${origin}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(color.id);
                      }}
                      className="p-1 -m-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                      aria-label={color.locked ? 'Unlock' : 'Lock'}
                    >
                      {color.locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                      )}
                    </button>
                  </div>
                  <span className="font-serif text-2xl font-medium tracking-tight">{color.name}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="font-mono text-[11px] text-ink-soft">
                    <div className="text-ink">{color.hex}</div>
                    <div className="text-ink-faint">
                      {color.rgb.r} {color.rgb.g} {color.rgb.b} · {Math.round(color.weight * 100)}%
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => handleCopyHex(color)} className={iconBtn} aria-label="Copy HEX" title="Copy HEX">
                      {copiedId === color.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => onEditColor(color)} className={iconBtn} aria-label="Edit" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
