/**
 * Color data types and utility functions
 */

export interface SampleLocation {
  x: number; // 0 to 1 normalized coordinate on the source image
  y: number; // 0 to 1 normalized coordinate on the source image
}

export interface ColorData {
  id: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  weight: number; // 0 to 1 representing prominence
  name: string;
  locked?: boolean;
  origin?: 'extracted' | 'interpolated' | 'curated-accent' | 'custom';
  sourceNote?: string;
  sampleLocations?: SampleLocation[];
}

export type PaletteVariationType =
  | 'original'
  | 'soft'
  | 'vibrant'
  | 'atmospheric'
  | 'warm'
  | 'cool';

export interface PaletteAdjustmentParams {
  fidelity: number;     // 0 (1:1 strict photo) to 100 (full variation effect)
  saturation: number;   // -80% to +80% relative adjustment
  temperature: number;  // -40 (cool) to +40 (warm) relative adjustment
  lightness: number;    // -50% to +50% relative adjustment
}

export type ProportionSystem = 'natural' | 'rule603010' | 'golden' | 'equal';

export interface SavedPalette {
  id: string;
  title: string;
  createdAt: number;
  imageThumbnail?: string;
  variation: PaletteVariationType;
  adjustments?: PaletteAdjustmentParams;
  colors: ColorData[];
  location?: string;
  notes?: string;
  journalLayout?: 'monograph' | 'polaroid' | 'field-notes';
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) * 60;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / delta + 2) * 60;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / delta + 4) * 60;
        break;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;
  const hNorm = ((h % 360) + 360) % 360;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hNorm >= 0 && hNorm < 60) {
    rPrime = c;
    gPrime = x;
    bPrime = 0;
  } else if (hNorm >= 60 && hNorm < 120) {
    rPrime = x;
    gPrime = c;
    bPrime = 0;
  } else if (hNorm >= 120 && hNorm < 180) {
    rPrime = 0;
    gPrime = c;
    bPrime = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    rPrime = 0;
    gPrime = x;
    bPrime = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    rPrime = x;
    gPrime = 0;
    bPrime = c;
  } else {
    rPrime = c;
    gPrime = 0;
    bPrime = x;
  }

  return {
    r: Math.round((rPrime + m) * 255),
    g: Math.round((gPrime + m) * 255),
    b: Math.round((bPrime + m) * 255),
  };
}

export function getLuminance(r: number, g: number, b: number): number {
  const [aR, aG, aB] = [r, g, b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * aR + 0.7152 * aG + 0.0722 * aB;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export interface WcagEvaluation {
  ratio: number;
  aaNormal: boolean; // >= 4.5
  aaLarge: boolean;  // >= 3.0
  aaaNormal: boolean;// >= 7.0
  rating: 'AAA' | 'AA' | 'AA Large' | 'Fail';
}

export function evaluateWcag(hexForeground: string, hexBackground: string): WcagEvaluation {
  const ratio = getContrastRatio(hexForeground, hexBackground);
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const aaaNormal = ratio >= 7.0;

  let rating: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
  if (aaaNormal) rating = 'AAA';
  else if (aaNormal) rating = 'AA';
  else if (aaLarge) rating = 'AA Large';

  return {
    ratio: Number(ratio.toFixed(2)),
    aaNormal,
    aaLarge,
    aaaNormal,
    rating,
  };
}

export function getReadableTextColor(hex: string): '#1C1917' | '#FFFFFF' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1C1917';
  const lum = getLuminance(rgb.r, rgb.g, rgb.b);
  return lum > 0.42 ? '#1C1917' : '#FFFFFF';
}

/**
 * Intelligent UI Design Role Assignment based on real contrast math
 */
export interface DesignRoleAssignments {
  canvas: ColorData;
  surface: ColorData;
  textPrimary: ColorData;
  textSecondary: ColorData;
  accent: ColorData;
  border: ColorData;
  contrastMetrics: {
    textOnCanvas: WcagEvaluation;
    textOnSurface: WcagEvaluation;
    accentContrast: WcagEvaluation;
  };
}

export function assignDesignRoles(colors: ColorData[]): DesignRoleAssignments {
  if (colors.length === 0) {
    const dummy: ColorData = {
      id: 'default',
      hex: '#FBF9F5',
      rgb: { r: 251, g: 249, b: 245 },
      hsl: { h: 40, s: 30, l: 97 },
      weight: 1,
      name: 'Archival Ivory',
      origin: 'extracted',
    };
    return {
      canvas: dummy,
      surface: dummy,
      textPrimary: { ...dummy, hex: '#1C1917', name: 'Smoked Charcoal' },
      textSecondary: { ...dummy, hex: '#78716C', name: 'Limestone Gray' },
      accent: dummy,
      border: dummy,
      contrastMetrics: {
        textOnCanvas: evaluateWcag('#1C1917', '#FBF9F5'),
        textOnSurface: evaluateWcag('#1C1917', '#FBF9F5'),
        accentContrast: evaluateWcag('#1C1917', '#FBF9F5'),
      },
    };
  }

  // Sort by luminance (lightest to darkest)
  const sortedByLum = [...colors].sort((a, b) => b.hsl.l - a.hsl.l);
  const lightest = sortedByLum[0];
  const secondLightest = sortedByLum[Math.min(1, sortedByLum.length - 1)];
  const darkest = sortedByLum[sortedByLum.length - 1];
  const secondDarkest = sortedByLum[Math.max(0, sortedByLum.length - 2)];

  // Default to clean light canvas (or create soft tint if image is very dark)
  let canvas = lightest;
  let surface = secondLightest;
  let textPrimary = darkest;
  let textSecondary = secondDarkest;

  // Find the most expressive/saturated tone for the accent
  const mostSaturated = [...colors].sort((a, b) => b.hsl.s - a.hsl.s)[0];
  let accent = mostSaturated;

  // Validate text-on-canvas contrast: WCAG AA requires at least 4.5:1
  let textOnCanvas = evaluateWcag(textPrimary.hex, canvas.hex);

  // If contrast between darkest and lightest is insufficient
  if (!textOnCanvas.aaLarge && colors.length > 2) {
    for (const bg of sortedByLum) {
      for (const fg of [...sortedByLum].reverse()) {
        const evalRes = evaluateWcag(fg.hex, bg.hex);
        if (evalRes.aaNormal) {
          canvas = bg;
          textPrimary = fg;
          textOnCanvas = evalRes;
          break;
        }
      }
      if (textOnCanvas.aaNormal) break;
    }
  }

  if (surface.id === canvas.id && sortedByLum.length > 1) {
    surface = sortedByLum[1];
  }

  const border = secondDarkest.id !== textPrimary.id ? secondDarkest : surface;

  return {
    canvas,
    surface,
    textPrimary,
    textSecondary,
    accent,
    border,
    contrastMetrics: {
      textOnCanvas,
      textOnSurface: evaluateWcag(textPrimary.hex, surface.hex),
      accentContrast: evaluateWcag(accent.hex, canvas.hex),
    },
  };
}

/**
 * Evaluates the palette and automatically recommends top functional design combinations
 */
export interface RecommendedCombination {
  id: string;
  title: string;
  tagline: string;
  rationale: string;
  roles: DesignRoleAssignments;
  badge: 'AAA Highest Contrast' | 'AA Balanced Editorial' | 'Nocturne Dark' | 'Multi-Tonal Spread';
}

export function generateRecommendedCombinations(colors: ColorData[]): RecommendedCombination[] {
  if (colors.length < 3) return [];

  const sortedByLum = [...colors].sort((a, b) => b.hsl.l - a.hsl.l);
  const lightest = sortedByLum[0];
  const secondLightest = sortedByLum[Math.min(1, sortedByLum.length - 1)];
  const midLight = sortedByLum[Math.min(2, sortedByLum.length - 1)];
  const midDark = sortedByLum[Math.max(0, sortedByLum.length - 3)];
  const secondDarkest = sortedByLum[Math.max(0, sortedByLum.length - 2)];
  const darkest = sortedByLum[sortedByLum.length - 1];

  const sortedBySat = [...colors].sort((a, b) => b.hsl.s - a.hsl.s);
  const primaryAccent = sortedBySat[0];
  const secondaryAccent =
    sortedBySat.find((c) => c.id !== primaryAccent.id && c.id !== darkest.id && c.id !== lightest.id) ||
    sortedBySat[Math.min(1, sortedBySat.length - 1)];
  const tertiaryTone =
    colors.find(
      (c) =>
        c.id !== lightest.id &&
        c.id !== darkest.id &&
        c.id !== primaryAccent.id &&
        c.id !== secondaryAccent.id
    ) || midLight;

  const recommendations: RecommendedCombination[] = [];

  // Helper to ensure textPrimary strictly achieves >= 4.5 contrast with canvas
  const getSafeText = (canvasColor: ColorData, preferredText: ColorData): ColorData => {
    const directContrast = getContrastRatio(preferredText.hex, canvasColor.hex);
    if (directContrast >= 4.5) return preferredText;
    const darkContrast = getContrastRatio(darkest.hex, canvasColor.hex);
    const lightContrast = getContrastRatio(lightest.hex, canvasColor.hex);
    if (Math.max(darkContrast, lightContrast) >= 4.5) {
      return darkContrast >= lightContrast ? darkest : lightest;
    }
    // If the palette's native gamut lacks sufficient contrast, provide a complementary high-contrast ink
    return canvasColor.hsl.l > 50
      ? {
          id: 'ink_obsidian',
          hex: '#141210',
          rgb: { r: 20, g: 18, b: 16 },
          hsl: { h: 30, s: 11, l: 7 },
          weight: 0.2,
          name: 'Obsidian Ink',
          origin: 'custom',
        }
      : {
          id: 'ink_ivory',
          hex: '#FAF8F5',
          rgb: { r: 250, g: 248, b: 245 },
          hsl: { h: 36, s: 33, l: 97 },
          weight: 0.2,
          name: 'Archival Ivory',
          origin: 'custom',
        };
  };

  // Helper to ensure surface provides solid card distinction
  const getSafeSurface = (canvasColor: ColorData, preferredSurface: ColorData, textColor: ColorData): ColorData => {
    // Surface shouldn't be identical to canvas or text
    if (preferredSurface.id !== canvasColor.id && preferredSurface.id !== textColor.id) {
      const textContrast = getContrastRatio(textColor.hex, preferredSurface.hex);
      if (textContrast >= 3.8) return preferredSurface;
    }
    // Fallback: pick another distinct tone from the palette with acceptable text contrast
    const alternative = colors.find(
      (c) => c.id !== canvasColor.id && c.id !== textColor.id && getContrastRatio(textColor.hex, c.hex) >= 3.5
    );
    return alternative || (canvasColor.hsl.l > 50 ? secondLightest : secondDarkest);
  };

  // 1. High-Contrast Editorial (Daylight / Longform Publication)
  let rec1Canvas = lightest;
  if (lightest.hsl.l < 82) {
    const lightR = Math.min(252, Math.round(lightest.rgb.r * 0.90 + 26));
    const lightG = Math.min(252, Math.round(lightest.rgb.g * 0.90 + 26));
    const lightB = Math.min(252, Math.round(lightest.rgb.b * 0.90 + 26));
    const hex = rgbToHex(lightR, lightG, lightB);
    rec1Canvas = {
      id: 'editorial_ground_' + lightest.id,
      hex,
      rgb: { r: lightR, g: lightG, b: lightB },
      hsl: rgbToHsl(lightR, lightG, lightB),
      weight: lightest.weight,
      name: `Luminous Ground (${lightest.name})`,
      origin: 'extracted',
      sourceNote: `Luminous editorial ground derived from ${lightest.name}`,
    };
  }
  const rec1Text = getSafeText(rec1Canvas, darkest);
  const rec1Surface = getSafeSurface(rec1Canvas, secondLightest, rec1Text);
  const rec1Accent = primaryAccent.id !== rec1Canvas.id && primaryAccent.id !== rec1Text.id ? primaryAccent : secondDarkest;
  recommendations.push({
    id: 'rec_high_contrast',
    title: 'High-Contrast Editorial',
    tagline: 'Optimal readability for publications & long-form text',
    rationale: `Crisp ${rec1Canvas.name} background framing deep ${rec1Text.name} typography with ${rec1Accent.name} CTA emphasis for effortless reading.`,
    badge: 'AAA Highest Contrast',
    roles: {
      canvas: rec1Canvas,
      surface: rec1Surface,
      textPrimary: rec1Text,
      textSecondary: secondDarkest,
      accent: rec1Accent,
      border: midDark,
      contrastMetrics: {
        textOnCanvas: evaluateWcag(rec1Text.hex, rec1Canvas.hex),
        textOnSurface: evaluateWcag(rec1Text.hex, rec1Surface.hex),
        accentContrast: evaluateWcag(rec1Accent.hex, rec1Canvas.hex),
      },
    },
  });

  // 2. Nocturne Atmosphere (Cinematic Dark Canvas with Luminous Typography)
  let rec2Canvas = darkest;
  if (darkest.hsl.l > 20) {
    const deepR = Math.max(14, Math.round(darkest.rgb.r * 0.35));
    const deepG = Math.max(14, Math.round(darkest.rgb.g * 0.35));
    const deepB = Math.max(14, Math.round(darkest.rgb.b * 0.35));
    const hex = rgbToHex(deepR, deepG, deepB);
    rec2Canvas = {
      id: 'nocturne_ground_' + darkest.id,
      hex,
      rgb: { r: deepR, g: deepG, b: deepB },
      hsl: rgbToHsl(deepR, deepG, deepB),
      weight: darkest.weight,
      name: `Deep Nocturne (${darkest.name})`,
      origin: 'extracted',
      sourceNote: `Grounded nocturnal backdrop derived from ${darkest.name}`,
    };
  }
  const rec2Text = getSafeText(rec2Canvas, lightest);
  const rec2Surface = getSafeSurface(rec2Canvas, secondDarkest, rec2Text);
  const rec2Accent = primaryAccent.id !== rec2Canvas.id ? primaryAccent : secondaryAccent;
  recommendations.push({
    id: 'rec_nocturne',
    title: 'Nocturne Atmosphere',
    tagline: 'High-impact dark canvas with luminous accent hierarchy',
    rationale: `Cinematic depth using ${rec2Canvas.name} ground, luminous ${rec2Text.name} headlines, and an expressive ${rec2Accent.name} highlight.`,
    badge: 'Nocturne Dark',
    roles: {
      canvas: rec2Canvas,
      surface: rec2Surface,
      textPrimary: rec2Text,
      textSecondary: secondLightest,
      accent: rec2Accent,
      border: midLight,
      contrastMetrics: {
        textOnCanvas: evaluateWcag(rec2Text.hex, rec2Canvas.hex),
        textOnSurface: evaluateWcag(rec2Text.hex, rec2Surface.hex),
        accentContrast: evaluateWcag(rec2Accent.hex, rec2Canvas.hex),
      },
    },
  });

  // 3. Multi-Tonal Magazine Spread (Rich, Layered Palette Utilization)
  const rec3Canvas = secondLightest.id !== lightest.id ? secondLightest : midLight;
  const rec3Text = getSafeText(rec3Canvas, darkest);
  const rec3Surface = getSafeSurface(rec3Canvas, lightest, rec3Text);
  const rec3Accent = secondaryAccent.id !== rec3Canvas.id && secondaryAccent.id !== rec3Text.id ? secondaryAccent : primaryAccent;
  recommendations.push({
    id: 'rec_multi_tonal',
    title: 'Multi-Tonal Magazine Spread',
    tagline: 'Rich multi-layer palette application across cards & visual details',
    rationale: `Harmonizes distinct photographic tones: ${rec3Canvas.name} canvas, pure ${rec3Surface.name} card insets, ${rec3Text.name} body, and ${rec3Accent.name} secondary focal points.`,
    badge: 'Multi-Tonal Spread',
    roles: {
      canvas: rec3Canvas,
      surface: rec3Surface,
      textPrimary: rec3Text,
      textSecondary: midDark,
      accent: rec3Accent,
      border: tertiaryTone,
      contrastMetrics: {
        textOnCanvas: evaluateWcag(rec3Text.hex, rec3Canvas.hex),
        textOnSurface: evaluateWcag(rec3Text.hex, rec3Surface.hex),
        accentContrast: evaluateWcag(rec3Accent.hex, rec3Canvas.hex),
      },
    },
  });

  // 4. Subtle Archival Harmony (Restrained Gallery Monograph)
  const rec4Canvas = midLight.hsl.l > 60 ? midLight : (secondLightest.id !== lightest.id ? secondLightest : lightest);
  const rec4Text = getSafeText(rec4Canvas, darkest);
  const rec4Surface = getSafeSurface(rec4Canvas, lightest, rec4Text);
  const rec4Accent = tertiaryTone.id !== rec4Canvas.id && tertiaryTone.id !== rec4Text.id ? tertiaryTone : primaryAccent;
  recommendations.push({
    id: 'rec_soft_minimal',
    title: 'Subtle Gallery Harmony',
    tagline: 'Restrained, balanced, tactile paper aesthetic',
    rationale: `Subdued ${rec4Canvas.name} background framing tactile ${rec4Surface.name} specimen surfaces with ${rec4Accent.name} understated accents.`,
    badge: 'AA Balanced Editorial',
    roles: {
      canvas: rec4Canvas,
      surface: rec4Surface,
      textPrimary: rec4Text,
      textSecondary: secondDarkest,
      accent: rec4Accent,
      border: midDark,
      contrastMetrics: {
        textOnCanvas: evaluateWcag(rec4Text.hex, rec4Canvas.hex),
        textOnSurface: evaluateWcag(rec4Text.hex, rec4Surface.hex),
        accentContrast: evaluateWcag(rec4Accent.hex, rec4Canvas.hex),
      },
    },
  });

  return recommendations;
}

/**
 * Re-distributes swatch proportions using classic graphic design and mathematical systems
 */
export function applyProportionalSystem(
  colors: ColorData[],
  system: ProportionSystem
): ColorData[] {
  if (colors.length === 0) return colors;

  const updated = [...colors];

  switch (system) {
    case 'rule603010': {
      // 60% dominant (index 0), 30% secondary (index 1), 10% accent (index 2+ shared)
      const remaining = updated.length - 2;
      updated.forEach((c, i) => {
        if (i === 0) c.weight = 0.58;
        else if (i === 1) c.weight = 0.28;
        else if (i === 2 && remaining === 1) c.weight = 0.14;
        else c.weight = Number((0.14 / Math.max(1, remaining)).toFixed(2));
      });
      break;
    }

    case 'golden': {
      // Golden ratio descending powers: 1, 0.618, 0.382, 0.236, ...
      const phi = 0.618;
      const rawWeights = updated.map((_, i) => Math.pow(phi, i));
      const total = rawWeights.reduce((a, b) => a + b, 0);
      updated.forEach((c, i) => {
        c.weight = Number((rawWeights[i] / total).toFixed(2));
      });
      break;
    }

    case 'equal': {
      const eqWeight = Number((1 / updated.length).toFixed(2));
      updated.forEach((c) => {
        c.weight = eqWeight;
      });
      break;
    }

    case 'natural':
    default:
      // Preserves existing weights
      break;
  }

  return updated;
}

/**
 * Computes a harmonious perceptual midpoint tone between two colors
 */
export function interpolateColors(
  c1: ColorData,
  c2: ColorData,
  t: number = 0.5,
  idPrefix: string = 'interpolated'
): ColorData {
  const r = Math.round(c1.rgb.r + (c2.rgb.r - c1.rgb.r) * t);
  const g = Math.round(c1.rgb.g + (c2.rgb.g - c1.rgb.g) * t);
  const b = Math.round(c1.rgb.b + (c2.rgb.b - c1.rgb.b) * t);
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const name = getColorName(hex);

  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    hex,
    rgb: { r, g, b },
    hsl,
    weight: Number(((c1.weight + c2.weight) / 2).toFixed(2)),
    name,
    origin: 'interpolated',
    sourceNote: `Perceptual bridge between ${c1.name} and ${c2.name}`,
    locked: false,
  };
}

/**
 * Curated editorial color name dictionary
 */
const COLOR_NAMES_DICT: { hex: string; name: string }[] = [
  { hex: '#1C1917', name: 'Smoked Charcoal' },
  { hex: '#292524', name: 'Raw Basalt' },
  { hex: '#44403C', name: 'Dark Silt' },
  { hex: '#78716C', name: 'Limestone Gray' },
  { hex: '#A8A29E', name: 'Weathered Concrete' },
  { hex: '#D6D3D1', name: 'Pumice' },
  { hex: '#E7E5E4', name: 'Bone White' },
  { hex: '#F5F5F4', name: 'Chalk Alabaster' },
  { hex: '#FBF9F5', name: 'Archival Ivory' },
  { hex: '#991B1B', name: 'Crimson Lacquer' },
  { hex: '#B91C1C', name: 'Cinnabar' },
  { hex: '#DC2626', name: 'Vermilion' },
  { hex: '#EF4444', name: 'Coral Poppy' },
  { hex: '#9A3412', name: 'Burnt Terracotta' },
  { hex: '#C2410C', name: 'Raw Sienna' },
  { hex: '#EA580C', name: 'Amber Ochre' },
  { hex: '#F97316', name: 'Warm Persimmon' },
  { hex: '#854D0E', name: 'Antique Bronze' },
  { hex: '#A16207', name: 'Raw Ochre' },
  { hex: '#CA8A04', name: 'Goldenrod' },
  { hex: '#EAB308', name: 'Sunlit Saffron' },
  { hex: '#3F6212', name: 'Forest Moss' },
  { hex: '#4D7C0F', name: 'Olive Drab' },
  { hex: '#65A30D', name: 'Spring Lichen' },
  { hex: '#14532D', name: 'Deep Evergreen' },
  { hex: '#166534', name: 'Verdant Forest' },
  { hex: '#15803D', name: 'Monstera Green' },
  { hex: '#047857', name: 'Malachite' },
  { hex: '#0D9488', name: 'Verdigris' },
  { hex: '#14B8A6', name: 'Seafoam Teal' },
  { hex: '#0E7490', name: 'Aegean Blue' },
  { hex: '#0284C7', name: 'Cobalt Horizon' },
  { hex: '#1D4ED8', name: 'Ultramarine' },
  { hex: '#1E3A8A', name: 'Midnight Lapis' },
  { hex: '#4338CA', name: 'Indigo Dye' },
  { hex: '#3730A3', name: 'Deep Ink' },
  { hex: '#6D28D9', name: 'Iris Velvet' },
  { hex: '#7E22CE', name: 'Royal Amethyst' },
  { hex: '#A21CAF', name: 'Wild Plum' },
  { hex: '#BE185D', name: 'Dusty Carmine' },
  { hex: '#E11D48', name: 'Rose Madder' },
  { hex: '#F43F5E', name: 'Faded Carnation' },
  { hex: '#FB7185', name: 'Pale Dusty Rose' },
  { hex: '#FDA4AF', name: 'Blush Silk' },
  { hex: '#FED7AA', name: 'Apricot Vellum' },
  { hex: '#FEF08A', name: 'Primrose Tint' },
  { hex: '#BBF7D0', name: 'Pale Celadon' },
  { hex: '#BAE6FD', name: 'Glacial Cerulean' },
  { hex: '#DDD6FE', name: 'Wisteria Mist' },
  { hex: '#262626', name: 'Obsidian' },
  { hex: '#525252', name: 'Graphite' },
  { hex: '#737373', name: 'Museum Gray' },
  { hex: '#A3A3A3', name: 'Flint' },
  { hex: '#D4D4D4', name: 'Parchment Silver' },
  { hex: '#451A03', name: 'Roasted Umber' },
  { hex: '#713F12', name: 'Raw Chestnut' },
  { hex: '#064E3B', name: 'Juniper Shade' },
  { hex: '#1E293B', name: 'Nordic Slate' },
  { hex: '#0F172A', name: 'Abyssal Navy' },
  { hex: '#334155', name: 'Storm Cobalt' },
];

/**
 * Finds the closest evocative color name based on weighted RGB distance
 */
export function getColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'Tone';

  let minDistance = Infinity;
  let closestName = 'Neutral';

  for (const item of COLOR_NAMES_DICT) {
    const targetRgb = hexToRgb(item.hex);
    if (!targetRgb) continue;

    const rMean = (rgb.r + targetRgb.r) / 2;
    const dR = rgb.r - targetRgb.r;
    const dG = rgb.g - targetRgb.g;
    const dB = rgb.b - targetRgb.b;
    const distance = Math.sqrt(
      (2 + rMean / 256) * dR * dR +
      4 * dG * dG +
      (2 + (255 - rMean) / 256) * dB * dB
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestName = item.name;
    }
  }

  return closestName;
}
