import { SavedPalette, ColorData, PaletteVariationType, PaletteAdjustmentParams } from './colorUtils';

const STORAGE_KEY = 'photo_palette_studio_saved_palettes_v1';

export function getSavedPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read saved palettes from localStorage', e);
    return [];
  }
}

export function savePaletteToStorage(
  title: string,
  colors: ColorData[],
  variation: PaletteVariationType,
  imageThumbnail?: string,
  adjustments?: PaletteAdjustmentParams,
  location?: string,
  notes?: string,
  journalLayout?: 'monograph' | 'polaroid' | 'field-notes'
): SavedPalette {
  const existing = getSavedPalettes();
  const newPalette: SavedPalette = {
    id: 'palette_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: title.trim() || 'Untitled Visual Memory',
    createdAt: Date.now(),
    imageThumbnail,
    variation,
    adjustments,
    colors: colors.map((c) => ({ ...c })),
    location: location || '',
    notes: notes || '',
    journalLayout: journalLayout || 'monograph',
  };

  const updated = [newPalette, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to write palette to localStorage', e);
  }
  return newPalette;
}

export function updateSavedPalette(updatedPalette: SavedPalette): SavedPalette[] {
  const existing = getSavedPalettes();
  const updated = existing.map((p) => (p.id === updatedPalette.id ? updatedPalette : p));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update palette in localStorage', e);
  }
  return updated;
}

export function deleteSavedPalette(id: string): SavedPalette[] {
  const existing = getSavedPalettes();
  const updated = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete palette from localStorage', e);
  }
  return updated;
}
