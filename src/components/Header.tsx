import React from 'react';
import { Bookmark, Download } from 'lucide-react';

type Tab = 'workspace' | 'previews' | 'collections';

interface HeaderProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  savedCount: number;
  onOpenExport: () => void;
  onSavePalette: () => void;
  colorCount: number;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'workspace', label: 'Studio' },
  { id: 'previews', label: 'Previews' },
  { id: 'collections', label: 'Journal' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenExport,
  onSavePalette,
  colorCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md shadow-[0_1px_0_rgba(74,58,40,0.08),0_2px_0_rgba(255,255,255,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('workspace')}
          className="flex items-center gap-2.5 text-left cursor-pointer shrink-0"
        >
          <span
            aria-hidden
            className="w-6 h-6 rounded-full bg-[conic-gradient(from_200deg,#B4532A,#C9A227,#5F7F52,#3E6A86,#7A5C8E,#B4532A)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.15)]"
          />
          <span className="hidden sm:inline font-serif text-xl tracking-tight font-medium text-ink whitespace-nowrap">
            Palette Studio
          </span>
        </button>

        <nav className="debossed flex items-center p-1 rounded-full text-xs font-medium">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`px-2.5 sm:px-4 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-paper text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.15)]'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {tab.label}
                {tab.id === 'collections' && savedCount > 0 && (
                  <span className="font-mono text-[10px] text-ink-faint">{savedCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onSavePalette}
            disabled={colorCount === 0}
            className="btn-paper"
            title="Save to Journal"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button onClick={onOpenExport} disabled={colorCount === 0} className="btn-ink" title="Export">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
