import React, { useState, useEffect } from 'react';
import { X, Check, Sliders, RefreshCw, Eye } from 'lucide-react';
import {
  ColorData,
  hslToRgb,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  getColorName,
  getReadableTextColor,
  getContrastRatio,
} from '../utils/colorUtils';

interface ColorEditorModalProps {
  color: ColorData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedColor: ColorData) => void;
}

export const ColorEditorModal: React.FC<ColorEditorModalProps> = ({
  color,
  isOpen,
  onClose,
  onSave,
}) => {
  const [h, setH] = useState(color?.hsl?.h ?? 0);
  const [s, setS] = useState(color?.hsl?.s ?? 0);
  const [l, setL] = useState(color?.hsl?.l ?? 0);
  const [hexInput, setHexInput] = useState(color?.hex ?? '#000000');
  const [name, setName] = useState(color?.name ?? '');

  // Sync state whenever active color changes
  useEffect(() => {
    if (color) {
      setH(color.hsl.h);
      setS(color.hsl.s);
      setL(color.hsl.l);
      setHexInput(color.hex);
      setName(color.name);
    }
  }, [color]);

  if (!isOpen || !color) return null;

  // Compute live current RGB and HEX from HSL sliders
  const currentRgb = hslToRgb(h, s, l);
  const currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
  const contrastOnWhite = getContrastRatio(currentHex, '#FFFFFF').toFixed(1);
  const contrastOnBlack = getContrastRatio(currentHex, '#1C1917').toFixed(1);
  const bestTextColor = getReadableTextColor(currentHex);

  const handleHslChange = (newH: number, newS: number, newL: number) => {
    setH(newH);
    setS(newS);
    setL(newL);
    const rgb = hslToRgb(newH, newS, newL);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    setName(getColorName(hex));
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      setH(hsl.h);
      setS(hsl.s);
      setL(hsl.l);
      setName(getColorName(val));
    }
  };

  const handleNativePicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    const parsed = hexToRgb(val);
    if (parsed) {
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      setH(hsl.h);
      setS(hsl.s);
      setL(hsl.l);
      setName(getColorName(val));
    }
  };

  const applySave = () => {
    const finalRgb = hslToRgb(h, s, l);
    const finalHex = rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
    onSave({
      ...color,
      hex: finalHex,
      rgb: finalRgb,
      hsl: { h, s, l },
      name: name.trim() || getColorName(finalHex),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] rounded-lg border border-stone-300 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] bg-white">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-stone-700" />
            <h3 className="font-serif text-lg font-medium text-stone-900">
              Refine Specimen Tone
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Visual Swatch Comparison: Original vs Current */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-stone-200 p-3 bg-white space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-mono text-stone-600 block">
                Original Extracted
              </span>
              <div
                className="h-16 rounded-xs border border-black/5"
                style={{ backgroundColor: color.hex }}
              />
              <p className="font-mono text-xs text-stone-700 font-semibold">{color.hex}</p>
              <p className="text-xs text-stone-500 font-sans truncate">{color.name}</p>
            </div>

            <div className="rounded border border-stone-300 p-3 bg-white space-y-2 shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-mono text-stone-600 block">
                Refined Preview
              </span>
              <div
                className="h-16 rounded-xs border border-black/5 flex items-center justify-center text-xs font-semibold transition-colors duration-150"
                style={{ backgroundColor: currentHex, color: bestTextColor }}
              >
                Sample Text Aa
              </div>
              <p className="font-mono text-xs text-stone-900 font-bold">{currentHex}</p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Descriptive tone name"
                className="text-xs text-stone-800 font-sans border-b border-stone-300 focus:border-stone-900 outline-none w-full pb-0.5 bg-transparent"
              />
            </div>
          </div>

          {/* Direct Controls: Native picker + HEX input */}
          <div className="flex items-center gap-3 bg-[#F5F1EB] p-3 rounded border border-[#E7E0D6]">
            <div className="relative">
              <input
                type="color"
                value={currentHex}
                onChange={handleNativePicker}
                className="w-10 h-10 rounded cursor-pointer border border-stone-300 p-0 bg-transparent block"
                title="System Color Eyedropper"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider font-mono text-stone-500 block mb-1">
                Hexadecimal Code
              </label>
              <input
                type="text"
                maxLength={7}
                value={hexInput}
                onChange={handleHexInputChange}
                className="font-mono font-bold text-sm text-stone-900 bg-white border border-stone-300 rounded px-2.5 py-1 w-full uppercase focus:border-stone-900 outline-none"
              />
            </div>
          </div>

          {/* HSL Sliders */}
          <div className="space-y-4">
            {/* Hue Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-stone-600">Hue (H)</span>
                <span className="text-stone-900 font-bold">{h}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={h}
                onChange={(e) => handleHslChange(Number(e.target.value), s, l)}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background:
                    'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
            </div>

            {/* Saturation Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-stone-600">Saturation (S)</span>
                <span className="text-stone-900 font-bold">{s}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={s}
                onChange={(e) => handleHslChange(h, Number(e.target.value), l)}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`,
                }}
              />
            </div>

            {/* Lightness Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-stone-600">Lightness (L)</span>
                <span className="text-stone-900 font-bold">{l}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={l}
                onChange={(e) => handleHslChange(h, s, Number(e.target.value))}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`,
                }}
              />
            </div>
          </div>

          {/* Quick Harmonic Nudges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-stone-500 mr-1">
              Harmonic Nudges:
            </span>
            <button
              onClick={() => handleHslChange(h, Math.min(100, s + 15), l)}
              className="text-[11px] px-2 py-0.5 rounded border border-stone-200 bg-white hover:border-stone-400 text-stone-700 cursor-pointer"
            >
              +15% Chroma
            </button>
            <button
              onClick={() => handleHslChange(h, Math.max(0, s - 15), l)}
              className="text-[11px] px-2 py-0.5 rounded border border-stone-200 bg-white hover:border-stone-400 text-stone-700 cursor-pointer"
            >
              -15% Mute
            </button>
            <button
              onClick={() => handleHslChange((h + 20) % 360, s, l)}
              className="text-[11px] px-2 py-0.5 rounded border border-stone-200 bg-white hover:border-stone-400 text-stone-700 cursor-pointer"
            >
              Warm +20°
            </button>
            <button
              onClick={() => handleHslChange((h - 20 + 360) % 360, s, l)}
              className="text-[11px] px-2 py-0.5 rounded border border-stone-200 bg-white hover:border-stone-400 text-stone-700 cursor-pointer"
            >
              Cool -20°
            </button>
          </div>

          {/* Accessibility & Contrast Info */}
          <div className="p-2.5 rounded bg-white border border-stone-200 flex items-center justify-between text-xs font-mono text-stone-600">
            <span>Contrast on White: <strong className="text-stone-900">{contrastOnWhite}:1</strong></span>
            <span>Contrast on Dark: <strong className="text-stone-900">{contrastOnBlack}:1</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-[#E7E0D6] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={applySave}
            className="px-5 py-2 text-xs font-semibold bg-[#1C1917] hover:bg-stone-800 text-white rounded transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
