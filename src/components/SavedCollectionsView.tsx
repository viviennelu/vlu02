import React, { useState } from 'react';
import { SavedPalette, ColorData } from '../utils/colorUtils';
import {
  Bookmark,
  Trash2,
  ArrowUpRight,
  Copy,
  Check,
  Calendar,
  MapPin,
  FileText,
  Download,
  Edit3,
  Plus,
  BookOpen,
  Camera,
} from 'lucide-react';
import { VARIATION_META } from '../utils/paletteVariations';
import { downloadVisualJournalCard } from '../utils/exportFormats';

interface SavedCollectionsViewProps {
  savedPalettes: SavedPalette[];
  onLoadPalette: (palette: SavedPalette) => void;
  onUpdatePalette: (palette: SavedPalette) => void;
  onDeletePalette: (id: string) => void;
  onCopyText: (text: string, label: string) => void;
  onSwitchToWorkspace: () => void;
  onSaveCurrentToJournal: () => void;
}

export const SavedCollectionsView: React.FC<SavedCollectionsViewProps> = ({
  savedPalettes,
  onLoadPalette,
  onUpdatePalette,
  onDeletePalette,
  onCopyText,
  onSwitchToWorkspace,
  onSaveCurrentToJournal,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLayout, setEditLayout] = useState<'monograph' | 'polaroid' | 'field-notes'>('monograph');

  const startEditing = (p: SavedPalette) => {
    setEditingCardId(p.id);
    setEditTitle(p.title);
    setEditLocation(p.location || '');
    setEditNotes(p.notes || '');
    setEditLayout(p.journalLayout || 'monograph');
  };

  const saveEditing = (p: SavedPalette) => {
    onUpdatePalette({
      ...p,
      title: editTitle.trim() || p.title,
      location: editLocation.trim(),
      notes: editNotes.trim(),
      journalLayout: editLayout,
    });
    setEditingCardId(null);
  };

  const handleCopyHexList = (palette: SavedPalette) => {
    const list = palette.colors.map((c) => c.hex).join(', ');
    onCopyText(list, `Copied ${palette.colors.length} HEX values`);
    setCopiedId(palette.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadCard = async (palette: SavedPalette) => {
    await downloadVisualJournalCard(palette, palette.imageThumbnail);
    onCopyText(palette.title, `Downloaded Journal Card for "${palette.title}"`);
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E7E0D6] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono text-stone-500 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-stone-700" />
            <span>Personal Visual Journal</span>
            <span>·</span>
            <span>Chromatic Memory Cards</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-stone-900 tracking-tight">
            Memories in Natural Pigment
          </h2>
          <p className="text-xs text-stone-600 font-sans mt-1 max-w-xl">
            A curated record of moments, places, and atmospheres documented through their authentic light frequencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onSaveCurrentToJournal}
            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Current Studio Study</span>
          </button>

          <button
            onClick={onSwitchToWorkspace}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded hover:border-stone-500 transition-colors cursor-pointer"
          >
            Studio Workspace
          </button>
        </div>
      </div>

      {/* Empty State */}
      {savedPalettes.length === 0 ? (
        <div className="border border-dashed border-stone-300 bg-white/70 rounded-lg p-16 text-center max-w-xl mx-auto my-12">
          <Bookmark className="w-8 h-8 text-stone-400 mx-auto mb-4 stroke-[1.5]" />
          <h3 className="font-serif text-2xl text-stone-800 font-medium mb-2">
            Your visual memory journal is empty
          </h3>
          <p className="text-sm text-stone-600 mb-6 font-sans leading-relaxed">
            Extract colors from a personal photograph, calibrate its mood, and record it as a customizable visual memory card with your reflections and place notes.
          </p>
          <button
            onClick={onSwitchToWorkspace}
            className="px-5 py-2.5 bg-stone-900 text-white rounded text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Create Your First Memory Card
          </button>
        </div>
      ) : (
        /* Grid of Memory Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {savedPalettes.map((palette) => {
            const dateStr = new Date(palette.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const varLabel = VARIATION_META[palette.variation]?.label || palette.variation;
            const isEditing = editingCardId === palette.id;

            return (
              <div
                key={palette.id}
                className="border border-[#E7E0D6] bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Visual Memory Card Canvas */}
                <div className="p-6 md:p-7 space-y-6 bg-[#FBF9F5]">
                  {/* Card Header: Title & Context */}
                  {isEditing ? (
                    <div className="space-y-3 bg-white p-4 rounded border border-stone-300">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-stone-500 block mb-1">
                          Memory Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-base font-serif font-bold text-stone-900 border-b border-stone-300 pb-1 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-mono text-stone-500 block mb-1">
                            Location / Place
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Kyoto, Japan"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            className="w-full text-xs font-sans text-stone-800 border-b border-stone-300 pb-1 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-mono text-stone-500 block mb-1">
                            Card Style
                          </label>
                          <select
                            value={editLayout}
                            onChange={(e) => setEditLayout(e.target.value as any)}
                            className="w-full text-xs font-mono text-stone-800 border-b border-stone-300 pb-1 outline-none bg-transparent cursor-pointer"
                          >
                            <option value="monograph">Monograph</option>
                            <option value="polaroid">Scrapbook Card</option>
                            <option value="field-notes">Field Specimen</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono text-stone-500 block mb-1">
                          Personal Reflection / Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Reflect on the atmosphere, season, or light..."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full text-xs font-serif italic text-stone-800 border border-stone-200 rounded p-2 outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setEditingCardId(null)}
                          className="px-3 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditing(palette)}
                          className="px-3 py-1 bg-stone-900 text-white text-xs font-semibold rounded cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4 border-b border-[#E7E0D6] pb-4">
                      <div>
                        <h3 className="font-serif text-2xl font-semibold text-stone-900 tracking-tight">
                          {palette.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-stone-500 font-mono mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {dateStr}
                          </span>
                          {palette.location && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1 text-stone-700">
                                <MapPin className="w-3 h-3 text-stone-500" />
                                {palette.location}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span className="text-stone-600">{varLabel}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => startEditing(palette)}
                        className="p-1.5 text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
                        title="Edit title and memory notes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Photo & Palette Composition */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    {/* Source Photo Frame */}
                    {palette.imageThumbnail && (
                      <div className="sm:col-span-5 rounded overflow-hidden border border-[#E7E0D6] shadow-2xs bg-stone-100 aspect-4/3">
                        <img
                          src={palette.imageThumbnail}
                          alt={palette.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Prominent Swatches Deck */}
                    <div className={palette.imageThumbnail ? 'sm:col-span-7 space-y-2' : 'sm:col-span-12 space-y-2'}>
                      {/* Ribbon */}
                      <div className="h-14 w-full rounded flex overflow-hidden border border-black/10 shadow-2xs">
                        {palette.colors.map((c, i) => (
                          <div
                            key={c.id || i}
                            style={{
                              backgroundColor: c.hex,
                              flex: `${Math.max(0.1, c.weight)} 0 0%`,
                            }}
                            className="h-full relative group transition-all"
                            title={`${c.name}: ${c.hex}`}
                          />
                        ))}
                      </div>

                      {/* Swatch Details */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {palette.colors.slice(0, 6).map((c) => (
                          <div
                            key={c.id}
                            className="p-1.5 rounded bg-white border border-[#E7E0D6] text-[10px] font-mono"
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="font-bold text-stone-900 truncate">{c.hex}</span>
                            </div>
                            <p className="text-[10px] text-stone-500 font-sans truncate">{c.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Personal Reflection Note */}
                  {palette.notes && !isEditing && (
                    <div className="p-3.5 rounded bg-[#F5F1EB] border border-[#E7E0D6] text-xs font-serif italic text-stone-800 leading-relaxed">
                      "{palette.notes}"
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-6 py-3 bg-white border-t border-[#E7E0D6] flex items-center justify-between text-xs font-mono text-stone-500">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopyHexList(palette)}
                      className="hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy all HEX codes"
                    >
                      {copiedId === palette.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === palette.id ? 'Copied' : 'Copy HEX'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadCard(palette)}
                      className="hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Download high-res PNG visual memory card"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Card</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onDeletePalette(palette.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Delete memory card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onLoadPalette(palette)}
                      className="px-3 py-1 bg-stone-900 text-white rounded text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <span>Open in Studio</span>
                      <ArrowUpRight className="w-3 h-3" />
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
