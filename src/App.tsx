import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PaletteDisplay } from './components/PaletteDisplay';
import { PaletteVariations } from './components/PaletteVariations';
import { ColorEditorModal } from './components/ColorEditorModal';
import { AddToneModal } from './components/AddToneModal';
import { DesignPreviews } from './components/DesignPreviews';
import { ExportModal } from './components/ExportModal';
import { SavedCollectionsView } from './components/SavedCollectionsView';
import { Toast, ToastTone } from './components/Toast';
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
  loadStudioSession,
  saveStudioSession,
} from './utils/collectionStorage';
import { createDownscaledCopy } from './utils/imageDecoding';

const MAX_PALETTE_SIZE = 10;

/** Normalise weights so they sum to ~1, without mutating the inputs. */
function rebalanceWeights(colors: ColorData[]): ColorData[] {
  const total = colors.reduce((sum, c) => sum + (c.weight || 0.1), 0);
  return colors.map((c) => ({ ...c, weight: Number(((c.weight || 0.1) / total).toFixed(2)) }));
}

/**
 * Keep the untransformed base palette in step with the active palette's
 * membership and order (removals, reorders, additions), so switching
 * interpretation or resetting never resurrects removed tones or drops added ones.
 */
function syncBaseWithActive(base: ColorData[], active: ColorData[]): ColorData[] {
  const byId = new Map(base.map((c) => [c.id, c]));
  return active.map((c) => {
    const b = byId.get(c.id);
    return b ? b : { ...c, locked: false };
  });
}

export default function App() {
  // Restore the last working session (palette + photo) on refresh
  const [restored] = useState(loadStudioSession);

  // Navigation
  const [activeTab, setActiveTab] = useState<'workspace' | 'previews' | 'collections'>('workspace');

  // Image State
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(restored?.imageSrc ?? null);
  const [paletteTitle, setPaletteTitle] = useState<string>(restored?.title ?? 'Untitled palette');
  const [activeRegion, setActiveRegion] = useState<CropRegion | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Palette State. `baseExtractedColors` is the untransformed palette (extracted +
  // user-added tones); `activeColors` is what the user sees, saves and exports.
  const [baseExtractedColors, setBaseExtractedColors] = useState<ColorData[]>(restored?.baseColors ?? []);
  const [activeColors, setActiveColors] = useState<ColorData[]>(restored?.activeColors ?? []);
  // Untouched extraction (colors + order) that Reset returns to
  const [originalColors, setOriginalColors] = useState<ColorData[]>(
    restored?.originalColors ?? restored?.baseColors ?? []
  );
  const [currentVariation, setCurrentVariation] = useState<PaletteVariationType>(restored?.variation ?? 'original');

  // When an image arrives together with its palette (restored session or a
  // reopened journal entry), don't overwrite that palette with a fresh extraction.
  const skipExtractionForSrc = useRef<string | null>(
    restored?.imageSrc && restored.activeColors.length ? restored.imageSrc : null
  );
  const baseRef = useRef(baseExtractedColors);
  baseRef.current = baseExtractedColors;
  const variationRef = useRef(currentVariation);
  variationRef.current = currentVariation;

  // Modals & Drawers
  const [editingColor, setEditingColor] = useState<ColorData | null>(null);
  const [isAddToneOpen, setIsAddToneOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);

  // Saved Palettes
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);

  const triggerToast = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ message, tone });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, tone === 'error' ? 4200 : 2400);
  }, []);

  useEffect(() => {
    setSavedPalettes(getSavedPalettes());
  }, []);

  // Browser-side color extraction whenever image or crop region changes
  useEffect(() => {
    if (!currentImageSrc) return;
    if (!activeRegion && skipExtractionForSrc.current === currentImageSrc) return;
    skipExtractionForSrc.current = null;

    let isMounted = true;
    setIsProcessing(true);

    extractPaletteFromImage(currentImageSrc, 6, activeRegion || undefined)
      .then((colors) => {
        if (!isMounted) return;
        // Tones the user added survive a region re-extraction of the same photo.
        // (A new photo clears the base first, so nothing carries over.)
        const carried = baseRef.current.filter((c) => c.userAdded);
        const nextBase = [...colors, ...carried].slice(0, MAX_PALETTE_SIZE);
        setOriginalColors(colors);
        setBaseExtractedColors(nextBase);
        setActiveColors(generateVariation(nextBase, variationRef.current));
        setIsProcessing(false);
      })
      .catch((err) => {
        console.error('Extraction error:', err);
        if (!isMounted) return;
        setIsProcessing(false);
        triggerToast("Couldn't read colors from this photo", 'error');
      });

    return () => {
      isMounted = false;
    };
  }, [currentImageSrc, activeRegion, triggerToast]);

  // Persist the working session (debounced). Large photos fall back to a
  // 2048px copy so the session still fits in localStorage.
  const persistedImage = useRef<{ src: string; copy: string } | null>(null);
  useEffect(() => {
    if (isProcessing) return;
    const timer = setTimeout(async () => {
      const session = {
        title: paletteTitle,
        imageSrc: currentImageSrc,
        variation: currentVariation,
        baseColors: baseExtractedColors,
        originalColors,
        activeColors,
      };
      if (persistedImage.current?.src === currentImageSrc) {
        if (saveStudioSession({ ...session, imageSrc: persistedImage.current.copy })) return;
      } else if (saveStudioSession(session)) {
        return;
      }
      if (!currentImageSrc) return;
      try {
        const copy = await createDownscaledCopy(currentImageSrc, 2048, 0.9);
        persistedImage.current = { src: currentImageSrc, copy };
        saveStudioSession({ ...session, imageSrc: copy });
      } catch {
        // Not fatal: the session just won't survive a refresh.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [paletteTitle, currentImageSrc, currentVariation, baseExtractedColors, activeColors, originalColors, isProcessing]);

  const applyVariation = useCallback(
    (variation: PaletteVariationType) => {
      if (baseExtractedColors.length === 0) return;
      const lockedMap = new Map(activeColors.filter((c) => c.locked).map((c) => [c.id, c]));
      const transformed = generateVariation(baseExtractedColors, variation);
      setActiveColors(transformed.map((c) => lockedMap.get(c.id) ?? c));
    },
    [baseExtractedColors, activeColors]
  );

  const handleSelectVariation = (variation: PaletteVariationType) => {
    setCurrentVariation(variation);
    applyVariation(variation);
  };

  // Reorder / remove / lock / shuffle from the palette display
  const handlePaletteChange = (next: ColorData[]) => {
    setActiveColors(next);
    setBaseExtractedColors((prev) => syncBaseWithActive(prev, next));
  };

  // Image Selection
  const handleImageSelected = (src: string, meta?: { name: string; width: number; height: number }) => {
    skipExtractionForSrc.current = null;
    setCurrentImageSrc(src);
    setActiveRegion(null);
    setCurrentVariation('original');
    setBaseExtractedColors([]);
    setOriginalColors([]);
    setActiveColors([]);
    if (meta?.name) {
      const cleanTitle = meta.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setPaletteTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }
  };

  /**
   * Single entry point for adding a tone (Add Tone modal or eyedropper).
   * The tone joins both the base and active palettes, so it is saved,
   * exported, and kept when switching interpretation.
   */
  const appendTone = (tone: ColorData): boolean => {
    if (activeColors.length >= MAX_PALETTE_SIZE) {
      triggerToast(`Palette is full (${MAX_PALETTE_SIZE} tones). Remove one to add another.`, 'error');
      return false;
    }
    const existing = activeColors.find((c) => c.hex.toLowerCase() === tone.hex.toLowerCase());
    if (existing) {
      triggerToast(`${existing.name} is already in the palette`);
      return false;
    }
    const added: ColorData = {
      ...tone,
      id: `added_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      weight: tone.weight || 0.1,
      locked: false,
      userAdded: true,
    };
    setActiveColors((prev) => rebalanceWeights([...prev, added]));
    setBaseExtractedColors((prev) => rebalanceWeights([...prev, added]));
    triggerToast(`Added ${added.name} · ${activeColors.length + 1}/${MAX_PALETTE_SIZE}`);
    return true;
  };

  const handlePixelPicked = (sampled: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
  }) => {
    appendTone({
      id: '',
      hex: sampled.hex,
      rgb: sampled.rgb,
      hsl: sampled.hsl,
      weight: 0.1,
      name: getColorName(sampled.hex),
      origin: 'extracted',
      sourceNote: 'Sampled from photo',
    });
  };

  // Save current palette to the Visual Journal
  const handleSaveCurrentPalette = async () => {
    if (activeColors.length === 0) return;
    let thumbnail: string | undefined;
    if (currentImageSrc) {
      try {
        thumbnail = await createDownscaledCopy(currentImageSrc, 1200);
      } catch {
        thumbnail = undefined;
      }
    }
    const saved = savePaletteToStorage(
      paletteTitle,
      activeColors,
      currentVariation,
      thumbnail,
      undefined,
      '',
      '',
      'monograph',
      originalColors
    );
    if (!saved) {
      triggerToast('Journal storage is full. Delete an entry and try again.', 'error');
      return;
    }
    setSavedPalettes((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    triggerToast(`Saved "${saved.title}" to Journal`);
  };

  const handleUpdateSavedPalette = (updatedPalette: SavedPalette) => {
    setSavedPalettes(updateSavedPalette(updatedPalette));
    triggerToast('Journal entry updated');
  };

  const handleDeleteSavedPalette = (id: string) => {
    setSavedPalettes(deleteSavedPalette(id));
    triggerToast('Entry removed');
  };

  // Reopen a saved palette exactly as saved (no re-extraction)
  const handleLoadSavedPalette = (palette: SavedPalette) => {
    const colors = palette.colors.map((c) => ({ ...c }));
    skipExtractionForSrc.current = palette.imageThumbnail ?? null;
    setCurrentImageSrc(palette.imageThumbnail ?? null);
    setActiveRegion(null);
    setActiveColors(colors);
    setBaseExtractedColors(colors.map((c) => ({ ...c, locked: false })));
    // Older entries didn't store the extraction; fall back to the saved palette
    setOriginalColors((palette.originalColors ?? palette.colors).map((c) => ({ ...c })));
    setCurrentVariation(palette.variation);
    setPaletteTitle(palette.title);
    setActiveTab('workspace');
    triggerToast(`Opened "${palette.title}"`);
  };

  // Back to the photo's extracted colors in their extracted order: drops
  // added tones, restores removed ones, undoes edits, locks and reordering.
  const handleResetOriginal = () => {
    const source = originalColors.length > 0 ? originalColors : baseExtractedColors;
    const fresh = source.map((c) => ({ ...c, locked: false }));
    setCurrentVariation('original');
    setBaseExtractedColors(fresh);
    setActiveColors(fresh);
    triggerToast(`Reset to the original ${fresh.length} colors`);
  };

  const hasWork = !!currentImageSrc || activeColors.length > 0;

  return (
    <div className="min-h-screen flex flex-col text-ink selection:bg-stone-300">
      <Toast message={toast?.message ?? null} tone={toast?.tone} />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedPalettes.length}
        onOpenExport={() => setIsExportOpen(true)}
        onSavePalette={handleSaveCurrentPalette}
        colorCount={activeColors.length}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12">
        {activeTab === 'workspace' && !hasWork && (
          <div className="max-w-3xl mx-auto">
            <ImageUploader
              currentImageSrc={null}
              onImageSelected={handleImageSelected}
              onRegionSelected={setActiveRegion}
              onPixelPicked={handlePixelPicked}
              onError={(msg) => triggerToast(msg, 'error')}
              activeRegion={activeRegion}
              isProcessing={isProcessing}
              paletteCount={0}
              maxPaletteSize={MAX_PALETTE_SIZE}
            />
          </div>
        )}

        {activeTab === 'workspace' && hasWork && (
          <div className="space-y-10">
            <input
              aria-label="Palette title"
              value={paletteTitle}
              onChange={(e) => setPaletteTitle(e.target.value)}
              className="letterpress w-full bg-transparent font-serif text-3xl sm:text-5xl font-medium tracking-tight text-ink outline-none rounded-md -mx-1 px-1 hover:bg-black/[0.03] focus:bg-black/[0.03] transition-colors"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-5 lg:sticky lg:top-20">
                <ImageUploader
                  currentImageSrc={currentImageSrc}
                  onImageSelected={handleImageSelected}
                  onRegionSelected={setActiveRegion}
                  onPixelPicked={handlePixelPicked}
                  onError={(msg) => triggerToast(msg, 'error')}
                  activeRegion={activeRegion}
                  isProcessing={isProcessing}
                  paletteCount={activeColors.length}
                  maxPaletteSize={MAX_PALETTE_SIZE}
                />
              </div>

              <div className="lg:col-span-7 space-y-8">
                {baseExtractedColors.length > 0 && (
                  <PaletteVariations
                    baseColors={baseExtractedColors}
                    currentVariation={currentVariation}
                    onSelectVariation={handleSelectVariation}
                    onResetAdjustments={handleResetOriginal}
                  />
                )}

                {activeColors.length > 0 && (
                  <PaletteDisplay
                    colors={activeColors}
                    onColorChange={handlePaletteChange}
                    onEditColor={(c) => setEditingColor(c)}
                    onOpenAddTone={() => setIsAddToneOpen(true)}
                    onResetOriginal={handleResetOriginal}
                    onCopyText={(text, label) => triggerToast(label)}
                  />
                )}

                {activeColors.length > 0 && (
                  <button
                    onClick={() => setActiveTab('previews')}
                    className="group inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer"
                  >
                    <span className="font-serif italic text-lg">See it in layouts</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'previews' && (
          <DesignPreviews colors={activeColors} imageSrc={currentImageSrc} paletteTitle={paletteTitle} />
        )}

        {activeTab === 'collections' && (
          <SavedCollectionsView
            savedPalettes={savedPalettes}
            onLoadPalette={handleLoadSavedPalette}
            onUpdatePalette={handleUpdateSavedPalette}
            onDeletePalette={handleDeleteSavedPalette}
            onCopyText={(text, label) => triggerToast(label)}
            onSwitchToWorkspace={() => setActiveTab('workspace')}
            onSaveCurrentToJournal={handleSaveCurrentPalette}
            canSaveCurrent={activeColors.length > 0}
          />
        )}
      </main>

      <ColorEditorModal
        color={editingColor}
        isOpen={!!editingColor}
        onClose={() => setEditingColor(null)}
        onSave={(updated) => {
          const edited: ColorData = { ...updated, origin: 'custom' };
          setActiveColors((prev) => prev.map((c) => (c.id === edited.id ? edited : c)));
          // The edit becomes the new source for this tone, so it survives
          // switching interpretation.
          setBaseExtractedColors((prev) =>
            prev.map((c) => (c.id === edited.id ? { ...edited, locked: false } : c))
          );
          triggerToast(`Updated ${updated.name}`);
        }}
      />

      <AddToneModal
        isOpen={isAddToneOpen}
        onClose={() => setIsAddToneOpen(false)}
        onAddColor={appendTone}
        existingColors={activeColors}
        currentImageSrc={currentImageSrc}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        colors={activeColors}
        paletteTitle={paletteTitle}
        imageSrc={currentImageSrc}
        onCopyText={(text, label) => triggerToast(label)}
      />
    </div>
  );
}
