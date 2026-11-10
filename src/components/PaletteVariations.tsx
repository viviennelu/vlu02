import React from 'react';
import { PaletteVariationType, ColorData } from '../utils/colorUtils';
import { VARIATION_META, generateVariation } from '../utils/paletteVariations';

interface PaletteVariationsProps {
  baseColors: ColorData[];
  currentVariation: PaletteVariationType;
  onSelectVariation: (variation: PaletteVariationType) => void;
  onResetAdjustments: () => void;
}

const VARIATIONS: PaletteVariationType[] = ['original', 'soft', 'vibrant', 'atmospheric', 'warm', 'cool'];

export const PaletteVariations: React.FC<PaletteVariationsProps> = ({
  baseColors,
  currentVariation,
  onSelectVariation,
}) => {
  return (
    <div role="radiogroup" aria-label="Interpretation" className="debossed p-1.5 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      {VARIATIONS.map((varKey) => {
        const meta = VARIATION_META[varKey];
        const isSelected = currentVariation === varKey;
        const previewColors = generateVariation(baseColors, varKey);

        return (
          <button
            key={varKey}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectVariation(varKey)}
            title={meta.description}
            className={`text-left px-2.5 pt-2 pb-2.5 rounded-[9px] transition-all cursor-pointer ${
              isSelected
                ? 'bg-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.16)]'
                : 'hover:bg-paper/50'
            }`}
          >
            <span className={`block text-xs mb-1.5 ${isSelected ? 'text-ink font-semibold' : 'text-ink-soft'}`}>
              {meta.label}
            </span>
            <span className="h-2.5 w-full rounded-full overflow-hidden flex shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              {previewColors.map((c, i) => (
                <span key={c.id || i} className="h-full flex-1" style={{ backgroundColor: c.hex }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
};
