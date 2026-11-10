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

  const FORMATS = [
    { id: 'css', label: 'CSS', content: cssContent },
    { id: 'tailwind', label: 'Tailwind', content: tailwindContent },
    { id: 'json', label: 'JSON', content: jsonContent },
    { id: 'hex', label: 'HEX', content: hexList },
  ] as const;
  const activeFormat = FORMATS.find((f) => f.id === activeTab) ?? FORMATS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A221B]/40 backdrop-blur-[3px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Export"
        onClick={(e) => e.stopPropagation()}
        className="sheet !rounded-[20px] w-full max-w-xl overflow-hidden shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="font-serif text-2xl font-medium text-ink">Export</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full text-ink-faint hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div className="space-y-2.5">
            <input
              type="text"
              aria-label="Palette title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full font-serif text-lg text-ink bg-transparent border-b border-ink/15 focus:border-ink/40 pb-1 outline-none"
            />
            <div className="h-3 w-full rounded-full flex overflow-hidden shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              {colors.map((c) => (
                <div key={c.id} style={{ backgroundColor: c.hex }} className="flex-1" title={c.hex} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div role="tablist" className="debossed rounded-full p-1 flex text-xs">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={activeTab === f.id}
                  onClick={() => setActiveTab(f.id)}
                  className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                    activeTab === f.id
                      ? 'bg-paper text-ink font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.15)]'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => handleCopy(activeFormat.content, activeFormat.label)} className="btn-paper">
              {copiedType ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-[12px] bg-ink text-paper text-xs font-mono overflow-x-auto max-h-56 leading-relaxed shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
            {activeFormat.content}
          </pre>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button onClick={handleDownloadPng} className="btn-paper">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Swatch card .png</span>
            </button>
            <button onClick={handleDownloadJson} className="btn-paper">
              <Download className="w-3.5 h-3.5" />
              <span>.json</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
