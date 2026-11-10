import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, FileCode, FileText, Image as ImageIcon } from 'lucide-react';
import { ColorData } from '../utils/colorUtils';
import {
  generateCssVariables,
  generateTailwindConfig,
  generateJsonExport,
  downloadPngSwatchCard,
} from '../utils/exportFormats';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ColorData[];
  paletteTitle: string;
  imageSrc: string | null;
  onCopyText: (text: string, label: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  colors,
  paletteTitle,
  imageSrc,
  onCopyText,
}) => {
  const [activeTab, setActiveTab] = useState<'css' | 'tailwind' | 'json' | 'hex'>('css');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [title, setTitle] = useState(paletteTitle || 'Color Study');

  useEffect(() => {
    if (paletteTitle) {
      setTitle(paletteTitle);
    }
  }, [paletteTitle]);

  if (!isOpen) return null;

  const cssContent = generateCssVariables(colors, title);
  const tailwindContent = generateTailwindConfig(colors, title);
  const jsonContent = generateJsonExport(colors, title);
  const hexList = colors.map((c) => c.hex).join(', ');

  const handleCopy = (content: string, type: string) => {
    onCopyText(content, `Copied ${type.toUpperCase()}`);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1800);
  };

  const handleDownloadPng = async () => {
    await downloadPngSwatchCard(colors, title, imageSrc || undefined);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-palette.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] rounded-lg border border-stone-300 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] bg-white">
          <div>
            <h3 className="font-serif text-xl font-medium text-stone-900">
              Export Color Palette
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Production assets, CSS variables, and swatch graphics
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Palette Title Input & Swatch Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-600">
                Palette Title
              </label>
              <span className="text-xs text-stone-400 font-mono">{colors.length} Tones</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Autumn Architecture Study"
              className="w-full px-3 py-1.5 text-sm bg-white border border-stone-300 rounded font-serif text-stone-900 focus:border-stone-900 outline-none"
            />
            {/* Swatch visual strip */}
            <div className="h-6 w-full rounded flex overflow-hidden border border-black/10">
              {colors.map((c) => (
                <div key={c.id} style={{ backgroundColor: c.hex }} className="flex-1" title={c.hex} />
              ))}
            </div>
          </div>

          {/* Export Format Tabs */}
          <div className="border-b border-[#E7E0D6] flex items-center gap-4 text-xs font-mono uppercase">
            <button
              onClick={() => setActiveTab('css')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'css'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              CSS Variables
            </button>
            <button
              onClick={() => setActiveTab('tailwind')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'tailwind'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              Tailwind CSS
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'json'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              JSON Data
            </button>
            <button
              onClick={() => setActiveTab('hex')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 ${
                activeTab === 'hex'
                  ? 'border-stone-900 text-stone-900 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              HEX Values
            </button>
          </div>

          {/* Code Viewer Container */}
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => {
                  if (activeTab === 'css') handleCopy(cssContent, 'CSS');
                  if (activeTab === 'tailwind') handleCopy(tailwindContent, 'Tailwind');
                  if (activeTab === 'json') handleCopy(jsonContent, 'JSON');
                  if (activeTab === 'hex') handleCopy(hexList, 'HEX List');
                }}
                className="px-2.5 py-1 text-xs bg-white/90 hover:bg-white text-stone-800 rounded border border-stone-300 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedType ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded bg-[#1C1917] text-[#FBF9F5] text-xs font-mono overflow-x-auto max-h-56 leading-relaxed border border-stone-800">
              {activeTab === 'css' && cssContent}
              {activeTab === 'tailwind' && tailwindContent}
              {activeTab === 'json' && jsonContent}
              {activeTab === 'hex' && hexList}
            </pre>
          </div>

          {/* Quick File Downloads */}
          <div className="pt-2 border-t border-[#E7E0D6] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-mono uppercase text-stone-500">
              Visual Downloads:
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPng}
                className="px-3.5 py-2 text-xs font-medium rounded border border-stone-300 bg-white hover:border-stone-400 text-stone-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Download PNG Swatch Card</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="px-3.5 py-2 text-xs font-medium rounded border border-stone-300 bg-white hover:border-stone-400 text-stone-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .json</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-100 border-t border-[#E7E0D6] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
