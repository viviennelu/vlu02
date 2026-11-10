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
  // Exact hex from the HEX field / picker / original color. HSL is stored as
  // integers, so rebuilding RGB from it would drift by a unit or two.
  const [exactHex, setExactHex] = useState<string | null>(color?.hex ?? null);

  // Sync state whenever active color changes
  useEffect(() => {
    if (color) {
      setH(color.hsl.h);
      setS(color.hsl.s);
      setL(color.hsl.l);
      setHexInput(color.hex);
      setName(color.name);
      setExactHex(color.hex.toUpperCase());
    }
  }, [color]);

  if (!isOpen || !color) return null;

  // Compute live current RGB and HEX from HSL sliders
  const currentRgb = (exactHex && hexToRgb(exactHex)) || hslToRgb(h, s, l);
  const currentHex = rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b);
  const contrastOnWhite = getContrastRatio(currentHex, '#FFFFFF').toFixed(1);
  const contrastOnBlack = getContrastRatio(currentHex, '#1C1917').toFixed(1);
  const bestTextColor = getReadableTextColor(currentHex);

  const handleHslChange = (newH: number, newS: number, newL: number) => {
    setExactHex(null);
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
      setExactHex(rgbToHex(parsed.r, parsed.g, parsed.b));
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
      setExactHex(rgbToHex(parsed.r, parsed.g, parsed.b));
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      setH(hsl.h);
      setS(hsl.s);
      setL(hsl.l);
      setName(getColorName(val));
    }
  };

  const applySave = () => {
    const finalRgb = currentRgb;
    const finalHex = currentHex;
    onSave({
      ...color,
      hex: finalHex,
      rgb: finalRgb,
      hsl: { h, s, l },
      name: name.trim() || getColorName(finalHex),
    });
    onClose();
  };

  const nudge = 'btn-paper !px-2.5 !py-1 !text-[11px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A221B]/40 backdrop-blur-[3px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit tone"
        onClick={(e) => e.stopPropagation()}
        className="sheet !rounded-[20px] w-full max-w-md overflow-hidden shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        {/* Before / after: one swatch split in two */}
        <div className="m-2 rounded-[14px] overflow-hidden h-32 flex relative">
          <div className="w-1/4 h-full" style={{ backgroundColor: color.hex }} title={`Before: ${color.hex}`} />
          <div
            className="flex-1 h-full flex items-end justify-between p-4 transition-colors duration-150"
            style={{ backgroundColor: currentHex, color: bestTextColor }}
          >
            <span className="font-serif text-3xl">Aa</span>
            <span className="font-mono text-xs opacity-80">
              {contrastOnWhite}:1 on white · {contrastOnBlack}:1 on dark
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/15 hover:bg-black/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-3 pb-6 space-y-5">
          <input
            type="text"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full font-serif text-2xl text-ink bg-transparent outline-none border-b border-transparent focus:border-ink/20 pb-0.5"
          />

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={currentHex}
              onChange={handleNativePicker}
              aria-label="Color picker"
              className="w-10 h-10 rounded-full cursor-pointer p-0 bg-transparent block overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
            />
            <input
              type="text"
              aria-label="HEX"
              maxLength={7}
              value={hexInput}
              onChange={handleHexInputChange}
              className="debossed !rounded-full font-mono text-sm text-ink px-4 py-2 flex-1 uppercase outline-none focus:ring-1 focus:ring-ink/30"
            />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-soft">Hue</span>
                <span className="font-mono text-ink">{h}°</span>
              </div>
              <input
                type="range"
                aria-label="Hue"
                min="0"
                max="360"
                value={h}
                onChange={(e) => handleHslChange(Number(e.target.value), s, l)}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-soft">Saturation</span>
                <span className="font-mono text-ink">{s}%</span>
              </div>
              <input
                type="range"
                aria-label="Saturation"
                min="0"
                max="100"
                value={s}
                onChange={(e) => handleHslChange(h, Number(e.target.value), l)}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                style={{ background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))` }}
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-soft">Lightness</span>
                <span className="font-mono text-ink">{l}%</span>
              </div>
              <input
                type="range"
                aria-label="Lightness"
                min="5"
                max="95"
                value={l}
                onChange={(e) => handleHslChange(h, s, Number(e.target.value))}
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                style={{ background: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => handleHslChange(h, Math.min(100, s + 15), l)} className={nudge}>Richer</button>
            <button onClick={() => handleHslChange(h, Math.max(0, s - 15), l)} className={nudge}>Muted</button>
            <button onClick={() => handleHslChange((h + 20) % 360, s, l)} className={nudge}>Warmer</button>
            <button onClick={() => handleHslChange((h - 20 + 360) % 360, s, l)} className={nudge}>Cooler</button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-paper">Cancel</button>
            <button onClick={applySave} className="btn-ink">
              <Check className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
