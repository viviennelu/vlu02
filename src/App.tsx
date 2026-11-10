import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PaletteDisplay } from './components/PaletteDisplay';
import { PaletteVariations } from './components/PaletteVariations';
import { ColorEditorModal } from './components/ColorEditorModal';
import { AddToneModal } from './components/AddToneModal';
import { DesignPreviews } from './components/DesignPreviews';
import { ExportModal } from './components/ExportModal';
import { SavedCollectionsView } from './components/SavedCollectionsView';
import { Toast } from './components/Toast';
import {
  ColorData,
  PaletteVariationType,
  SavedPalette,
  getColorName,
} from './utils/colorUtils';
import { extractPaletteFromImage, CropRegion } from './utils/colorExtraction';
import { generateVariation } from './utils/paletteVariations';
import {
  getSavedPalettes,
  savePaletteToStorage,
  updateSavedPalette,
  deleteSavedPalette,
} from './utils/collectionStorage';
import { SAMPLE_IMAGES } from './data/sampleImages';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'workspace' | 'previews' | 'collections'>('workspace');

  // Image State (Defaulting to the architectural sample so the studio begins alive with color)
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(SAMPLE_IMAGES[0].src);
  const [paletteTitle, setPaletteTitle] = useState<string>(SAMPLE_IMAGES[0].title);
  const [activeRegion, setActiveRegion] = useState<CropRegion | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Palette State
  const [baseExtractedColors, setBaseExtractedColors] = useState<ColorData[]>([]);
  const [activeColors, setActiveColors] = useState<ColorData[]>([]);
  const [currentVariation, setCurrentVariation] = useState<PaletteVariationType>('original');

  // Modals & Drawers
  const [editingColor, setEditingColor] = useState<ColorData | null>(null);
  const [isAddToneOpen, setIsAddToneOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Saved Palettes
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);

  // Show Toast Helper
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

  // Load saved collections on mount
  useEffect(() => {
    const stored = getSavedPalettes();
    setSavedPalettes(stored);
  }, []);

  // Perform browser-side color extraction whenever image or crop region changes
  useEffect(() => {
    if (!currentImageSrc) {
      setBaseExtractedColors([]);
      setActiveColors([]);
      return;
    }

    let isMounted = true;
    setIsProcessing(true);

    extractPaletteFromImage(currentImageSrc, 6, activeRegion || undefined)
      .then((colors) => {
        if (!isMounted) return;
        setBaseExtractedColors(colors);
        const transformed = generateVariation(colors, currentVariation);
        setActiveColors(transformed);
        setIsProcessing(false);
      })
      .catch((err) => {
        console.error('Extraction error:', err);
        if (isMounted) setIsProcessing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentImageSrc, activeRegion]);

  // Recalculate palette whenever variation changes
  const applyVariation = useCallback(
    (variation: PaletteVariationType) => {
      if (baseExtractedColors.length === 0) return;

      // Keep track of locked colors from activeColors
      const lockedMap = new Map(activeColors.filter((c) => c.locked).map((c) => [c.id, c]));

      const transformed = generateVariation(baseExtractedColors, variation);

      // Merge locked colors
      const merged = transformed.map((c) => {
        if (lockedMap.has(c.id)) {
          return lockedMap.get(c.id)!;
        }
        return c;
      });

      // Preserve manually added tones if they were locked
      const manuallyAdded = activeColors.filter(
        (c) => (c.origin === 'interpolated' || c.origin === 'curated-accent' || c.origin === 'custom') && c.locked
      );
      manuallyAdded.forEach((added) => {
        if (!merged.some((m) => m.id === added.id) && merged.length < 10) {
          merged.push(added);
        }
      });

      setActiveColors(merged);
    },
    [baseExtractedColors, activeColors]
  );

  // Handle switching variation
  const handleSelectVariation = (variation: PaletteVariationType) => {
    setCurrentVariation(variation);
    applyVariation(variation);
    triggerToast(`Interpretation: ${variation.toUpperCase()}`);
  };

  // Image Selection
  const handleImageSelected = (src: string, meta?: { name: string; width: number; height: number }) => {
    setCurrentImageSrc(src);
    setActiveRegion(null);
    setCurrentVariation('original');
    // Clear out previous colors so nothing leaks into the new image's extraction
    setBaseExtractedColors([]);
    setActiveColors([]);
    if (meta?.name) {
      const cleanTitle = meta.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setPaletteTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }
    triggerToast('Loaded new photograph');
  };

  const MAX_PALETTE_SIZE = 10;

  // Eyedropper Pixel Picked: Append sampled color without overwriting existing tones
  const handlePixelPicked = (sampled: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
  }) => {
    // 1. Enforce max palette size of 10 tones
    if (activeColors.length >= MAX_PALETTE_SIZE) {
      triggerToast(`Palette limit reached (${MAX_PALETTE_SIZE} tones). Remove an existing tone to sample more.`);
      return;
    }

    // 2. Check if color already exists in palette
    const existing = activeColors.find(
      (c) => c.hex.toLowerCase() === sampled.hex.toLowerCase()
    );
    if (existing) {
      triggerToast(`${existing.name} (${sampled.hex}) is already in your palette`);
      return;
    }

    const newColor: ColorData = {
      id: 'picked_' + Date.now(),
      hex: sampled.hex,
      rgb: sampled.rgb,
      hsl: sampled.hsl,
      weight: 0.10,
      name: getColorName(sampled.hex),
      locked: false,
      origin: 'extracted',
      sourceNote: 'Exact pixel loupe sample from photo',
    };

    // 3. Preserve ALL existing colors and append the sampled color
    const updated = [...activeColors, newColor];

    // 4. Rebalance weights evenly
    const totalWeight = updated.reduce((sum, c) => sum + (c.weight || 0.1), 0);
    updated.forEach((c) => {
      c.weight = Number(((c.weight || 0.1) / totalWeight).toFixed(2));
    });

    setActiveColors(updated);
    setBaseExtractedColors((prev) => [...prev, newColor]);
    triggerToast(`Added ${newColor.name} (${sampled.hex}) to palette (${updated.length}/${MAX_PALETTE_SIZE})`);
  };

  // Save current palette to localStorage / Visual Journal
  const handleSaveCurrentPalette = () => {
    if (activeColors.length === 0) return;
    const saved = savePaletteToStorage(
      paletteTitle,
      activeColors,
      currentVariation,
      currentImageSrc || undefined,
      undefined,
      'Field Study Studio',
      'Captured from photograph. Preserving authentic chromatic atmosphere.',
      'monograph'
    );
    setSavedPalettes((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    triggerToast(`Recorded "${paletteTitle}" to Visual Journal`);
  };

  // Update an existing saved palette in the Visual Journal
  const handleUpdateSavedPalette = (updatedPalette: SavedPalette) => {
    const updatedList = updateSavedPalette(updatedPalette);
    setSavedPalettes(updatedList);
    triggerToast(`Updated "${updatedPalette.title}" in Visual Journal`);
  };

  // Delete saved palette
  const handleDeleteSavedPalette = (id: string) => {
    const updated = deleteSavedPalette(id);
    setSavedPalettes(updated);
    triggerToast('Study removed from journal');
  };

  // Load a saved palette into studio
  const handleLoadSavedPalette = (palette: SavedPalette) => {
    setActiveColors(palette.colors);
    setBaseExtractedColors(palette.colors);
    setCurrentVariation(palette.variation);
    setPaletteTitle(palette.title);
    if (palette.imageThumbnail) {
      setCurrentImageSrc(palette.imageThumbnail);
    }
    setActiveTab('workspace');
    triggerToast(`Loaded "${palette.title}"`);
  };

  // Reset to original extraction
  const handleResetOriginal = () => {
    setCurrentVariation('original');
    setActiveColors(
      baseExtractedColors.map((c) => ({
        ...c,
        locked: false,
        origin: 'extracted',
        sourceNote: '1:1 faithful photographic extraction',
      }))
    );
    triggerToast('Reset to 1:1 original extraction');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917] selection:bg-stone-300">
      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Editorial Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedPalettes.length}
        onOpenExport={() => setIsExportOpen(true)}
        onSavePalette={handleSaveCurrentPalette}
        colorCount={activeColors.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 md:py-10">
        {/* VIEW 1: STUDIO WORKSPACE */}
        {activeTab === 'workspace' && (
          <div className="space-y-10">
            {/* Studio Workspace Title & Curatorial Subheading */}
            <div className="border-b border-[#E7E0D6] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 text-xs uppercase tracking-widest font-mono text-stone-500">
                  <span>Photo · Palette Laboratory</span>
                  <span>·</span>
                  <span>Fidelity & Atmospheric Studies</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-stone-900 text-balance">
                  {paletteTitle}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('previews')}
                  className="px-4 py-2 rounded text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:border-stone-500 transition-colors cursor-pointer shadow-xs"
                >
                  View Design Previews →
                </button>
              </div>
            </div>

            {/* Asymmetric Studio Columns: Image Exploration & Palette Studio */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Image Area */}
              <div className="lg:col-span-5 space-y-4">
                <ImageUploader
                  currentImageSrc={currentImageSrc}
                  onImageSelected={handleImageSelected}
                  onRegionSelected={(r) => setActiveRegion(r)}
                  onPixelPicked={handlePixelPicked}
                  activeRegion={activeRegion}
                  isProcessing={isProcessing}
                  paletteCount={activeColors.length}
                  maxPaletteSize={MAX_PALETTE_SIZE}
                />
              </div>

              {/* Right Column: Extracted Palette & Nuanced Variations */}
              <div className="lg:col-span-7 space-y-8">
                {/* 1. Palette Variations Selector */}
                {baseExtractedColors.length > 0 && (
                  <PaletteVariations
                    baseColors={baseExtractedColors}
                    currentVariation={currentVariation}
                    onSelectVariation={handleSelectVariation}
                    onResetAdjustments={handleResetOriginal}
                  />
                )}

                {/* 2. Interactive Color Palette Display */}
                {activeColors.length > 0 && (
                  <PaletteDisplay
                    colors={activeColors}
                    onColorChange={setActiveColors}
                    onEditColor={(c) => setEditingColor(c)}
                    onOpenAddTone={() => setIsAddToneOpen(true)}
                    onResetOriginal={handleResetOriginal}
                    onCopyText={(text, label) => triggerToast(label)}
                  />
                )}
              </div>
            </div>

            {/* Bottom Quick Context Teaser */}
            {activeColors.length > 0 && (
              <div className="border-t border-[#E7E0D6] pt-8">
                <div className="bg-[#F5F1EB] rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#E7E0D6]">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-serif text-lg font-semibold text-stone-900">
                      Observe colors in production layouts & check contrast
                    </h4>
                    <p className="text-xs text-stone-600 font-sans max-w-xl">
                      Review how this exact chromatic story functions in digital publication interfaces, architectural posters, and verified WCAG contrast matrices.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('previews')}
                    className="px-4 py-2 bg-[#1C1917] text-white rounded text-xs font-semibold hover:bg-stone-800 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    Open Design Previews
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DESIGN PREVIEWS */}
        {activeTab === 'previews' && (
          <DesignPreviews
            colors={activeColors}
            imageSrc={currentImageSrc}
            paletteTitle={paletteTitle}
          />
        )}

        {/* VIEW 3: SAVED COLLECTIONS & VISUAL MEMORY JOURNAL */}
        {activeTab === 'collections' && (
          <SavedCollectionsView
            savedPalettes={savedPalettes}
            onLoadPalette={handleLoadSavedPalette}
            onUpdatePalette={handleUpdateSavedPalette}
            onDeletePalette={handleDeleteSavedPalette}
            onCopyText={(text, label) => triggerToast(label)}
            onSwitchToWorkspace={() => setActiveTab('workspace')}
            onSaveCurrentToJournal={handleSaveCurrentPalette}
          />
        )}
      </main>

      {/* Color Editor Modal */}
      <ColorEditorModal
        color={editingColor}
        isOpen={!!editingColor}
        onClose={() => setEditingColor(null)}
        onSave={(updated) => {
          setActiveColors(
            activeColors.map((c) =>
              c.id === updated.id ? { ...updated, origin: 'custom' } : c
            )
          );
          triggerToast(`Updated ${updated.name}`);
        }}
      />

      {/* Add Tone Modal (Image-Grounded Candidates) */}
      <AddToneModal
        isOpen={isAddToneOpen}
        onClose={() => setIsAddToneOpen(false)}
        onAddColor={(newColor) => {
          if (activeColors.length < 10) {
            setActiveColors([...activeColors, newColor]);
            triggerToast(`Added ${newColor.name} (${newColor.hex})`);
          }
        }}
        existingColors={activeColors}
        currentImageSrc={currentImageSrc}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        colors={activeColors}
        paletteTitle={paletteTitle}
        imageSrc={currentImageSrc}
        onCopyText={(text, label) => triggerToast(label)}
      />

      {/* Understated Editorial Footer */}
      <footer className="border-t border-[#E7E0D6] py-6 bg-[#FBF9F5]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <div className="flex items-center gap-3">
            <span>Photo to Color Palette Studio</span>
            <span>·</span>
            <span>Fidelity-Preserving Photographic Quantization</span>
          </div>
          <div>
            <span>Local Archival Persistence · ISO & WCAG Contrast Validated</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
