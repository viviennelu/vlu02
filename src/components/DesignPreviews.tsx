import React, { useState, useEffect, useRef } from 'react';
import {
  ColorData,
  getReadableTextColor,
  assignDesignRoles,
  generateRecommendedCombinations,
  evaluateWcag,
  DesignRoleAssignments,
  RecommendedCombination,
  getContrastRatio,
} from '../utils/colorUtils';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';

/**
 * Edge treatment that keeps a swatch distinguishable from the surface it sits
 * on. Applied only when the two are close in luminance, and directional:
 * a light hairline on dark grounds, a soft dark one on light grounds. The
 * swatch's own color is never altered.
 */
function swatchEdge(hex: string, groundHex: string): string {
  const ratio = getContrastRatio(hex, groundHex);
  const groundIsDark = getReadableTextColor(groundHex) === '#FFFFFF';
  if (ratio >= 1.45) return 'inset 0 0 0 1px rgba(0,0,0,0.05)';
  return groundIsDark
    ? 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 1px rgba(255,255,255,0.12)'
    : 'inset 0 0 0 1px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.10)';
}

/** The palette color that reads best against a ground: used for accent text. */
function mostLegibleOn(groundHex: string, preferred: ColorData, colors: ColorData[], min = 3): string {
  if (getContrastRatio(preferred.hex, groundHex) >= min) return preferred.hex;
  const best = [...colors].sort((a, b) => getContrastRatio(b.hex, groundHex) - getContrastRatio(a.hex, groundHex))[0];
  return best && getContrastRatio(best.hex, groundHex) >= min ? best.hex : getReadableTextColor(groundHex);
}

/** Role picker that shows each tone as a swatch, so tones are recognisable at a glance. */
const RolePicker: React.FC<{
  label: string;
  value: ColorData;
  colors: ColorData[];
  onChange: (colorId: string) => void;
}> = ({ label, value, colors, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const swatch = (hex: string, size: string) => (
    <span
      className={`${size} rounded-full shrink-0`}
      style={{ backgroundColor: hex, boxShadow: swatchEdge(hex, '#E9E4DB') }}
    />
  );

  return (
    <div ref={rootRef} className="relative space-y-1">
      <span className="eyebrow block !text-[10px]">{label}</span>
      <button
        type="button"
        aria-label={`${label}: ${value.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="debossed !rounded-full w-full flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 text-left cursor-pointer"
      >
        {swatch(value.hex, 'w-5 h-5')}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-xs text-ink truncate">{value.name}</span>
          <span className="block font-mono text-[10px] text-ink-faint">{value.hex}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-faint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="listbox" aria-label={label} className="sheet absolute z-30 left-0 right-0 mt-1 p-1 max-h-72 overflow-y-auto">
          {colors.map((c) => {
            const selected = c.id === value.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                  selected ? 'bg-paper-deep' : 'hover:bg-black/[0.04]'
                }`}
              >
                {swatch(c.hex, 'w-6 h-6')}
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-xs text-ink truncate">{c.name}</span>
                  <span className="block font-mono text-[10px] text-ink-faint">{c.hex}</span>
                </span>
                {selected && <Check className="w-3.5 h-3.5 text-ink shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const pill = (active: boolean) =>
  `px-3.5 py-1.5 rounded-full cursor-pointer transition-all whitespace-nowrap ${
    active
      ? 'bg-paper text-ink font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.15)]'
      : 'text-ink-soft hover:text-ink'
  }`;

interface DesignPreviewsProps {
  colors: ColorData[];
  imageSrc: string | null;
  paletteTitle?: string;
}

export const DesignPreviews: React.FC<DesignPreviewsProps> = ({
  colors,
  imageSrc,
  paletteTitle = 'Chromatic Specimen',
}) => {
  const [previewMode, setPreviewMode] = useState<'recommendations' | 'playground'>('recommendations');
  const [activeContext, setActiveContext] = useState<'web' | 'poster' | 'swatchbook'>('web');

  // Dynamic neutral poster ground selection based on palette average luminance
  const avgPaletteLum = colors.length > 0
    ? colors.reduce((acc, c) => acc + c.hsl.l, 0) / colors.length
    : 50;

  type PosterThemeKey = 'charcoal' | 'gallery-cream' | 'warm-umber' | 'archival-gray';
  const [posterTheme, setPosterTheme] = useState<PosterThemeKey>(() => {
    if (colors.length === 0) return avgPaletteLum > 48 ? 'charcoal' : 'gallery-cream';
    // Pick the matrix ground whose *worst* contrast against any palette tone
    // is highest, so no single tone disappears into it.
    const grounds: Record<PosterThemeKey, string> = {
      charcoal: '#0D0D0C',
      'gallery-cream': '#EBE6DC',
      'warm-umber': '#120F0D',
      'archival-gray': '#DED8CD',
    };
    const score = (g: string) => colors.reduce((m, c) => Math.min(m, getContrastRatio(c.hex, g)), Infinity);
    return (Object.keys(grounds) as PosterThemeKey[]).sort((a, b) => score(grounds[b]) - score(grounds[a]))[0];
  });

  const POSTER_THEMES: Record<
    PosterThemeKey,
    {
      label: string;
      bg: string;
      surface: string;
      border: string;
      textPrimary: string;
      textSecondary: string;
      matrixBackdrop: string;
      matrixBorder: string;
    }
  > = {
    charcoal: {
      label: 'Museum Charcoal',
      bg: '#141312',
      surface: '#1E1D1B',
      border: '#2E2C29',
      textPrimary: '#FAF7F2',
      textSecondary: '#A39D95',
      matrixBackdrop: '#0D0D0C',
      matrixBorder: '#FFFFFF22',
    },
    'gallery-cream': {
      label: 'Gallery Cream',
      bg: '#F6F3EC',
      surface: '#FFFFFF',
      border: '#E2DCD2',
      textPrimary: '#1A1816',
      textSecondary: '#6E6961',
      matrixBackdrop: '#EBE6DC',
      matrixBorder: '#00000015',
    },
    'warm-umber': {
      label: 'Warm Archival Umber',
      bg: '#1C1714',
      surface: '#27201C',
      border: '#3D332D',
      textPrimary: '#FBF6EE',
      textSecondary: '#ABA197',
      matrixBackdrop: '#120F0D',
      matrixBorder: '#FFFFFF22',
    },
    'archival-gray': {
      label: 'Archival Gray',
      bg: '#EBE7E0',
      surface: '#F8F5EE',
      border: '#D6CFC3',
      textPrimary: '#1C1B1A',
      textSecondary: '#66615B',
      matrixBackdrop: '#DED8CD',
      matrixBorder: '#00000018',
    },
  };

  // Generate automated recommendations
  const recommendations = generateRecommendedCombinations(colors);
  const defaultRoles = assignDesignRoles(colors);

  // Active role state
  const [activeRoles, setActiveRoles] = useState<DesignRoleAssignments>(
    recommendations[0]?.roles || defaultRoles
  );
  const [activeRecId, setActiveRecId] = useState<string>(recommendations[0]?.id || 'custom');

  // Synchronize active roles whenever colors prop changes (palette variation, add tone, edit)
  useEffect(() => {
    const updatedRecs = generateRecommendedCombinations(colors);
    if (updatedRecs.length > 0) {
      const match = updatedRecs.find((r) => r.id === activeRecId);
      if (match) {
        setActiveRoles(match.roles);
      } else {
        setActiveRoles(updatedRecs[0].roles);
        setActiveRecId(updatedRecs[0].id);
      }
    } else {
      setActiveRoles(assignDesignRoles(colors));
      setActiveRecId('custom');
    }
  }, [colors]);

  if (colors.length === 0) {
    return (
      <div className="p-12 text-center text-stone-500 font-mono text-xs">
        Add a photo in the Studio to see previews.
      </div>
    );
  }

  const handleApplyRecommendation = (rec: RecommendedCombination) => {
    setActiveRoles(rec.roles);
    setActiveRecId(rec.id);
  };

  const handleUpdateRole = (roleKey: keyof DesignRoleAssignments, colorId: string) => {
    const chosenColor = colors.find((c) => c.id === colorId);
    if (!chosenColor) return;

    setActiveRecId('custom');
    const updated = { ...activeRoles, [roleKey]: chosenColor };
    // Recalculate contrast metrics
    updated.contrastMetrics = {
      textOnCanvas: evaluateWcag(updated.textPrimary.hex, updated.canvas.hex),
      textOnSurface: evaluateWcag(updated.textPrimary.hex, updated.surface.hex),
      accentContrast: evaluateWcag(
        getReadableTextColor(updated.accent.hex),
        updated.accent.hex
      ),
    };
    setActiveRoles(updated);
  };

  const accentButtonTextColor = getReadableTextColor(activeRoles.accent.hex);

  // --- CONTRAST & LEGIBILITY SAFEGUARDS ---
  const isDarkCanvas = activeRoles.canvas.hsl.l < 48;

  // Primary text: strictly verified for WCAG AA readability (>= 4.5:1), with complementary fallback ink
  const textPrimaryRatio = evaluateWcag(activeRoles.textPrimary.hex, activeRoles.canvas.hex).ratio;
  const uiTextPrimary = textPrimaryRatio >= 4.5
    ? activeRoles.textPrimary.hex
    : (isDarkCanvas ? '#FAF8F5' : '#141210');

  // Secondary text: verified for legible label contrast (>= 3.2:1)
  const textSecondaryRatio = evaluateWcag(activeRoles.textSecondary.hex, activeRoles.canvas.hex).ratio;
  const uiTextSecondary = textSecondaryRatio >= 3.2
    ? activeRoles.textSecondary.hex
    : (isDarkCanvas ? '#A8A29E' : '#57534E');

  // Hairline borders: clean separation on canvas
  const borderRatio = evaluateWcag(activeRoles.border.hex, activeRoles.canvas.hex).ratio;
  const uiBorder = borderRatio >= 1.3
    ? activeRoles.border.hex
    : (isDarkCanvas ? '#383430' : '#E2DCD2');

  // Primary button: accent color with contrast border if needed
  const accentContrastOnCanvas = evaluateWcag(activeRoles.accent.hex, activeRoles.canvas.hex).ratio;
  const primaryButtonBorder = accentContrastOnCanvas < 2.5
    ? (isDarkCanvas ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(0, 0, 0, 0.20)')
    : 'none';

  // Secondary button: solid, high-contrast container that never blends into canvas
  const secondaryButtonBg = isDarkCanvas ? '#22201D' : '#FFFFFF';
  const secondaryButtonBorder = isDarkCanvas ? '#48433E' : '#D6D3D1';
  const secondaryButtonText = isDarkCanvas ? '#FAF8F5' : '#1C1917';

  // Badges: clean high-contrast chips
  const badgeBg = isDarkCanvas ? '#22201D' : '#F5F2EB';
  const badgeBorder = isDarkCanvas ? '#383430' : '#E2DCD2';
  const badgeTextColor = evaluateWcag(activeRoles.accent.hex, badgeBg).ratio >= 3.5
    ? activeRoles.accent.hex
    : uiTextPrimary;

  // Browser Window Chrome
  const windowChromeBg = isDarkCanvas ? '#181615' : '#EFECE6';
  const windowChromeBorder = isDarkCanvas ? '#2E2B27' : '#DCD7CE';
  const windowUrlBg = isDarkCanvas ? '#22201D' : '#FFFFFF';
  const windowUrlBorder = isDarkCanvas ? '#383430' : '#D6D3D1';
  const windowUrlText = isDarkCanvas ? '#A8A29E' : '#66615B';

  // Specimen Cards: complementary neutral background not in palette so featured colors stand out
  const cardContainerBg = isDarkCanvas ? '#1A1816' : '#FFFFFF';
  const cardContainerBorder = isDarkCanvas ? '#2C2926' : '#E7E2D8';
  const cardTextPrimary = isDarkCanvas ? '#FAF8F5' : '#1C1917';
  const cardTextSecondary = isDarkCanvas ? '#A8A29E' : '#78716C';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" className="debossed rounded-full p-1 flex text-xs">
          <button role="tab" aria-selected={previewMode === 'recommendations'} onClick={() => setPreviewMode('recommendations')} className={pill(previewMode === 'recommendations')}>
            Suggested
          </button>
          <button role="tab" aria-selected={previewMode === 'playground'} onClick={() => setPreviewMode('playground')} className={pill(previewMode === 'playground')}>
            Custom roles
          </button>
        </div>
        <div role="tablist" className="debossed rounded-full p-1 flex text-xs">
          <button role="tab" aria-selected={activeContext === 'web'} onClick={() => setActiveContext('web')} className={pill(activeContext === 'web')}>
            Website
          </button>
          <button role="tab" aria-selected={activeContext === 'poster'} onClick={() => setActiveContext('poster')} className={pill(activeContext === 'poster')}>
            Poster
          </button>
          <button role="tab" aria-selected={activeContext === 'swatchbook'} onClick={() => setActiveContext('swatchbook')} className={pill(activeContext === 'swatchbook')}>
            Specimen
          </button>
        </div>
      </div>

      {/* SECTION 1: AUTOMATIC COMBINATION RECOMMENDATIONS */}
      {previewMode === 'recommendations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {recommendations.map((rec) => {
              const isSelected = activeRecId === rec.id;
              const ratio = rec.roles.contrastMetrics.textOnCanvas.ratio;

              return (
                <button
                  key={rec.id}
                  onClick={() => handleApplyRecommendation(rec)}
                  aria-pressed={isSelected}
                  title={rec.rationale}
                  className={`text-left rounded-[14px] p-1.5 cursor-pointer transition-all ${
                    isSelected ? 'sheet shadow-[0_0_0_1.5px_var(--color-ink)]' : 'sheet opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Miniature of the scheme itself: canvas, surface, text, accent */}
                  <div
                    className="rounded-[10px] h-20 p-3 flex flex-col justify-between"
                    style={{ backgroundColor: rec.roles.canvas.hex, boxShadow: swatchEdge(rec.roles.canvas.hex, '#F7F4EF') }}
                  >
                    <span className="font-serif text-lg leading-none" style={{ color: rec.roles.textPrimary.hex }}>
                      Aa
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-10 rounded-full"
                        style={{ backgroundColor: rec.roles.accent.hex, boxShadow: swatchEdge(rec.roles.accent.hex, rec.roles.canvas.hex) }}
                      />
                      <span
                        className="h-2 w-6 rounded-full"
                        style={{ backgroundColor: rec.roles.surface.hex, boxShadow: swatchEdge(rec.roles.surface.hex, rec.roles.canvas.hex) }}
                      />
                    </div>
                  </div>
                  <div className="px-1.5 pt-2.5 pb-1 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-ink truncate">{rec.title}</span>
                    <span className="font-mono text-[10px] text-ink-faint shrink-0">{ratio}:1</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: INTERACTIVE ROLE PLAYGROUND & SANDBOX */}
      {previewMode === 'playground' && (
        <div className="sheet p-5 space-y-4">
          <div className="flex items-center justify-end text-xs font-mono text-ink-soft">
            Text contrast {activeRoles.contrastMetrics.textOnCanvas.ratio}:1 · {activeRoles.contrastMetrics.textOnCanvas.rating}
          </div>

          {/* Role Assigners Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <RolePicker label="Background" value={activeRoles.canvas} colors={colors} onChange={(id) => handleUpdateRole('canvas', id)} />

            <RolePicker label="Surface" value={activeRoles.surface} colors={colors} onChange={(id) => handleUpdateRole('surface', id)} />

            <RolePicker label="Primary Text" value={activeRoles.textPrimary} colors={colors} onChange={(id) => handleUpdateRole('textPrimary', id)} />

            <RolePicker label="Secondary Text" value={activeRoles.textSecondary} colors={colors} onChange={(id) => handleUpdateRole('textSecondary', id)} />

            <RolePicker label="Accent" value={activeRoles.accent} colors={colors} onChange={(id) => handleUpdateRole('accent', id)} />

            <RolePicker label="Border" value={activeRoles.border} colors={colors} onChange={(id) => handleUpdateRole('border', id)} />
          </div>
        </div>
      )}

      {/* CONTEXT 1: DIGITAL PUBLICATION INTERFACE */}
      {activeContext === 'web' && (
        <div
          className="max-w-4xl mx-auto rounded-lg shadow-xl border overflow-hidden transition-colors duration-200"
          style={{
            borderColor: windowChromeBorder,
            backgroundColor: windowChromeBg,
          }}
        >
          {/* Browser Window Chrome */}
          <div
            className="px-4 py-2 border-b flex items-center gap-2"
            style={{
              backgroundColor: windowChromeBg,
              borderColor: windowChromeBorder,
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-stone-400" />
            </div>
            <div
              className="mx-auto w-1/2 rounded px-3 py-0.5 text-center text-[11px] font-mono truncate border"
              style={{
                backgroundColor: windowUrlBg,
                borderColor: windowUrlBorder,
                color: windowUrlText,
              }}
            >
              journal.example
            </div>
          </div>

          <div
            className="p-6 md:p-8 space-y-8 transition-colors duration-200"
            style={{
              backgroundColor: activeRoles.canvas.hex,
              color: uiTextPrimary,
            }}
          >
            {/* Top Bar */}
            <div
              className="flex items-center justify-between pb-4 border-b"
              style={{ borderColor: uiBorder }}
            >
              <div className="flex items-center gap-2 font-serif text-lg font-bold tracking-tight">
                <span
                  className="w-4 h-4 rounded-xs inline-block shadow-2xs"
                  style={{ backgroundColor: activeRoles.accent.hex, boxShadow: swatchEdge(activeRoles.accent.hex, activeRoles.canvas.hex) }}
                />
                <span style={{ color: uiTextPrimary }}>Journal</span>
              </div>

              <div
                className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-wider font-mono"
                style={{ color: uiTextSecondary }}
              >
                <span className="font-semibold">Stories</span>
                <span className="opacity-80">Places</span>
                <span className="opacity-80">About</span>
              </div>

              <button
                className="px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: activeRoles.accent.hex,
                  color: accentButtonTextColor,
                  border: primaryButtonBorder,
                }}
              >
                Subscribe
              </button>
            </div>

            {/* Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shadow-2xs"
                    style={{
                      backgroundColor: badgeBg,
                      color: badgeTextColor,
                      borderColor: badgeBorder,
                    }}
                  >
                    Field notes
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: uiTextSecondary }}
                  >
                    {colors.length} tones
                  </span>
                </div>

                <h2
                  className="font-serif text-3xl sm:text-4xl font-medium leading-tight text-balance"
                  style={{ color: uiTextPrimary }}
                >
                  {paletteTitle}
                </h2>

                <p
                  className="text-sm leading-relaxed font-sans max-w-md"
                  style={{ color: uiTextSecondary }}
                >
                  A short introduction sits here, set in the secondary text color.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: activeRoles.accent.hex,
                      color: accentButtonTextColor,
                      border: primaryButtonBorder,
                    }}
                  >
                    <span>Read more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    className="px-4 py-2 rounded text-xs font-semibold border cursor-pointer transition-opacity hover:opacity-90 shadow-2xs"
                    style={{
                      backgroundColor: secondaryButtonBg,
                      borderColor: secondaryButtonBorder,
                      color: secondaryButtonText,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Media Slot */}
              <div className="md:col-span-5">
                {imageSrc ? (
                  <div
                    className="rounded-md overflow-hidden aspect-4/3 shadow-sm border"
                    style={{ borderColor: uiBorder }}
                  >
                    <img
                      src={imageSrc}
                      alt="Interface preview media"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="rounded-md aspect-4/3 flex items-center justify-center p-4 border"
                    style={{
                      backgroundColor: cardContainerBg,
                      borderColor: uiBorder,
                    }}
                  >
                    <span className="text-xs font-mono" style={{ color: uiTextSecondary }}>Media frame</span>
                  </div>
                )}
              </div>
            </div>

            {/* Specimen Cards Row: Presented on neutral card ground allowing featured color to stand out cleanly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {colors.map((c, i) => {
                const roleLabel =
                  i === 0
                    ? 'Dominant Ground'
                    : i === 1
                    ? 'Secondary Midtone'
                    : i === 2
                    ? 'Accent Highlight'
                    : 'Palette Tone';

                return (
                  <div
                    key={c.id || i}
                    className="rounded-md border overflow-hidden transition-all shadow-sm flex flex-col"
                    style={{
                      backgroundColor: cardContainerBg,
                      borderColor: cardContainerBorder,
                    }}
                  >
                    {/* Generous, unadorned 100% solid color specimen block */}
                    <div
                      className="h-24 w-full p-3 flex flex-col justify-between"
                      style={{
                        backgroundColor: c.hex,
                        boxShadow: swatchEdge(c.hex, cardContainerBg),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.30)',
                            color: '#FFFFFF',
                          }}
                        >
                          № 0{i + 1}
                        </span>
                        <span
                          className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.30)',
                            color: '#FFFFFF',
                          }}
                        >
                          {Math.round(c.weight * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Specimen Details on clean neutral card ground */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4
                            className="font-serif text-sm font-semibold truncate"
                            style={{ color: cardTextPrimary }}
                          >
                            {c.name}
                          </h4>
                          <span
                            className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0"
                            style={{
                              borderColor: cardContainerBorder,
                              color: cardTextSecondary,
                            }}
                          >
                            {roleLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                          <span
                            className="font-bold tracking-tight"
                            style={{ color: cardTextPrimary }}
                          >
                            {c.hex}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: cardTextSecondary }}
                          >
                            L {c.hsl.l}% · S {c.hsl.s}%
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT 2: EDITORIAL POSTER */}
      {activeContext === 'poster' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-end gap-1.5" role="radiogroup" aria-label="Poster ground">
            {(Object.keys(POSTER_THEMES) as PosterThemeKey[]).map((key) => (
              <button
                key={key}
                role="radio"
                aria-checked={posterTheme === key}
                onClick={() => setPosterTheme(key)}
                title={POSTER_THEMES[key].label}
                aria-label={POSTER_THEMES[key].label}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all ${
                  posterTheme === key
                    ? 'shadow-[0_0_0_2px_var(--color-canvas),0_0_0_3.5px_var(--color-ink)]'
                    : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] hover:scale-110'
                }`}
                style={{ backgroundColor: POSTER_THEMES[key].bg }}
              />
            ))}
          </div>

          <div
            className="rounded-lg shadow-xl border overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: POSTER_THEMES[posterTheme].bg,
              color: POSTER_THEMES[posterTheme].textPrimary,
              borderColor: POSTER_THEMES[posterTheme].border,
            }}
          >
            {/* Top Header */}
            <div
              className="px-8 py-5 border-b flex items-center justify-between text-xs font-mono uppercase tracking-widest"
              style={{
                borderColor: POSTER_THEMES[posterTheme].border,
                color: POSTER_THEMES[posterTheme].textSecondary,
              }}
            >
              <span>Issue 04</span>
              <span>{paletteTitle}</span>
            </div>

            {/* Poster Grid */}
            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              <div className="md:col-span-7 flex flex-col justify-between space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: activeRoles.accent.hex, boxShadow: swatchEdge(activeRoles.accent.hex, POSTER_THEMES[posterTheme].bg) }}
                    />
                    <span
                      className="font-mono text-xs uppercase tracking-widest font-semibold"
                      style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                    >
                      Color study
                    </span>
                  </div>

                  <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-[0.95] tracking-tight mb-6">
                    Atmospheric <br />
                    <span className="italic font-serif" style={{ color: mostLegibleOn(POSTER_THEMES[posterTheme].bg, activeRoles.accent, colors) }}>
                      Photographic
                    </span>{' '}
                    Memory.
                  </h1>

                  <p
                    className="text-base sm:text-lg leading-relaxed max-w-md font-sans"
                    style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                  >
                    Every tone on this page was taken from a single photograph.
                  </p>
                </div>

                {/* Spectral Frequency Matrix Plate (Distinguishable Frame & Ledger) */}
                <div
                  className="p-4 rounded-md border"
                  style={{
                    backgroundColor: POSTER_THEMES[posterTheme].matrixBackdrop,
                    borderColor: POSTER_THEMES[posterTheme].matrixBorder,
                  }}
                >
                  {/* Swatch Ribbon with Hairline Dividers */}
                  {/* Segments separated by a 2px gap of the ground itself, so
                      neighbouring similar tones never merge into one band. */}
                  <div className="flex h-14 gap-[2px]">
                    {colors.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        style={{
                          backgroundColor: c.hex,
                          flex: `${Math.max(0.1, c.weight)} 0 0%`,
                          boxShadow: swatchEdge(c.hex, POSTER_THEMES[posterTheme].matrixBackdrop),
                        }}
                        className="h-full relative group rounded-[2px] first:rounded-l-[4px] last:rounded-r-[4px]"
                        title={`${c.name}: ${c.hex} (${Math.round(c.weight * 100)}%)`}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/30 backdrop-blur-2xs transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-white drop-shadow-xs">
                            {c.hex}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Itemized Swatch Index / Ledger Below Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {colors.map((c, idx) => (
                      <div key={c.id || idx} className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.hex, boxShadow: swatchEdge(c.hex, POSTER_THEMES[posterTheme].matrixBackdrop) }}
                        />
                        <div className="min-w-0 flex-1 leading-tight">
                          <span
                            className="text-[10px] font-serif block truncate font-medium"
                            style={{ color: POSTER_THEMES[posterTheme].textPrimary }}
                          >
                            0{idx + 1} · {c.name}
                          </span>
                          <span
                            className="text-[9px] font-mono block opacity-75"
                            style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                          >
                            {c.hex} · {Math.round(c.weight * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Media */}
              <div className="md:col-span-5 flex flex-col justify-between space-y-6">
                {imageSrc && (
                  <div
                    className="rounded-md overflow-hidden shadow-md border relative aspect-4/5"
                    style={{ borderColor: POSTER_THEMES[posterTheme].border }}
                  >
                    <img
                      src={imageSrc}
                      alt="Source photograph in monograph layout"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                  </div>
                )}

                <div
                  className="p-5 rounded-md border"
                  style={{
                    backgroundColor: POSTER_THEMES[posterTheme].surface,
                    borderColor: POSTER_THEMES[posterTheme].border,
                  }}
                >
                  <p className="font-serif italic text-base leading-snug mb-2">
                    "A photograph is a record of light; a palette is its lasting resonance."
                  </p>
                  <p
                    className="font-mono text-[10px] tracking-wider uppercase"
                    style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                  >
                    — Field notes
                  </p>
                </div>
              </div>
            </div>

            {/* Poster Footer */}
            <div
              className="px-8 py-4 border-t flex flex-wrap items-center justify-between text-[11px] font-mono gap-4"
              style={{
                borderColor: POSTER_THEMES[posterTheme].border,
                backgroundColor: POSTER_THEMES[posterTheme].surface,
                color: POSTER_THEMES[posterTheme].textSecondary,
              }}
            >
              <span>{colors.length} tones</span>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <span
                    key={c.id}
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: c.hex, boxShadow: swatchEdge(c.hex, POSTER_THEMES[posterTheme].surface) }}
                    title={`${c.name}: ${c.hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEXT 3: SPECIMEN CARD */}
      {activeContext === 'swatchbook' && (
        <div className="max-w-3xl mx-auto sheet p-8 md:p-12">
          <div className="border-b border-ink pb-4 mb-8 flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">{paletteTitle}</h2>
            <span className="eyebrow shrink-0">{colors.length} tones</span>
          </div>

          <div className="space-y-4">
            {colors.map((c, index) => {
              const rNorm = c.rgb.r / 255;
              const gNorm = c.rgb.g / 255;
              const bNorm = c.rgb.b / 255;
              const k = 1 - Math.max(rNorm, gNorm, bNorm);
              const cy = k === 1 ? 0 : Math.round(((1 - rNorm - k) / (1 - k)) * 100);
              const m = k === 1 ? 0 : Math.round(((1 - gNorm - k) / (1 - k)) * 100);
              const y = k === 1 ? 0 : Math.round(((1 - bNorm - k) / (1 - k)) * 100);
              const cmykStr = `C:${cy} M:${m} Y:${y} K:${Math.round(k * 100)}`;

              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-ink/10 last:border-b-0 gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-[6px] shrink-0"
                      style={{ backgroundColor: c.hex, boxShadow: swatchEdge(c.hex, '#F7F4EF') }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ink-faint">{String(index + 1).padStart(2, '0')}</span>
                        <h4 className="font-serif text-xl font-medium text-ink">{c.name}</h4>
                      </div>
                      <p className="font-mono text-xs text-ink-soft">{c.hex}</p>
                    </div>
                  </div>

                  <div className="font-mono text-[11px] text-ink-faint sm:text-right space-y-0.5">
                    <div>RGB {c.rgb.r} {c.rgb.g} {c.rgb.b}</div>
                    <div>{cmykStr}</div>
                    <div>{Math.round(c.weight * 100)}%</div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
};
