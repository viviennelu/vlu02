import { ColorData, SavedPalette } from './colorUtils';

export function generateCssVariables(colors: ColorData[], paletteName: string = 'palette'): string {
  const slug = paletteName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const lines = [
    `/* Extracted via Photo to Color Palette Studio */`,
    `/* Palette: ${paletteName} */`,
    `:root {`,
  ];

  colors.forEach((c, idx) => {
    const varName = `--${slug}-${idx + 1}`;
    const cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    lines.push(`  ${varName}: ${c.hex}; /* ${c.name} · rgb(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}) */`);
    lines.push(`  --color-${cleanName}: ${c.hex};`);
  });

  lines.push(`}`);
  return lines.join('\n');
}

export function generateTailwindConfig(colors: ColorData[], paletteName: string = 'studio'): string {
  const entries = colors.map((c, idx) => {
    const key = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `      '${key || `tone${idx + 1}`}': '${c.hex}', // ${c.name}`;
  });

  return `// Tailwind CSS configuration snippet
module.exports = {
  theme: {
    extend: {
      colors: {
        '${paletteName.toLowerCase().replace(/[^a-z0-9]/g, '')}': {
${entries.join('\n')}
        }
      }
    }
  }
};`;
}

export function generateJsonExport(colors: ColorData[], paletteName: string): string {
  const data = {
    title: paletteName,
    generator: 'Photo-to-Color Palette Studio',
    timestamp: new Date().toISOString(),
    swatches: colors.map((c) => ({
      name: c.name,
      hex: c.hex,
      rgb: c.rgb,
      hsl: c.hsl,
      prominence: c.weight,
      origin: c.origin,
    })),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Downloads a high-resolution, beautifully formatted PNG swatch sheet
 */
export async function downloadPngSwatchCard(
  colors: ColorData[],
  title: string = 'Color Study',
  imageSrc?: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1600;
  const height = 1000;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background - archival ivory
  ctx.fillStyle = '#FBF9F5';
  ctx.fillRect(0, 0, width, height);

  // Border frame
  ctx.strokeStyle = '#E7E0D6';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // Header typography
  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 36px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(title.toUpperCase(), 70, 110);

  ctx.fillStyle = '#78716C';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText(
    `CHROMATIC LABORATORY SPECIMEN · ${colors.length} EXTRACTED TONES · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}`,
    70,
    145
  );

  // Divider
  ctx.strokeStyle = '#E7E0D6';
  ctx.beginPath();
  ctx.moveTo(70, 170);
  ctx.lineTo(width - 70, 170);
  ctx.stroke();

  // Swatches Area
  const startY = 220;
  const swatchHeight = 480;
  const totalW = width - 140;
  const gap = 16;
  const count = colors.length;
  const swatchWidth = (totalW - gap * (count - 1)) / count;

  colors.forEach((c, i) => {
    const x = 70 + i * (swatchWidth + gap);

    // Color bar
    ctx.fillStyle = c.hex;
    ctx.fillRect(x, startY, swatchWidth, swatchHeight);

    // Subtle inner border for pale swatches
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(x, startY, swatchWidth, swatchHeight);

    // Swatch metadata below
    const textY = startY + swatchHeight + 40;

    // Color name
    ctx.fillStyle = '#1C1917';
    ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(c.name, x, textY);

    // HEX
    ctx.fillStyle = '#44403C';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.fillText(c.hex, x, textY + 28);

    // RGB & Prominence
    ctx.fillStyle = '#78716C';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`RGB ${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}`, x, textY + 50);
    ctx.fillText(`HSL ${c.hsl.h}° · ${c.hsl.s}% · ${c.hsl.l}%`, x, textY + 70);
    ctx.fillText(`WEIGHT ${Math.round(c.weight * 100)}%`, x, textY + 90);
  });

  // Footer notes
  ctx.fillStyle = '#A8A29E';
  ctx.font = 'italic 14px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Natural light chromatic quantization · Designed for editorial & visual systems', 70, height - 70);

  // Trigger download
  const link = document.createElement('a');
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-palette.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Downloads a high-resolution Visual Memory Journal Card (PNG)
 */
export async function downloadVisualJournalCard(
  entry: SavedPalette,
  imageSrc?: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1400;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Archival neutral paper canvas
  ctx.fillStyle = '#FBF9F5';
  ctx.fillRect(0, 0, width, height);

  // Refined double border frame
  ctx.strokeStyle = '#E7E0D6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 50, width - 100, height - 100);

  // Journal Title & Place
  ctx.fillStyle = '#1C1917';
  ctx.font = 'bold 38px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(entry.title.toUpperCase(), 80, 120);

  const metaString = [
    entry.location ? entry.location.toUpperCase() : null,
    new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase(),
    'VISUAL MEMORY JOURNAL ENTRY',
  ].filter(Boolean).join(' · ');

  ctx.fillStyle = '#78716C';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText(metaString, 80, 155);

  // Divider
  ctx.strokeStyle = '#E7E0D6';
  ctx.beginPath();
  ctx.moveTo(80, 180);
  ctx.lineTo(width - 80, 180);
  ctx.stroke();

  // Swatches Area (Prominent)
  const swatchY = 220;
  const swatchH = 260;
  const totalW = width - 160;
  const count = entry.colors.length;
  const swatchW = totalW / count;

  entry.colors.forEach((c, idx) => {
    const x = 80 + idx * swatchW;
    ctx.fillStyle = c.hex;
    ctx.fillRect(x, swatchY, swatchW, swatchH);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(x, swatchY, swatchW, swatchH);

    // Text labels beneath swatches
    ctx.fillStyle = '#1C1917';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(c.name, x + 8, swatchY + swatchH + 30);

    ctx.fillStyle = '#57534E';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(c.hex, x + 8, swatchY + swatchH + 52);

    ctx.fillStyle = '#8C827A';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(c.weight * 100)}% Weight`, x + 8, swatchY + swatchH + 72);
  });

  // Personal Reflection / Notes Block
  const notesY = swatchY + swatchH + 120;
  ctx.fillStyle = '#F5F1EB';
  ctx.fillRect(80, notesY, width - 160, 240);
  ctx.strokeStyle = '#E7E0D6';
  ctx.strokeRect(80, notesY, width - 160, 240);

  ctx.fillStyle = '#1C1917';
  ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
  const reflection = entry.notes || 'A record of atmosphere, temperature, and light captured through natural color quantization.';
  ctx.fillText(`"${reflection}"`, 110, notesY + 60);

  ctx.fillStyle = '#78716C';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('— Chromatic Memory Archive', 110, notesY + 110);

  // Footer accession stamp
  ctx.fillStyle = '#A8A29E';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(`CATALOGUE ARCHIVE // ${entry.id.toUpperCase()}`, 80, height - 70);

  // Download
  const link = document.createElement('a');
  link.download = `${entry.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-journal-card.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
