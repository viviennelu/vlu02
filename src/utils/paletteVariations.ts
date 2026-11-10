import {
  ColorData,
  PaletteVariationType,
  PaletteAdjustmentParams,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
  getColorName,
} from './colorUtils';

/**
 * Meaningful, perceptible adjustment parameters for each preset variation.
 * Preserves the original image's chromatic identity while providing
 * distinct, visually evident transformations.
 */
export const PRESET_ADJUSTMENTS: Record<PaletteVariationType, PaletteAdjustmentParams> = {
  original: {
    fidelity: 100,
    saturation: 0,
    temperature: 0,
    lightness: 0,
  },
  soft: {
    fidelity: 60,
    saturation: -55, // Decisively subdued, gentle matte finish
    temperature: 0,
    lightness: 14,   // Lifted midtones, softer airy contrast
  },
  vibrant: {
    fidelity: 50,
    saturation: 55,  // Decisively the most saturated, expressive, and energetic option
    temperature: 0,
    lightness: 2,
  },
  atmospheric: {
    fidelity: 60,
    saturation: -6,  // Rich, velvety pigment
    temperature: 0,
    lightness: -35,  // Deep, moody chiaroscuro darkness
  },
  warm: {
    fidelity: 65,
    saturation: 4,   // Soft, restrained sunlit glow (never hyper-saturated)
    temperature: 30, // Golden-hour sunlit warmth
    lightness: 8,    // Luminous sunlit brightness
  },
  cool: {
    fidelity: 65,
    saturation: -10, // Crisp, serene chill
    temperature: -30,// Twilight oceanic slate cast
    lightness: -2,
  },
};

/**
 * Transforms an extracted palette into genuine, distinct color variations
 * while anchoring each tone in the photograph's native gamut.
 * Adapts transformations thoughtfully to the source colors' baseline.
 */
/**
 * Transforms an extracted palette into genuine, distinct color variations
 * while anchoring each tone in the photograph's native gamut.
 * Adapts transformations thoughtfully to the source image's baseline temperature and chroma.
 */
export function generateVariation(
  basePalette: ColorData[],
  variation: PaletteVariationType,
  customParams?: Partial<PaletteAdjustmentParams>
): ColorData[] {
  // If pure original with zero modifications
  if (variation === 'original') {
    return basePalette.map((c) => ({
      ...c,
      origin: c.origin || 'extracted',
      sourceNote: c.sourceNote || 'Faithful photographic extraction',
    }));
  }

  // Assess base palette inherent color temperature and saturation bias
  // to avoid over-correcting images that are already strongly warm or cool.
  const baselineStats = basePalette.reduce(
    (acc, c) => {
      // Relative warmth index: (R - B) normalized
      const warmth = (c.rgb.r - c.rgb.b) / Math.max(1, c.rgb.r + c.rgb.g + c.rgb.b);
      return {
        totalWarmth: acc.totalWarmth + warmth,
        totalSat: acc.totalSat + c.hsl.s,
        totalLum: acc.totalLum + c.hsl.l,
      };
    },
    { totalWarmth: 0, totalSat: 0, totalLum: 0 }
  );

  const count = Math.max(1, basePalette.length);
  const avgWarmth = baselineStats.totalWarmth / count;
  const avgSat = baselineStats.totalSat / count;

  return basePalette.map((color, index) => {
    // If user locked this swatch, preserve it untouched
    if (color.locked) {
      return { ...color };
    }

    let h = color.hsl.h;
    let s = color.hsl.s;
    let l = color.hsl.l;
    let rgb = { ...color.rgb };

    if (variation === 'soft') {
      // 1. Soft & Muted: subdued, less saturated, matte editorial finish
      // Noticeably reduce saturation while lifting shadow levels for chalky, tactile paper quality
      const satScale = avgSat > 40 ? 0.40 : 0.55;
      s = Math.max(6, Math.round(color.hsl.s * satScale));
      l = Math.min(88, Math.max(22, Math.round(color.hsl.l * 0.80 + 14)));
      rgb = hslToRgb(h, s, l);
    } else if (variation === 'vibrant') {
      // 2. Vibrant: genuinely the most saturated, expressive, and energetic option in the studio
      // Decisively boost saturation so it stands out distinctly as peak chroma
      if (color.hsl.s >= 16) {
        s = Math.min(98, Math.max(color.hsl.s + 26, Math.round(color.hsl.s * 1.55)));
      } else {
        s = Math.min(52, Math.round(color.hsl.s * 1.45 + 14));
      }
      // Expand micro-contrast to bring out vivid brilliance
      l = color.hsl.l >= 50
        ? Math.min(88, Math.round(color.hsl.l * 1.05))
        : Math.max(14, Math.round(color.hsl.l * 0.93));
      rgb = hslToRgb(h, s, l);
    } else if (variation === 'atmospheric') {
      // 3. Atmospheric: deep, moodier tonal character, rich chiaroscuro shadows
      l = Math.max(8, Math.min(72, Math.round(color.hsl.l * 0.62 - 3)));
      // Keep rich velvety pigment density without becoming electric
      s = Math.min(76, Math.max(10, Math.round(color.hsl.s * 0.92)));
      rgb = hslToRgb(h, s, l);
    } else if (variation === 'warm') {
      // 4. Warm Light: authentic photographic golden-hour sunlit warmth
      // Key principle: Warm Light emphasizes sunlit warmth, brightness, and softness,
      // and is strictly kept softer and less saturated than Vibrant (s <= 68).
      // Instead of an unnatural global hue-pull that distorts blues and greens,
      // apply photographic white balance warming in RGB space adapted to baseline warmth.
      const warmFactor = avgWarmth > 0.18 ? 0.09 : avgWarmth < -0.10 ? 0.22 : 0.15;
      const warmedR = Math.min(255, Math.round(color.rgb.r * (1 + warmFactor * 1.05) + warmFactor * 18));
      const warmedG = Math.min(255, Math.round(color.rgb.g * (1 + warmFactor * 0.55) + warmFactor * 8));
      const warmedB = Math.max(0, Math.round(color.rgb.b * (1 - warmFactor * 0.75)));

      const warmHsl = rgbToHsl(warmedR, warmedG, warmedB);
      h = warmHsl.h;

      // Radiant sunlit brightness lift
      l = Math.min(92, Math.max(20, Math.round(warmHsl.l * 0.94 + 8)));

      // Soft, restrained sunlit saturation — strictly moderate (never exceeds Vibrant)
      s = Math.min(68, Math.max(12, Math.round(warmHsl.s * 1.05 + 2)));
      rgb = hslToRgb(h, s, l);
    } else if (variation === 'cool') {
      // 5. Cool Twilight: crisp twilight oceanic slate chill with serene clarity
      // Key principle: photographic twilight ambient cast without destroying hue identity.
      const coolFactor = avgWarmth < -0.18 ? 0.08 : avgWarmth > 0.12 ? 0.20 : 0.14;
      const cooledR = Math.max(0, Math.round(color.rgb.r * (1 - coolFactor * 0.70)));
      const cooledG = Math.min(255, Math.round(color.rgb.g * (1 + coolFactor * 0.35) + coolFactor * 4));
      const cooledB = Math.min(255, Math.round(color.rgb.b * (1 + coolFactor * 1.05) + coolFactor * 16));

      const coolHsl = rgbToHsl(cooledR, cooledG, cooledB);
      h = coolHsl.h;

      // Crisp twilight clarity with gentle shadow depth
      l = Math.min(88, Math.max(12, Math.round(coolHsl.l * 0.96 - 2)));
      // Restrained, serene saturation (strictly moderate)
      s = Math.min(66, Math.max(8, Math.round(coolHsl.s * 0.92)));
      rgb = hslToRgb(h, s, l);
    }

    const finalHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const finalHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const name = getColorName(finalHex);

    return {
      id: color.id || `color-${index}`,
      hex: finalHex,
      rgb,
      hsl: finalHsl,
      weight: color.weight,
      name,
      locked: false,
      origin: color.origin || 'extracted',
      sourceNote: `Grounded in photo with ${VARIATION_META[variation]?.label || 'custom'} grading`,
    };
  });
}

/**
 * Editorial descriptions for each variation direction
 */
export const VARIATION_META: Record<
  PaletteVariationType,
  { label: string; description: string; note: string }
> = {
  original: {
    label: 'Original',
    description: 'Faithful source spectrum',
    note: 'Dominant chromatic frequencies sampled directly from the photograph',
  },
  soft: {
    label: 'Soft & Muted',
    description: 'Subdued, gentle, matte tones',
    note: 'Reduced saturation with lifted midtones for an airy editorial feel',
  },
  vibrant: {
    label: 'Vibrant',
    description: 'Elevated chroma & intensity',
    note: 'Heightened saturation amplifying the natural vibrancy of the image',
  },
  atmospheric: {
    label: 'Atmospheric',
    description: 'Deep, moody, shadow-rich',
    note: 'Subdued brightness and deepened tones for cinematic tonal contrast',
  },
  warm: {
    label: 'Warm Light',
    description: 'Sunlit amber & golden glow',
    note: 'Photographic golden-hour temperature shift across native tones',
  },
  cool: {
    label: 'Cool Twilight',
    description: 'Twilight oceanic chill',
    note: 'Photographic twilight temperature shift across native tones',
  },
};
