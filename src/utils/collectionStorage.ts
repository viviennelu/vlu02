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
  journalLayout?: 'monograph' | 'polaroid' | 'field-notes',
  originalColors?: ColorData[]
): SavedPalette | null {
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
    originalColors: originalColors?.map((c) => ({ ...c })),
  };

  const updated = [newPalette, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to write palette to localStorage', e);
    return null;
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

// ---------------------------------------------------------------------------
// Working session: the palette currently open in the studio, so it survives
// a page refresh. Kept separate from the journal.
// ---------------------------------------------------------------------------

const SESSION_KEY = 'photo_palette_studio_session_v1';

export interface StudioSession {
  title: string;
  imageSrc: string | null;
  variation: PaletteVariationType;
  baseColors: ColorData[];
  activeColors: ColorData[];
  /** The untouched extraction, for Reset. Absent in sessions saved before it existed. */
  originalColors?: ColorData[];
}

export function loadStudioSession(): StudioSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioSession;
    return Array.isArray(parsed.activeColors) && Array.isArray(parsed.baseColors) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns false if the payload didn't fit (caller may retry with a smaller image). */
export function saveStudioSession(session: StudioSession): boolean {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}
