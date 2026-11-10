import React from 'react';
import { Bookmark, Download, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'workspace' | 'previews' | 'collections';
  setActiveTab: (tab: 'workspace' | 'previews' | 'collections') => void;
  savedCount: number;
  onOpenExport: () => void;
  onSavePalette: () => void;
  colorCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenExport,
  onSavePalette,
  colorCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-[#E7E0D6]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand / Placeholder mark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('workspace')}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus-visible:outline-none"
          >
            <span className="w-5 h-5 rounded-sm bg-[#1C1917] text-[#FBF9F5] flex items-center justify-center text-xs font-mono font-medium shadow-sm group-hover:bg-stone-700 transition-colors">
              ◈
            </span>
            <span className="font-serif text-lg tracking-tight font-medium text-[#1C1917] whitespace-nowrap">
              Photo to Color Palette Studio
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium uppercase tracking-wider text-stone-600">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
              activeTab === 'workspace'
                ? 'border-[#1C1917] text-[#1C1917] font-semibold'
                : 'border-transparent hover:text-[#1C1917]'
            }`}
          >
            Studio Workspace
          </button>

          <button
            onClick={() => setActiveTab('previews')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 ${
              activeTab === 'previews'
                ? 'border-[#1C1917] text-[#1C1917] font-semibold'
                : 'border-transparent hover:text-[#1C1917]'
            }`}
          >
            Design Previews & Roles
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`transition-colors whitespace-nowrap py-1 cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'collections'
                ? 'border-[#1C1917] text-[#1C1917] font-semibold'
                : 'border-transparent hover:text-[#1C1917]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-600" />
            <span>Visual Journal</span>
            {savedCount > 0 && (
              <span className="font-mono text-[10px] bg-stone-200 text-stone-800 px-1.5 py-0.2 rounded font-semibold">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSavePalette}
            disabled={colorCount === 0}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 hover:text-stone-950 border border-stone-300 hover:border-stone-400 bg-white rounded transition-colors whitespace-nowrap disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Record this palette and photo to your visual journal"
          >
            <Bookmark className="w-3.5 h-3.5 text-stone-700" />
            <span>Record to Journal</span>
          </button>

          <button
            onClick={onOpenExport}
            disabled={colorCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#FBF9F5] bg-[#1C1917] hover:bg-stone-800 rounded transition-colors whitespace-nowrap disabled:opacity-40 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Palette</span>
          </button>
        </div>
      </div>
    </header>
  );
};
