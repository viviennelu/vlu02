import React, { useState, useEffect } from 'react';
import {
  ColorData,
  getReadableTextColor,
  assignDesignRoles,
  generateRecommendedCombinations,
  evaluateWcag,
  DesignRoleAssignments,
  RecommendedCombination,
} from '../utils/colorUtils';
import {
  BookOpen,
  Monitor,
  Award,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Sliders,
  Check,
  Layers,
} from 'lucide-react';

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
  const [posterTheme, setPosterTheme] = useState<PosterThemeKey>(
    avgPaletteLum > 48 ? 'charcoal' : 'gallery-cream'
  );

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
        No active colors to render design previews.
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
      {/* Top Header & Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7E0D6] pb-3">
        <div>
          <h3 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
            Design Applications & Color Intelligence
          </h3>
          <p className="text-xs text-stone-500 font-sans">
            Automatic contrast-evaluated combinations and interactive role playground
          </p>
        </div>

        {/* Mode Switcher: Automated Recommendations vs Playground */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 bg-stone-200/70 rounded text-xs">
            <button
              onClick={() => setPreviewMode('recommendations')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewMode === 'recommendations'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Recommended Schemes</span>
            </button>

            <button
              onClick={() => setPreviewMode('playground')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                previewMode === 'playground'
                  ? 'bg-white text-stone-900 font-semibold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-stone-700" />
              <span>Role Sandbox</span>
            </button>
          </div>
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
                <div
                  key={rec.id}
                  onClick={() => handleApplyRecommendation(rec)}
                  className={`border rounded-lg p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-stone-900 bg-white ring-1 ring-stone-900 shadow-md'
                      : 'border-stone-200 bg-white/80 hover:border-stone-400 hover:bg-white hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-serif font-bold text-sm text-stone-900">
                        {rec.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          rec.badge === 'AAA Highest Contrast'
                            ? 'bg-emerald-100 text-emerald-900'
                            : rec.badge === 'Nocturne Dark'
                            ? 'bg-stone-900 text-white'
                            : rec.badge === 'Multi-Tonal Spread'
                            ? 'bg-sky-100 text-sky-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {rec.roles.contrastMetrics.textOnCanvas.rating} · {ratio}:1
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500 font-sans italic leading-tight">
                      {rec.tagline}
                    </p>

                    <p className="text-[11px] text-stone-600 font-sans leading-relaxed line-clamp-3">
                      {rec.rationale}
                    </p>

                    {/* Miniature Role Palette Swatches */}
                    <div className="pt-1 space-y-1 text-[11px] font-mono text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-xs border border-black/15 shrink-0"
                          style={{ backgroundColor: rec.roles.canvas.hex }}
                        />
                        <span className="truncate">Canvas: {rec.roles.canvas.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-xs border border-black/15 shrink-0"
                          style={{ backgroundColor: rec.roles.textPrimary.hex }}
                        />
                        <span className="truncate">Text: {rec.roles.textPrimary.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-xs border border-black/15 shrink-0"
                          style={{ backgroundColor: rec.roles.accent.hex }}
                        />
                        <span className="truncate">Accent: {rec.roles.accent.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-stone-400">
                      {isSelected ? 'Currently Previewed' : 'Click to preview'}
                    </span>
                    <button
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white font-semibold'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {isSelected ? 'Active Scheme' : 'Apply'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: INTERACTIVE ROLE PLAYGROUND & SANDBOX */}
      {previewMode === 'playground' && (
        <div className="bg-white rounded-lg p-5 border border-stone-300 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <h4 className="font-serif text-lg font-semibold text-stone-900">
                Design Role Sandbox
              </h4>
              <p className="text-xs text-stone-500 font-sans">
                Manually assign palette tones to UI roles and inspect live contrast metrics
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-stone-500">Active Contrast:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-stone-100 text-stone-900 border border-stone-300">
                {activeRoles.contrastMetrics.textOnCanvas.ratio}:1 (
                {activeRoles.contrastMetrics.textOnCanvas.rating})
              </span>
            </div>
          </div>

          {/* Role Assigners Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Canvas */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Canvas Background
              </label>
              <select
                value={activeRoles.canvas.id}
                onChange={(e) => handleUpdateRole('canvas', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>

            {/* Surface */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Surface / Cards
              </label>
              <select
                value={activeRoles.surface.id}
                onChange={(e) => handleUpdateRole('surface', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Text */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Primary Text
              </label>
              <select
                value={activeRoles.textPrimary.id}
                onChange={(e) => handleUpdateRole('textPrimary', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Text */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Secondary Text
              </label>
              <select
                value={activeRoles.textSecondary.id}
                onChange={(e) => handleUpdateRole('textSecondary', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Accent */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Primary Accent / CTA
              </label>
              <select
                value={activeRoles.accent.id}
                onChange={(e) => handleUpdateRole('accent', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>

            {/* Border */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-wider text-stone-500 block">
                Border Hairline
              </label>
              <select
                value={activeRoles.border.id}
                onChange={(e) => handleUpdateRole('border', e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded px-2 py-1.5 text-xs font-mono text-stone-900 cursor-pointer"
              >
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Context Layout Switcher */}
      <div className="flex items-center justify-between border-b border-[#E7E0D6] pb-2">
        <span className="text-xs uppercase font-mono text-stone-500 tracking-wider">
          Live Design Context:
        </span>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveContext('web')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeContext === 'web'
                ? 'bg-stone-900 text-white font-medium'
                : 'text-stone-600 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Digital Journal UI</span>
          </button>

          <button
            onClick={() => setActiveContext('poster')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeContext === 'poster'
                ? 'bg-stone-900 text-white font-medium'
                : 'text-stone-600 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Editorial Poster</span>
          </button>

          <button
            onClick={() => setActiveContext('swatchbook')}
            className={`px-3 py-1 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeContext === 'swatchbook'
                ? 'bg-stone-900 text-white font-medium'
                : 'text-stone-600 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Specimen Card</span>
          </button>
        </div>
      </div>

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
              chroma-journal.studio/palette-specimen
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
                  style={{ backgroundColor: activeRoles.accent.hex }}
                />
                <span style={{ color: uiTextPrimary }}>STUDIO JOURNAL</span>
              </div>

              <div
                className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-wider font-mono"
                style={{ color: uiTextSecondary }}
              >
                <span className="font-semibold cursor-pointer">Archive</span>
                <span className="opacity-80 hover:opacity-100 cursor-pointer">Monographs</span>
                <span className="opacity-80 hover:opacity-100 cursor-pointer">Specimens</span>
              </div>

              <button
                className="px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: activeRoles.accent.hex,
                  color: accentButtonTextColor,
                  border: primaryButtonBorder,
                }}
              >
                Explore Archive
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
                    Color Journal Entry
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: uiTextSecondary }}
                  >
                    Vol. 01 · {colors.length} Tones
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
                  Chromatic density extracted faithfully from the source light. Roles evaluated for WCAG AA readability.
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
                    <span>Read Monograph</span>
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
                    Inspect Palette
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
              {colors.slice(0, 6).map((c, i) => {
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
                      className="h-24 w-full p-3 flex flex-col justify-between border-b"
                      style={{
                        backgroundColor: c.hex,
                        borderColor: cardContainerBorder,
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
                          {Math.round(c.weight * 100)}% DENSITY
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

                      <div
                        className="pt-2 border-t flex items-center justify-between text-[10px] font-mono"
                        style={{ borderColor: cardContainerBorder }}
                      >
                        <span style={{ color: cardTextSecondary }}>
                          RGB {c.rgb.r}, {c.rgb.g}, {c.rgb.b}
                        </span>
                        <span
                          className="font-semibold flex items-center gap-0.5 cursor-pointer hover:underline"
                          style={{ color: isDarkCanvas ? '#FAF8F5' : '#1C1917' }}
                        >
                          Active Specimen
                        </span>
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
          {/* Neutral Background Treatment Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-md border border-stone-200 shadow-2xs">
            <span className="text-xs font-mono text-stone-600">
              Poster Neutral Ground: <strong className="text-stone-900">{POSTER_THEMES[posterTheme].label}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              {(Object.keys(POSTER_THEMES) as PosterThemeKey[]).map((key) => {
                const t = POSTER_THEMES[key];
                const isActive = posterTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPosterTheme(key)}
                    className={`px-2.5 py-1 text-xs rounded font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white font-semibold shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: t.bg }}
                    />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
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
              <span>VOLUME XXI · ISSUE 04</span>
              <span>CHROMATIC FIDELITY MONOGRAPH</span>
              <span>ARCHIVAL SERIES</span>
            </div>

            {/* Poster Grid */}
            <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              <div className="md:col-span-7 flex flex-col justify-between space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: activeRoles.accent.hex }}
                    />
                    <span
                      className="font-mono text-xs uppercase tracking-widest font-semibold"
                      style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                    >
                      Light Quantization
                    </span>
                  </div>

                  <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-[0.95] tracking-tight mb-6">
                    Atmospheric <br />
                    <span className="italic font-serif" style={{ color: activeRoles.accent.hex }}>
                      Photographic
                    </span>{' '}
                    Memory.
                  </h1>

                  <p
                    className="text-base sm:text-lg leading-relaxed max-w-md font-sans"
                    style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                  >
                    Colors derived faithfully from photographic light density, preserving authentic local tones without arbitrary pigment intrusion.
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
                  <div className="flex items-center justify-between mb-2.5">
                    <span
                      className="text-[11px] font-mono uppercase tracking-wider font-semibold"
                      style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                    >
                      Extracted Spectral Frequency Matrix
                    </span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: POSTER_THEMES[posterTheme].textSecondary }}
                    >
                      {colors.length} Tones Analyzed
                    </span>
                  </div>

                  {/* Swatch Ribbon with Hairline Dividers */}
                  <div
                    className="flex h-14 rounded-xs overflow-hidden shadow-xs border"
                    style={{ borderColor: POSTER_THEMES[posterTheme].matrixBorder }}
                  >
                    {colors.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        style={{
                          backgroundColor: c.hex,
                          flex: `${Math.max(0.1, c.weight)} 0 0%`,
                        }}
                        className="h-full relative group border-r border-black/20 last:border-r-0 ring-1 ring-inset ring-white/10"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                    {colors.map((c, idx) => (
                      <div key={c.id || idx} className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/25 shadow-2xs"
                          style={{ backgroundColor: c.hex }}
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
                    <div className="absolute bottom-0 inset-x-0 p-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono flex items-center justify-between">
                      <span>FIG. 01 — SOURCE REF</span>
                      <span>100% SCALE</span>
                    </div>
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
                    — Photographic Journal
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
              <div className="flex items-center gap-3">
                <span>BARCODE // 978-0-262-13472-8</span>
                <span>·</span>
                <span>CATALOGUE № {colors.length}-TONE SPECIMEN</span>
              </div>
              <div className="flex items-center gap-2">
                {colors.map((c) => (
                  <span
                    key={c.id}
                    className="w-3 h-3 rounded-xs inline-block border border-black/25"
                    style={{ backgroundColor: c.hex }}
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
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-xl border border-stone-300 p-8 md:p-12">
          <div className="border-b-2 border-stone-900 pb-4 mb-8 flex items-baseline justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
                PIGMENT SPECIMEN SHEET
              </h2>
              <p className="font-mono text-xs uppercase tracking-widest text-stone-500 mt-1">
                Ref. {paletteTitle} · Contrast Verified
              </p>
            </div>
            <span className="font-mono text-xs text-stone-400">SHEET 01 / 01</span>
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border border-stone-200 bg-[#FAF8F5] gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-xs shrink-0 border border-black/10 shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-400">№ 0{index + 1}</span>
                        <h4 className="font-serif text-lg font-bold text-stone-900">{c.name}</h4>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-200 text-stone-700">
                          {c.origin === 'extracted' ? 'Photo' : c.origin || 'Tone'}
                        </span>
                      </div>
                      <p className="font-mono font-bold text-xs text-stone-700">{c.hex}</p>
                    </div>
                  </div>

                  <div className="font-mono text-xs text-stone-600 sm:text-right space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
                    <div>RGB: {c.rgb.r}, {c.rgb.g}, {c.rgb.b}</div>
                    <div>{cmykStr}</div>
                    <div>PROMINENCE: {Math.round(c.weight * 100)}% OF FRAME</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between text-xs font-mono text-stone-400">
            <span>Color accuracy validated against WCAG AA contrast standards</span>
            <span>Archival Standard ISO 12647-2</span>
          </div>
        </div>
      )}
    </div>
  );
};
