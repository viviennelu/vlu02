import React, { useState } from 'react';
import { PaletteVariationType, ColorData } from '../utils/colorUtils';
import { VARIATION_META, generateVariation } from '../utils/paletteVariations';
import { Sparkles, RotateCcw, Palette, Compass, Check, ArrowLeft } from 'lucide-react';

interface PaletteVariationsProps {
  baseColors: ColorData[];
  currentVariation: PaletteVariationType;
  onSelectVariation: (variation: PaletteVariationType) => void;
  onResetAdjustments: () => void;
}

const EXPLORATION_VARIATIONS: PaletteVariationType[] = [
  'soft',
  'vibrant',
  'atmospheric',
  'warm',
  'cool',
];

export const PaletteVariations: React.FC<PaletteVariationsProps> = ({
  baseColors,
  currentVariation,
  onSelectVariation,
  onResetAdjustments,
}) => {
  const isOriginal = currentVariation === 'original';
  const originalPreview = generateVariation(baseColors, 'original');

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E0D6] pb-2.5">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-stone-900" />
          <h3 className="font-serif text-lg font-medium text-stone-900 tracking-tight">
            Palette Progression & Interpretations
          </h3>
        </div>

        <div className="text-xs font-mono text-stone-500">
          <span>Step 1: Ground Truth · Step 2: Optional Artistic Explorations</span>
        </div>
      </div>

      {/* Main Hierarchy Container: Original Primary + Optional Explorations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* 1. PRIMARY EXPERIENCE: Original Ground Truth */}
        <div className="lg:col-span-5 flex flex-col">
          <button
            onClick={() => onSelectVariation('original')}
            className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer flex-1 flex flex-col justify-between shadow-xs ${
              isOriginal
                ? 'border-stone-900 bg-white ring-2 ring-stone-900/10 shadow-sm'
                : 'border-stone-300 bg-white/70 hover:border-stone-500 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                  Primary Baseline
                </span>
                {isOriginal ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-stone-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Focus</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-stone-400 hover:text-stone-800 underline">
                    Switch to Original
                  </span>
                )}
              </div>

              <h4 className="font-serif text-base font-bold text-stone-900 tracking-tight mt-1">
                Original Photographic Spectrum
              </h4>
              <p className="text-xs text-stone-600 font-sans mt-0.5 leading-relaxed">
                Faithful frequencies sampled directly from the photograph's natural light. The primary starting point of your study.
              </p>
            </div>

            {/* Continuous Natural Swatch Ribbon */}
            <div className="mt-4 pt-3 border-t border-stone-100">
              <div className="text-[10px] font-mono text-stone-500 mb-1 flex justify-between">
                <span>Extracted Spectrum</span>
                <span>{originalPreview.length} tones</span>
              </div>
              <div className="h-6 w-full rounded overflow-hidden flex border border-stone-300 shadow-2xs">
                {originalPreview.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="h-full flex-1 transition-colors duration-200"
                    style={{ backgroundColor: c.hex }}
                    title={`Original: ${c.name} (${c.hex})`}
                  />
                ))}
              </div>
            </div>
          </button>
        </div>

        {/* 2. SECONDARY: Optional Creative Explorations */}
        <div className="lg:col-span-7 flex flex-col bg-[#F7F4EE] rounded-lg p-3.5 border border-[#E7E0D6] justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-stone-600" />
                <span className="text-xs font-serif font-semibold text-stone-900">
                  Optional Artistic Interpretations
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-500">
                Secondary mood explorations
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-sans leading-snug mb-3">
              Optional photographic grading directions derived from the same photograph. Explore different chromatic atmospheres without losing connection to the original light.
            </p>
          </div>

          {/* Compact 5-Option Exploration Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {EXPLORATION_VARIATIONS.map((varKey) => {
              const meta = VARIATION_META[varKey];
              const isSelected = currentVariation === varKey;
              const previewColors = generateVariation(baseColors, varKey);

              return (
                <button
                  key={varKey}
                  onClick={() => onSelectVariation(varKey)}
                  className={`text-left p-2 rounded border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900 shadow-xs'
                      : 'border-stone-200 bg-white/60 hover:border-stone-400 hover:bg-white'
                  }`}
                >
                  <div className="mb-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-medium tracking-tight truncate block ${
                          isSelected ? 'text-stone-950 font-bold' : 'text-stone-700'
                        }`}
                      >
                        {meta.label}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-900 shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-stone-500 line-clamp-1 mt-0.5">
                      {meta.description}
                    </span>
                  </div>

                  {/* Micro color strip */}
                  <div className="h-3.5 w-full rounded-xs overflow-hidden flex border border-black/10 mt-auto">
                    {previewColors.map((c, i) => (
                      <div
                        key={c.id || i}
                        className="h-full flex-1"
                        style={{ backgroundColor: c.hex }}
                        title={`${meta.label}: ${c.name} (${c.hex})`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Mode Status Notification */}
      {!isOriginal && (
        <div className="text-xs bg-[#EDE7DF] text-stone-800 px-4 py-2.5 rounded-md flex flex-wrap items-center justify-between gap-2 border border-stone-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-300">
              Active Exploration
            </span>
            <span className="font-serif font-bold text-stone-950">
              {VARIATION_META[currentVariation].label}
            </span>
            <span className="text-stone-400 hidden sm:inline">·</span>
            <span className="text-stone-600 hidden sm:inline">
              {VARIATION_META[currentVariation].note}
            </span>
          </div>

          <button
            onClick={() => onSelectVariation('original')}
            className="text-xs font-semibold text-stone-900 hover:text-stone-950 bg-white hover:bg-stone-50 px-3 py-1 rounded border border-stone-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Original Palette</span>
          </button>
        </div>
      )}
    </div>
  );
};
