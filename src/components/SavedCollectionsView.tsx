import React, { useState } from 'react';
import { SavedPalette, ColorData, getReadableTextColor } from '../utils/colorUtils';
import { Trash2, ArrowUpRight, Copy, Check, MapPin, Download, Pencil, Plus } from 'lucide-react';
import { VARIATION_META } from '../utils/paletteVariations';
import { downloadVisualJournalCard } from '../utils/exportFormats';

type JournalLayout = NonNullable<SavedPalette['journalLayout']>;

const LAYOUTS: { id: JournalLayout; label: string }[] = [
  { id: 'monograph', label: 'Monograph' },
  { id: 'polaroid', label: 'Scrapbook' },
  { id: 'field-notes', label: 'Specimen' },
];

interface SavedCollectionsViewProps {
  savedPalettes: SavedPalette[];
  onLoadPalette: (palette: SavedPalette) => void;
  onUpdatePalette: (palette: SavedPalette) => void;
  onDeletePalette: (id: string) => void;
  onCopyText: (text: string, label: string) => void;
  onSwitchToWorkspace: () => void;
  onSaveCurrentToJournal: () => void;
  canSaveCurrent?: boolean;
}

interface CardContentProps {
  palette: SavedPalette;
  dateStr: string;
  varLabel: string;
}

/* ---------- Layout 1: Monograph — editorial, photo-led ---------- */
const MonographCard: React.FC<CardContentProps> = ({ palette, dateStr, varLabel }) => (
  <div className="p-5 sm:p-6 space-y-5">
    {palette.imageThumbnail && (
      <div className="rounded-[6px] overflow-hidden aspect-[3/2] bg-paper-deep shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
        <img src={palette.imageThumbnail} alt="" className="w-full h-full object-cover" />
      </div>
    )}
    <div className="h-3 rounded-full overflow-hidden flex shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
      {palette.colors.map((c) => (
        <div key={c.id} style={{ backgroundColor: c.hex, flex: `${Math.max(0.1, c.weight)} 0 0%` }} />
      ))}
    </div>
    <div>
      <h3 className="font-serif text-3xl font-medium text-ink tracking-tight leading-tight">{palette.title}</h3>
      <p className="eyebrow mt-1.5 flex flex-wrap items-center gap-x-2">
        <span>{dateStr}</span>
        {palette.location && (
          <span className="flex items-center gap-1">
            · <MapPin className="w-3 h-3" /> {palette.location}
          </span>
        )}
        <span>· {varLabel}</span>
      </p>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {palette.colors.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5 text-[11px] font-mono text-ink-soft">
          <span className="w-3 h-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: c.hex }} />
          {c.hex}
        </div>
      ))}
    </div>
    {palette.notes && (
      <p className="font-serif italic text-lg text-ink-soft leading-snug border-l border-ink/15 pl-3">{palette.notes}</p>
    )}
  </div>
);

/* ---------- Layout 2: Scrapbook — taped print and sticker dots ---------- */
const ScrapbookCard: React.FC<CardContentProps> = ({ palette, dateStr }) => (
  <div className="p-6 sm:p-8 bg-[#E9DFCF] bg-[image:var(--paper-grain)] min-h-[360px] relative overflow-hidden">
    <div className="relative mx-auto max-w-[300px] -rotate-[1.5deg]">
      {/* tape */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#F4EDE0]/80 rotate-[2deg] shadow-[0_1px_1px_rgba(0,0,0,0.06)] z-10" />
      <div className="bg-[#FDFBF7] p-3 pb-14 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_14px_28px_-14px_rgba(60,40,20,0.45)] relative">
        {palette.imageThumbnail ? (
          <img src={palette.imageThumbnail} alt="" className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square flex">
            {palette.colors.map((c) => (
              <div key={c.id} className="flex-1" style={{ backgroundColor: c.hex }} />
            ))}
          </div>
        )}
        <p className="absolute bottom-3 left-4 right-4 font-serif italic text-xl text-ink truncate">{palette.title}</p>
      </div>
    </div>
    <div className="flex flex-wrap justify-center gap-1.5 mt-6 max-w-[320px] mx-auto">
      {palette.colors.map((c, i) => (
        <div
          key={c.id}
          title={`${c.name} ${c.hex}`}
          className="w-9 h-9 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_1px_2px_rgba(0,0,0,0.2)] border-2 border-[#FDFBF7]"
          style={{ backgroundColor: c.hex, transform: `rotate(${((i * 37) % 11) - 5}deg) translateY(${(i % 3) - 1}px)` }}
        />
      ))}
    </div>
    <p className="text-center font-serif italic text-sm text-ink-soft mt-4">
      {palette.location ? `${palette.location}, ` : ''}
      {dateStr}
    </p>
    {palette.notes && (
      <p className="text-center font-serif italic text-base text-ink mt-2 max-w-[320px] mx-auto leading-snug">“{palette.notes}”</p>
    )}
  </div>
);

/* ---------- Layout 3: Specimen — paint chips on graph paper ---------- */
const SpecimenCard: React.FC<CardContentProps> = ({ palette, dateStr, varLabel }) => (
  <div
    className="p-5 sm:p-6 space-y-5 bg-[#F6F4EE]"
    style={{
      backgroundImage:
        'linear-gradient(rgba(62,106,134,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(62,106,134,0.07) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    }}
  >
    <div className="flex items-start gap-4">
      {palette.imageThumbnail && (
        <img
          src={palette.imageThumbnail}
          alt=""
          className="w-20 h-20 object-cover rounded-[2px] shadow-[0_0_0_4px_#fff,0_1px_4px_4px_rgba(0,0,0,0.06)] shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-mono text-sm font-medium uppercase tracking-wider text-ink truncate">{palette.title}</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[10px] text-ink-soft">
          <dt className="text-ink-faint">DATE</dt>
          <dd>{dateStr}</dd>
          {palette.location && (
            <>
              <dt className="text-ink-faint">PLACE</dt>
              <dd className="truncate">{palette.location}</dd>
            </>
          )}
          <dt className="text-ink-faint">MODE</dt>
          <dd>{varLabel}</dd>
          <dt className="text-ink-faint">TONES</dt>
          <dd>{palette.colors.length}</dd>
        </dl>
      </div>
    </div>
    <div className="grid grid-cols-5 gap-2">
      {palette.colors.map((c, i) => (
        <div key={c.id} className="bg-white p-1 pb-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <div
            className="aspect-[3/4] flex items-start justify-end p-1 font-mono text-[9px]"
            style={{ backgroundColor: c.hex, color: getReadableTextColor(c.hex) }}
          >
            {String(i + 1).padStart(2, '0')}
          </div>
          <p className="font-mono text-[9px] text-ink mt-1 truncate">{c.hex}</p>
          <p className="text-[9px] text-ink-faint truncate">{c.name}</p>
        </div>
      ))}
    </div>
    {palette.notes && <p className="font-mono text-[11px] text-ink-soft leading-relaxed">Note: {palette.notes}</p>}
  </div>
);

const CARD_BY_LAYOUT: Record<JournalLayout, React.FC<CardContentProps>> = {
  monograph: MonographCard,
  polaroid: ScrapbookCard,
  'field-notes': SpecimenCard,
};

export const SavedCollectionsView: React.FC<SavedCollectionsViewProps> = ({
  savedPalettes,
  onLoadPalette,
  onUpdatePalette,
  onDeletePalette,
  onCopyText,
  onSwitchToWorkspace,
  onSaveCurrentToJournal,
  canSaveCurrent = true,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLayout, setEditLayout] = useState<JournalLayout>('monograph');

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
    const list = palette.colors.map((c: ColorData) => c.hex).join(', ');
    onCopyText(list, `Copied ${palette.colors.length} HEX values`);
    setCopiedId(palette.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadCard = async (palette: SavedPalette) => {
    await downloadVisualJournalCard(palette, palette.imageThumbnail);
    onCopyText(palette.title, 'Card downloaded');
  };

  const inputClass =
    'w-full bg-transparent text-sm text-ink border-b border-ink/15 focus:border-ink/50 pb-1 outline-none transition-colors';

  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between gap-4">
        <h2 className="letterpress font-serif text-4xl sm:text-5xl font-medium text-ink tracking-tight">Journal</h2>
        <button onClick={onSaveCurrentToJournal} disabled={!canSaveCurrent} className="btn-ink">
          <Plus className="w-3.5 h-3.5" />
          <span>Save current palette</span>
        </button>
      </div>

      {savedPalettes.length === 0 ? (
        <div className="debossed rounded-[20px] py-20 px-6 text-center max-w-xl mx-auto">
          <p className="font-serif text-2xl text-ink mb-5">Nothing saved yet</p>
          <button onClick={onSwitchToWorkspace} className="btn-paper">
            Go to Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {savedPalettes.map((palette) => {
            const dateStr = new Date(palette.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const varLabel = VARIATION_META[palette.variation]?.label || palette.variation;
            const isEditing = editingCardId === palette.id;
            // While editing, preview the pending values live on the card
            const shown: SavedPalette = isEditing
              ? {
                  ...palette,
                  title: editTitle || palette.title,
                  location: editLocation,
                  notes: editNotes,
                  journalLayout: editLayout,
                }
              : palette;
            const Card = CARD_BY_LAYOUT[shown.journalLayout || 'monograph'] ?? MonographCard;

            return (
              <article key={palette.id} className="sheet overflow-hidden flex flex-col">
                <Card palette={shown} dateStr={dateStr} varLabel={varLabel} />

                {isEditing && (
                  <div className="px-5 sm:px-6 py-5 space-y-4 bg-paper shadow-[inset_0_1px_0_rgba(74,58,40,0.08)]">
                    <div className="debossed rounded-full p-1 flex text-xs" role="radiogroup" aria-label="Card style">
                      {LAYOUTS.map((l) => (
                        <button
                          key={l.id}
                          role="radio"
                          aria-checked={editLayout === l.id}
                          onClick={() => setEditLayout(l.id)}
                          className={`flex-1 py-1.5 rounded-full cursor-pointer transition-all ${
                            editLayout === l.id
                              ? 'bg-paper text-ink font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.15)]'
                              : 'text-ink-soft hover:text-ink'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                    <input
                      aria-label="Title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={`${inputClass} font-serif !text-xl`}
                    />
                    <input
                      aria-label="Place"
                      placeholder="Place"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className={inputClass}
                    />
                    <textarea
                      aria-label="Notes"
                      rows={2}
                      placeholder="Notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className={`${inputClass} resize-none`}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingCardId(null)} className="btn-paper">
                        Cancel
                      </button>
                      <button onClick={() => saveEditing(palette)} className="btn-ink">
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className="mt-auto px-4 sm:px-5 py-3 flex items-center gap-1 text-ink-faint bg-paper shadow-[inset_0_1px_0_rgba(74,58,40,0.07)]">
                    <IconButton label="Edit" onClick={() => startEditing(palette)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton label={copiedId === palette.id ? 'Copied' : 'Copy HEX values'} onClick={() => handleCopyHexList(palette)}>
                      {copiedId === palette.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </IconButton>
                    <IconButton label="Download card" onClick={() => handleDownloadCard(palette)}>
                      <Download className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => onDeletePalette(palette.id)} danger>
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconButton>
                    <button onClick={() => onLoadPalette(palette)} className="btn-paper ml-auto">
                      <span>Open</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, danger, children }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`p-2 rounded-full transition-colors cursor-pointer hover:bg-black/[0.04] ${
      danger ? 'hover:text-red-700' : 'hover:text-ink'
    }`}
  >
    {children}
  </button>
);
