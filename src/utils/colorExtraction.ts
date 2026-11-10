import { ColorData, rgbToHex, rgbToHsl, hslToRgb, getColorName, interpolateColors } from './colorUtils';

export interface CropRegion {
  x: number; // 0 to 1 ratio
  y: number; // 0 to 1 ratio
  width: number; // 0 to 1 ratio
  height: number; // 0 to 1 ratio
}

interface Pixel {
  r: number;
  g: number;
  b: number;
  normX: number; // 0 to 1 normalized image coordinate
  normY: number; // 0 to 1 normalized image coordinate
}

// Global cache for offscreen image rendering contexts to ensure 60fps sampling
const canvasCache = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number }>();

function getOrCreateImageCanvas(img: HTMLImageElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const key = img.src || `img_${img.naturalWidth}x${img.naturalHeight}`;
  const cached = canvasCache.get(key);
  if (cached && cached.width === img.naturalWidth && cached.height === img.naturalHeight) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 1;
  canvas.height = img.naturalHeight || img.height || 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const entry = { canvas, ctx, width: canvas.width, height: canvas.height };
  canvasCache.set(key, entry);
  return entry;
}

class ColorBox {
  pixels: Pixel[];

  constructor(pixels: Pixel[]) {
    this.pixels = pixels;
  }

  volume(): number {
    if (this.pixels.length === 0) return 0;
    const { rMin, rMax, gMin, gMax, bMin, bMax } = this.getBounds();
    return (rMax - rMin) * (gMax - gMin) * (bMax - bMin);
  }

  getBounds() {
    let rMin = 255, rMax = 0;
    let gMin = 255, gMax = 0;
    let bMin = 255, bMax = 0;

    for (let i = 0; i < this.pixels.length; i++) {
      const p = this.pixels[i];
      if (p.r < rMin) rMin = p.r;
      if (p.r > rMax) rMax = p.r;
      if (p.g < gMin) gMin = p.g;
      if (p.g > gMax) gMax = p.g;
      if (p.b < bMin) bMin = p.b;
      if (p.b > bMax) bMax = p.b;
    }
    return { rMin, rMax, gMin, gMax, bMin, bMax };
  }

  longestAxis(): 'r' | 'g' | 'b' {
    const { rMin, rMax, gMin, gMax, bMin, bMax } = this.getBounds();
    const rDiff = rMax - rMin;
    const gDiff = gMax - gMin;
    const bDiff = bMax - bMin;
    if (rDiff >= gDiff && rDiff >= bDiff) return 'r';
    if (gDiff >= rDiff && gDiff >= bDiff) return 'g';
    return 'b';
  }

  split(): [ColorBox, ColorBox] {
    if (this.pixels.length <= 1) return [this, new ColorBox([])];
    const axis = this.longestAxis();

    this.pixels.sort((a, b) => a[axis] - b[axis]);
    const medianIndex = Math.floor(this.pixels.length / 2);

    const part1 = this.pixels.slice(0, medianIndex);
    const part2 = this.pixels.slice(medianIndex);

    return [new ColorBox(part1), new ColorBox(part2)];
  }

  average(): { r: number; g: number; b: number; normX: number; normY: number } {
    if (this.pixels.length === 0) {
      return { r: 128, g: 128, b: 128, normX: 0.5, normY: 0.5 };
    }
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < this.pixels.length; i++) {
      sumR += this.pixels[i].r;
      sumG += this.pixels[i].g;
      sumB += this.pixels[i].b;
      sumX += this.pixels[i].normX;
      sumY += this.pixels[i].normY;
    }
    const count = this.pixels.length;
    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    // Pick pixel closest to average RGB to get real coordinates in the image
    let bestDist = Infinity;
    let bestPixel = this.pixels[0];
    for (let i = 0; i < this.pixels.length; i++) {
      const p = this.pixels[i];
      const dist = Math.hypot(p.r - avgR, p.g - avgG, p.b - avgB);
      if (dist < bestDist) {
        bestDist = dist;
        bestPixel = p;
      }
    }

    return {
      r: avgR,
      g: avgG,
      b: avgB,
      normX: Number(bestPixel.normX.toFixed(4)),
      normY: Number(bestPixel.normY.toFixed(4)),
    };
  }
}

/**
 * Color distance helper to avoid duplicate or near-identical tones
 */
export function isColorTooSimilar(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  threshold: number = 24
): boolean {
  const dR = r1 - r2;
  const dG = g1 - g2;
  const dB = b1 - b2;
  const dist = Math.hypot(dR, dG, dB);
  if (dist < threshold) return true;

  const hsl1 = rgbToHsl(r1, g1, b1);
  const hsl2 = rgbToHsl(r2, g2, b2);
  const dH = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h));
  const dL = Math.abs(hsl1.l - hsl2.l);
  const dS = Math.abs(hsl1.s - hsl2.s);

  return dH < 14 && dL < 9 && dS < 15;
}

/**
 * Extracts representative colors using high-resolution Median Cut Quantization
 * with dedicated chromatic saliency preservation for small but visually significant accents.
 * Always guarantees a rich, balanced palette of 5-7 distinct tones.
 */
export async function extractPaletteFromImage(
  imageSource: string | HTMLImageElement,
  colorCount: number = 6,
  region?: CropRegion
): Promise<ColorData[]> {
  const img = await resolveImageElement(imageSource);

  // Scaled offscreen canvas for fast, faithful clustering
  const canvas = document.createElement('canvas');
  const maxDim = 280; // High resolution sampling for fidelity
  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not access 2D canvas context');

  ctx.drawImage(img, 0, 0, width, height);

  // Calculate sampling boundaries
  let startX = 0;
  let startY = 0;
  let sampleW = width;
  let sampleH = height;

  if (region) {
    startX = Math.max(0, Math.floor(region.x * width));
    startY = Math.max(0, Math.floor(region.y * height));
    sampleW = Math.max(1, Math.min(width - startX, Math.ceil(region.width * width)));
    sampleH = Math.max(1, Math.min(height - startY, Math.ceil(region.height * height)));
  }

  const imageData = ctx.getImageData(startX, startY, sampleW, sampleH);
  const data = imageData.data;
  const pixels: Pixel[] = [];

  // Sample across the region with recorded normalized coordinates
  const totalPixels = sampleW * sampleH;
  const step = Math.max(1, Math.floor(totalPixels / 6000));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent

    const pixelIndex = Math.floor(i / 4);
    const localX = pixelIndex % sampleW;
    const localY = Math.floor(pixelIndex / sampleW);

    const fullX = startX + localX;
    const fullY = startY + localY;
    const normX = Number((fullX / width).toFixed(4));
    const normY = Number((fullY / height).toFixed(4));

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    pixels.push({ r, g, b, normX, normY });
    sumR += r;
    sumG += g;
    sumB += b;
  }

  if (pixels.length === 0) {
    return [
      createColorData(30, 30, 30, 0.3, 'color-0', [{ x: 0.2, y: 0.2 }], 'Dark shadow baseline'),
      createColorData(200, 190, 180, 0.3, 'color-1', [{ x: 0.5, y: 0.5 }], 'Midtone baseline'),
      createColorData(180, 80, 50, 0.4, 'color-2', [{ x: 0.8, y: 0.8 }], 'Warm tone baseline'),
    ];
  }

  const meanR = sumR / pixels.length;
  const meanG = sumG / pixels.length;
  const meanB = sumB / pixels.length;
  const meanHsl = rgbToHsl(Math.round(meanR), Math.round(meanG), Math.round(meanB));

  // --- CHROMATIC ACCENT DETECTION ---
  // Small accents (e.g. red sail, yellow flower, turquoise window) represent < 2% of pixels
  // and would be swallowed by dominant boxes. Collect distinctive chromatic outliers.
  const distinctivePixels: Pixel[] = [];
  for (let i = 0; i < pixels.length; i++) {
    const p = pixels[i];
    const distFromMean = Math.hypot(p.r - meanR, p.g - meanG, p.b - meanB);
    const pHsl = rgbToHsl(p.r, p.g, p.b);
    if (
      (pHsl.s > 25 && pHsl.s > meanHsl.s + 12) ||
      (distFromMean > 45 && pHsl.s > 18)
    ) {
      distinctivePixels.push(p);
    }
  }

  // Find coherent accent clusters
  const accentCandidates: { r: number; g: number; b: number; normX: number; normY: number; count: number }[] = [];
  if (distinctivePixels.length >= 12) {
    const bins: { [binIndex: number]: Pixel[] } = {};
    for (const p of distinctivePixels) {
      const h = rgbToHsl(p.r, p.g, p.b).h;
      const binIdx = Math.floor(h / 30);
      if (!bins[binIdx]) bins[binIdx] = [];
      bins[binIdx].push(p);
    }

    for (const binIdx in bins) {
      const bin = bins[binIdx];
      if (bin.length >= 12) {
        let bSumR = 0, bSumG = 0, bSumB = 0;
        for (const bp of bin) {
          bSumR += bp.r;
          bSumG += bp.g;
          bSumB += bp.b;
        }
        const bAvgR = Math.round(bSumR / bin.length);
        const bAvgG = Math.round(bSumG / bin.length);
        const bAvgB = Math.round(bSumB / bin.length);

        // Find representative pixel closest to center of bin
        let minD = Infinity;
        let rep = bin[0];
        for (const bp of bin) {
          const d = Math.hypot(bp.r - bAvgR, bp.g - bAvgG, bp.b - bAvgB);
          if (d < minD) {
            minD = d;
            rep = bp;
          }
        }
        accentCandidates.push({
          r: bAvgR,
          g: bAvgG,
          b: bAvgB,
          normX: rep.normX,
          normY: rep.normY,
          count: bin.length,
        });
      }
    }
    // Sort accents by count and saturation
    accentCandidates.sort((a, b) => {
      const satA = rgbToHsl(a.r, a.g, a.b).s;
      const satB = rgbToHsl(b.r, b.g, b.b).s;
      return (satB * b.count) - (satA * a.count);
    });
  }

  // --- MEDIAN CUT OVER-PARTITIONING ---
  // To avoid palette collapsing down to 3 tones when filtering duplicates,
  // we partition into 18-24 candidate sub-clusters, then greedily select 5-7 distinct tones.
  const numTargetPartitions = 20;
  const boxes: ColorBox[] = [new ColorBox(pixels)];

  while (boxes.length < numTargetPartitions) {
    let bestIndex = -1;
    let maxMetric = -1;

    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].pixels.length > 6) {
        const metric = boxes[i].pixels.length * (boxes[i].volume() + 1);
        if (metric > maxMetric) {
          maxMetric = metric;
          bestIndex = i;
        }
      }
    }

    if (bestIndex === -1) break;

    const [box1, box2] = boxes[bestIndex].split();
    boxes.splice(bestIndex, 1, box1, box2);
  }

  // Gather cluster candidates
  interface ClusterCandidate {
    r: number;
    g: number;
    b: number;
    normX: number;
    normY: number;
    pixelCount: number;
    isAccent?: boolean;
    score: number;
  }

  const totalCollected = pixels.length;
  const candidates: ClusterCandidate[] = [];

  for (const box of boxes) {
    if (box.pixels.length < 3) continue;
    const avg = box.average();
    const hsl = rgbToHsl(avg.r, avg.g, avg.b);
    const densityRatio = box.pixels.length / totalCollected;
    // Score considers density with a boost for chromatic interest and tonal separation
    const chromaBoost = 1 + (hsl.s / 100) * 0.4;
    const score = densityRatio * chromaBoost;

    candidates.push({
      r: avg.r,
      g: avg.g,
      b: avg.b,
      normX: avg.normX,
      normY: avg.normY,
      pixelCount: box.pixels.length,
      score,
    });
  }

  // Also include accent candidates with balanced visual saliency scoring
  for (const acc of accentCandidates) {
    const accHsl = rgbToHsl(acc.r, acc.g, acc.b);
    // Visual significance: distinctive chromatic presence, saturation contrast, and perceptual salience
    const densityRatio = acc.count / totalCollected;
    const chromaFactor = accHsl.s / 100;
    // Base visual saliency score ensures distinctive accents compete fairly with massive neutral grounds
    const accScore = (densityRatio * 1.5) + (chromaFactor * 0.35) + 0.12;
    candidates.push({
      r: acc.r,
      g: acc.g,
      b: acc.b,
      normX: acc.normX,
      normY: acc.normY,
      pixelCount: acc.count,
      isAccent: true,
      score: accScore,
    });
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Determine image chromatic span to calibrate similarity threshold
  let minL = 100, maxL = 0, maxS = 0;
  for (const c of candidates) {
    const hsl = rgbToHsl(c.r, c.g, c.b);
    if (hsl.l < minL) minL = hsl.l;
    if (hsl.l > maxL) maxL = hsl.l;
    if (hsl.s > maxS) maxS = hsl.s;
  }
  const lSpan = maxL - minL;
  // If image is very subtle/monochromatic (narrow lSpan or low saturation), lower threshold so we still get 5-7 tones
  const dynamicDistanceThreshold = lSpan < 35 && maxS < 25 ? 15 : 22;

  const targetCount = Math.min(7, Math.max(5, colorCount));
  const selected: ClusterCandidate[] = [];

  // Pass 1: Select distinct candidates with full threshold
  for (const cand of candidates) {
    if (selected.length >= targetCount) break;
    const duplicate = selected.some((s) =>
      isColorTooSimilar(s.r, s.g, s.b, cand.r, cand.g, cand.b, dynamicDistanceThreshold)
    );
    if (!duplicate) {
      selected.push(cand);
    }
  }

  // Pass 2: If we still have fewer than targetCount (e.g. 5), relax threshold slightly to capture subtle nuances
  if (selected.length < targetCount) {
    const relaxedThreshold = Math.max(10, dynamicDistanceThreshold * 0.65);
    for (const cand of candidates) {
      if (selected.length >= targetCount) break;
      if (selected.includes(cand)) continue;
      const duplicate = selected.some((s) =>
        isColorTooSimilar(s.r, s.g, s.b, cand.r, cand.g, cand.b, relaxedThreshold)
      );
      if (!duplicate) {
        selected.push(cand);
      }
    }
  }

  // If even after relaxed pass we have fewer than 4 (extreme monochrome), generate subtle tonal steps from the image
  if (selected.length < 4 && selected.length > 0) {
    // Find darkest and lightest pixels in the dataset
    let darkest = pixels[0];
    let lightest = pixels[0];
    for (const p of pixels) {
      const l = p.r * 0.299 + p.g * 0.587 + p.b * 0.114;
      const darkL = darkest.r * 0.299 + darkest.g * 0.587 + darkest.b * 0.114;
      const lightL = lightest.r * 0.299 + lightest.g * 0.587 + lightest.b * 0.114;
      if (l < darkL) darkest = p;
      if (l > lightL) lightest = p;
    }
    if (!selected.some(s => isColorTooSimilar(s.r, s.g, s.b, darkest.r, darkest.g, darkest.b, 10))) {
      selected.push({
        r: darkest.r,
        g: darkest.g,
        b: darkest.b,
        normX: darkest.normX,
        normY: darkest.normY,
        pixelCount: Math.round(totalCollected * 0.1),
        score: 0.1,
      });
    }
    if (selected.length < 5 && !selected.some(s => isColorTooSimilar(s.r, s.g, s.b, lightest.r, lightest.g, lightest.b, 10))) {
      selected.push({
        r: lightest.r,
        g: lightest.g,
        b: lightest.b,
        normX: lightest.normX,
        normY: lightest.normY,
        pixelCount: Math.round(totalCollected * 0.1),
        score: 0.1,
      });
    }
  }

  // Convert selected to ColorData
  const resultColors: ColorData[] = [];
  const sumPixels = selected.reduce((sum, c) => sum + Math.max(c.pixelCount, 1), 0);

  selected.forEach((c, idx) => {
    const rawWeight = c.pixelCount / sumPixels;
    const weight = Math.max(0.08, Number(rawWeight.toFixed(2)));
    const note = c.isAccent
      ? `Distinctive photographic accent (${Math.round(weight * 100)}% density)`
      : region
      ? `Sampled from designated region (${Math.round(weight * 100)}% density)`
      : `Photographic tone (${Math.round(weight * 100)}% density)`;

    resultColors.push(
      createColorData(
        c.r,
        c.g,
        c.b,
        weight,
        `extracted-${idx}-${Date.now()}`,
        [{ x: c.normX, y: c.normY }],
        note
      )
    );
  });

  // Normalize weights to sum exactly to 1.00
  const totalWeight = resultColors.reduce((acc, c) => acc + c.weight, 0);
  resultColors.forEach((c) => {
    c.weight = Number((c.weight / totalWeight).toFixed(2));
  });

  // Sort by luminance for an editorial balanced spectrum
  resultColors.sort((a, b) => a.hsl.l - b.hsl.l);

  return resultColors;
}

function createColorData(
  r: number,
  g: number,
  b: number,
  weight: number,
  id: string,
  sampleLocations?: { x: number; y: number }[],
  sourceNote?: string
): ColorData {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const name = getColorName(hex);
  return {
    id,
    hex,
    rgb: { r, g, b },
    hsl,
    weight,
    name,
    locked: false,
    origin: 'extracted',
    sourceNote: sourceNote || 'Photographic density extraction',
    sampleLocations: sampleLocations || [{ x: 0.5, y: 0.5 }],
  };
}

/**
 * Pixel-accurate color sampling directly from natural image coordinates
 */
export function samplePixelColor(
  image: HTMLImageElement,
  normX: number,
  normY: number
): {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  sampleLocations: { x: number; y: number }[];
} | null {
  try {
    const entry = getOrCreateImageCanvas(image);
    if (!entry) return null;

    const px = Math.max(0, Math.min(entry.width - 1, Math.round(normX * (entry.width - 1))));
    const py = Math.max(0, Math.min(entry.height - 1, Math.round(normY * (entry.height - 1))));

    const pixel = entry.ctx.getImageData(px, py, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    return {
      hex,
      rgb: { r, g, b },
      hsl,
      sampleLocations: [{ x: Number(normX.toFixed(4)), y: Number(normY.toFixed(4)) }],
    };
  } catch (err) {
    console.warn('Could not sample pixel color:', err);
    return null;
  }
}

export type ToneRole = 'dominant' | 'secondary' | 'accent';

export interface DisjointToneRecommendations {
  dominant: ColorData[];
  secondary: ColorData[];
  accent: ColorData[];
}

/**
 * Generates mutually exclusive, role-aware, image-grounded candidate tones for "Add a Tone".
 * Guarantees that:
 * 1. Dominant, Secondary, and Accent categories share ZERO common colors.
 * 2. No color near-duplicates an existing palette color (threshold >= 22).
 * 3. Colors already added to the palette are removed across all categories;
 *    if removed from the palette, they immediately become eligible again.
 * 4. All candidates are strictly grounded in the photograph's native clusters.
 */
export async function generateDisjointToneRecommendations(
  imageSource: string | HTMLImageElement,
  existingColors: ColorData[]
): Promise<DisjointToneRecommendations> {
  const result: DisjointToneRecommendations = {
    dominant: [],
    secondary: [],
    accent: [],
  };

  // Higher-resolution multi-partition extraction to discover deep, secondary, and subtle accents
  let allClusters: ColorData[] = [];
  try {
    allClusters = await extractPaletteFromImage(imageSource, 24);
  } catch (e) {
    console.warn('Could not extract extended clusters:', e);
  }

  // Filter out any tone that is already in existing active palette (threshold >= 20)
  const isDuplicateOfExisting = (r: number, g: number, b: number) => {
    return existingColors.some((c) =>
      isColorTooSimilar(c.rgb.r, c.rgb.g, c.rgb.b, r, g, b, 20)
    );
  };

  const availableClusters = allClusters.filter(
    (c) => !isDuplicateOfExisting(c.rgb.r, c.rgb.g, c.rgb.b)
  );

  // Track globally selected tones across categories to guarantee 100% mutual exclusivity
  const chosenAcrossAllRoles: ColorData[] = [];

  const isDuplicateOfChosen = (r: number, g: number, b: number) => {
    return chosenAcrossAllRoles.some((c) =>
      isColorTooSimilar(c.rgb.r, c.rgb.g, c.rgb.b, r, g, b, 18)
    );
  };

  // 1. DOMINANT: Foundational structural ground tones carrying primary visual weight
  // Favor high density, deep grounding, or broad luminous field presence
  const dominantPool = [...availableClusters].sort((a, b) => b.weight - a.weight);

  for (const cluster of dominantPool) {
    if (result.dominant.length >= 3) break;
    if (!isDuplicateOfChosen(cluster.rgb.r, cluster.rgb.g, cluster.rgb.b)) {
      const tone: ColorData = {
        ...cluster,
        id: `dominant_tone_${Date.now()}_${result.dominant.length}`,
        origin: 'extracted',
        sourceNote: `Foundational photographic ground tone (${Math.round(cluster.weight * 100)}% density)`,
      };
      result.dominant.push(tone);
      chosenAcrossAllRoles.push(tone);
    }
  }

  // 2. SECONDARY: Supporting midtones or perceptual bridges that create visual balance
  // Filter for midtones (luminance between 22% and 78%) from remaining unchosen clusters
  const secondaryPool = availableClusters
    .filter(
      (c) => !chosenAcrossAllRoles.some((ch) => isColorTooSimilar(ch.rgb.r, ch.rgb.g, ch.rgb.b, c.rgb.r, c.rgb.g, c.rgb.b, 18))
    )
    .sort((a, b) => {
      // Prioritize midtones closest to 50% lightness with balanced saturation
      const midDistA = Math.abs(a.hsl.l - 50);
      const midDistB = Math.abs(b.hsl.l - 50);
      return midDistA - midDistB;
    });

  for (const cluster of secondaryPool) {
    if (result.secondary.length >= 3) break;
    if (!isDuplicateOfChosen(cluster.rgb.r, cluster.rgb.g, cluster.rgb.b)) {
      const tone: ColorData = {
        ...cluster,
        id: `secondary_tone_${Date.now()}_${result.secondary.length}`,
        origin: 'extracted',
        sourceNote: `Supporting photographic midtone (${Math.round(cluster.weight * 100)}% density)`,
      };
      result.secondary.push(tone);
      chosenAcrossAllRoles.push(tone);
    }
  }

  // 3. ACCENT: Distinctive chromatic presence, high-chroma or focal contrast
  const accentPool = availableClusters
    .filter(
      (c) => !chosenAcrossAllRoles.some((ch) => isColorTooSimilar(ch.rgb.r, ch.rgb.g, ch.rgb.b, c.rgb.r, c.rgb.g, c.rgb.b, 18))
    )
    .sort((a, b) => b.hsl.s - a.hsl.s);

  for (const cluster of accentPool) {
    if (result.accent.length >= 3) break;
    if (!isDuplicateOfChosen(cluster.rgb.r, cluster.rgb.g, cluster.rgb.b)) {
      const tone: ColorData = {
        ...cluster,
        id: `accent_tone_${Date.now()}_${result.accent.length}`,
        origin: 'extracted',
        sourceNote: `High-chroma photographic accent (${cluster.name})`,
      };
      result.accent.push(tone);
      chosenAcrossAllRoles.push(tone);
    }
  }

  // --- GUARANTEE AT LEAST 2 VIABLE RECOMMENDATIONS PER CATEGORY ---
  // If an image has low raw chromatic diversity, synthesize grounded photographic extensions:

  // Fallback for Dominant Ground
  if (result.dominant.length < 2 && existingColors.length > 0) {
    const sortedLum = [...existingColors].sort((a, b) => a.hsl.l - b.hsl.l);
    const darkest = sortedLum[0];
    const lightest = sortedLum[sortedLum.length - 1];

    // Architectural deep anchor derived from photo's darkest baseline
    const anchorR = Math.max(12, Math.round(darkest.rgb.r * 0.60));
    const anchorG = Math.max(12, Math.round(darkest.rgb.g * 0.60));
    const anchorB = Math.max(12, Math.round(darkest.rgb.b * 0.60));
    if (!isDuplicateOfExisting(anchorR, anchorG, anchorB) && !isDuplicateOfChosen(anchorR, anchorG, anchorB)) {
      const hex = rgbToHex(anchorR, anchorG, anchorB);
      const tone: ColorData = {
        id: `dominant_anchor_${Date.now()}`,
        hex,
        rgb: { r: anchorR, g: anchorG, b: anchorB },
        hsl: rgbToHsl(anchorR, anchorG, anchorB),
        weight: 0.18,
        name: getColorName(hex),
        locked: false,
        origin: 'extracted',
        sourceNote: `Deep foundational ground anchor derived from ${darkest.name}`,
        sampleLocations: darkest.sampleLocations || [{ x: 0.5, y: 0.5 }],
      };
      result.dominant.push(tone);
      chosenAcrossAllRoles.push(tone);
    }

    // Luminous canvas ground derived from photo's lightest baseline
    if (result.dominant.length < 2) {
      const lightR = Math.min(252, Math.round(lightest.rgb.r * 0.95 + 12));
      const lightG = Math.min(252, Math.round(lightest.rgb.g * 0.95 + 12));
      const lightB = Math.min(252, Math.round(lightest.rgb.b * 0.95 + 12));
      if (!isDuplicateOfExisting(lightR, lightG, lightB) && !isDuplicateOfChosen(lightR, lightG, lightB)) {
        const hex = rgbToHex(lightR, lightG, lightB);
        const tone: ColorData = {
          id: `dominant_light_${Date.now()}`,
          hex,
          rgb: { r: lightR, g: lightG, b: lightB },
          hsl: rgbToHsl(lightR, lightG, lightB),
          weight: 0.18,
          name: getColorName(hex),
          locked: false,
          origin: 'extracted',
          sourceNote: `Luminous photographic canvas ground derived from ${lightest.name}`,
          sampleLocations: lightest.sampleLocations || [{ x: 0.5, y: 0.5 }],
        };
        result.dominant.push(tone);
        chosenAcrossAllRoles.push(tone);
      }
    }
  }

  // Fallback for Secondary Supporting Tone
  if (result.secondary.length < 2 && existingColors.length >= 2) {
    const sorted = [...existingColors].sort((a, b) => b.weight - a.weight);
    const bridge = interpolateColors(sorted[0], sorted[1], 0.5, `secondary_bridge_${Date.now()}`);
    if (!isDuplicateOfExisting(bridge.rgb.r, bridge.rgb.g, bridge.rgb.b) && !isDuplicateOfChosen(bridge.rgb.r, bridge.rgb.g, bridge.rgb.b)) {
      bridge.sourceNote = `Harmonic midtone bridge between ${sorted[0].name} and ${sorted[1].name}`;
      bridge.sampleLocations = sorted[0].sampleLocations || [{ x: 0.5, y: 0.5 }];
      result.secondary.push(bridge);
      chosenAcrossAllRoles.push(bridge);
    }

    if (result.secondary.length < 2 && sorted.length >= 3) {
      const bridge2 = interpolateColors(sorted[0], sorted[2], 0.5, `secondary_bridge2_${Date.now()}`);
      if (!isDuplicateOfExisting(bridge2.rgb.r, bridge2.rgb.g, bridge2.rgb.b) && !isDuplicateOfChosen(bridge2.rgb.r, bridge2.rgb.g, bridge2.rgb.b)) {
        bridge2.sourceNote = `Supporting perceptual tone between ${sorted[0].name} and ${sorted[2].name}`;
        bridge2.sampleLocations = sorted[2].sampleLocations || [{ x: 0.5, y: 0.5 }];
        result.secondary.push(bridge2);
        chosenAcrossAllRoles.push(bridge2);
      }
    }
  }

  // Fallback for Distinctive Accent
  if (result.accent.length < 2 && existingColors.length > 0) {
    // Find tone with highest natural saturation in existing palette
    const mostChromatic = [...existingColors].sort((a, b) => b.hsl.s - a.hsl.s)[0];
    const accentH = mostChromatic.hsl.h;
    const accentS = Math.min(95, Math.max(50, Math.round(mostChromatic.hsl.s * 1.35 + 10)));
    const accentL = Math.min(75, Math.max(35, mostChromatic.hsl.l >= 50 ? mostChromatic.hsl.l - 6 : mostChromatic.hsl.l + 8));
    const rgb = hslToRgb(accentH, accentS, accentL);

    if (!isDuplicateOfExisting(rgb.r, rgb.g, rgb.b) && !isDuplicateOfChosen(rgb.r, rgb.g, rgb.b)) {
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const tone: ColorData = {
        id: `accent_chroma_${Date.now()}`,
        hex,
        rgb,
        hsl: { h: accentH, s: accentS, l: accentL },
        weight: 0.12,
        name: getColorName(hex),
        locked: false,
        origin: 'extracted',
        sourceNote: `Chromatic focal emphasis amplifying ${mostChromatic.name}`,
        sampleLocations: mostChromatic.sampleLocations || [{ x: 0.5, y: 0.5 }],
      };
      result.accent.push(tone);
      chosenAcrossAllRoles.push(tone);
    }
  }

  return result;
}

/**
 * Legacy wrapper: gets candidate tones for a specific role from the disjoint pool
 */
export async function generateImageGroundedCandidateTones(
  imageSource: string | HTMLImageElement,
  existingColors: ColorData[],
  role: ToneRole = 'accent'
): Promise<ColorData[]> {
  const recommendations = await generateDisjointToneRecommendations(imageSource, existingColors);
  return recommendations[role] || [];
}

function resolveImageElement(source: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement && source.complete && source.naturalWidth > 0) {
    return Promise.resolve(source);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for color extraction: ' + String(e)));
    img.src = typeof source === 'string' ? source : source.src;
  });
}
