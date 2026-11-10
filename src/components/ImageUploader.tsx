import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Upload,
  Crosshair,
  Crop,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  ImageUp,
} from 'lucide-react';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import { CropRegion, samplePixelColor } from '../utils/colorExtraction';
import { getColorName } from '../utils/colorUtils';
import { ACCEPTED_IMAGE_INPUT, decodeImageFile, ImageDecodeError } from '../utils/imageDecoding';

interface ImageUploaderProps {
  currentImageSrc: string | null;
  onImageSelected: (src: string, meta?: { name: string; width: number; height: number }) => void;
  onRegionSelected: (region: CropRegion | null) => void;
  onPixelPicked: (color: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
  }) => void;
  onError?: (message: string) => void;
  activeRegion: CropRegion | null;
  isProcessing: boolean;
  paletteCount?: number;
  maxPaletteSize?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImageSrc,
  onImageSelected,
  onRegionSelected,
  onPixelPicked,
  onError,
  activeRegion,
  isProcessing,
  paletteCount = 0,
  maxPaletteSize = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [regionSelectActive, setRegionSelectActive] = useState(false);

  // Exact pixel sampling preview state
  const [hoverColor, setHoverColor] = useState<{
    hex: string;
    name: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Region selection state (normalized 0 to 1)
  const [isPointerSelecting, setIsPointerSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pendingRegion, setPendingRegion] = useState<CropRegion | null>(null);

  // Synchronize pendingRegion with activeRegion
  useEffect(() => {
    setPendingRegion(activeRegion);
  }, [activeRegion]);

  // Handle local file drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setIsDecoding(true);
      try {
        const decoded = await decodeImageFile(file);
        onImageSelected(decoded.src, { name: file.name, width: decoded.width, height: decoded.height });
      } catch (err) {
        onError?.(err instanceof ImageDecodeError ? err.message : `Couldn't open "${file.name}".`);
      } finally {
        setIsDecoding(false);
      }
    },
    [onImageSelected, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Allow re-selecting the same file after an error
    e.target.value = '';
  };

  /**
   * Helper: Calculates normalized (0 to 1) coordinates strictly based on the
   * actual displayed image bounding box, eliminating container margin discrepancies.
   */
  const getNormalizedCoordinates = (clientX: number, clientY: number) => {
    if (!imgElementRef.current) return null;
    const rect = imgElementRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, clientY));

    const normX = (clampedX - rect.left) / rect.width;
    const normY = (clampedY - rect.top) / rect.height;

    return {
      normX: Math.max(0, Math.min(1, normX)),
      normY: Math.max(0, Math.min(1, normY)),
      relativeX: clampedX - rect.left,
      relativeY: clampedY - rect.top,
      rectWidth: rect.width,
      rectHeight: rect.height,
    };
  };

  // Pointer interactions over the image overlay
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent native drag or text selection
    e.preventDefault();

    if (!regionSelectActive) return;

    const coords = getNormalizedCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPointerSelecting(true);
    setSelectionStart({ x: coords.normX, y: coords.normY });
    setSelectionCurrent({ x: coords.normX, y: coords.normY });
    setPendingRegion(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const coords = getNormalizedCoordinates(e.clientX, e.clientY);
    if (!coords || !imgElementRef.current) return;

    // 1. Eyedropper Live Sampling
    if (eyedropperActive) {
      const sampled = samplePixelColor(imgElementRef.current, coords.normX, coords.normY);
      if (sampled) {
        setHoverColor({
          hex: sampled.hex,
          name: getColorName(sampled.hex),
          screenX: coords.relativeX,
          screenY: coords.relativeY,
        });
      }
    }

    // 2. Region Selection in progress
    if (regionSelectActive && isPointerSelecting && selectionStart) {
      setSelectionCurrent({ x: coords.normX, y: coords.normY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (regionSelectActive && isPointerSelecting && selectionStart && selectionCurrent) {
      setIsPointerSelecting(false);
      const minX = Math.min(selectionStart.x, selectionCurrent.x);
      const minY = Math.min(selectionStart.y, selectionCurrent.y);
      const width = Math.abs(selectionCurrent.x - selectionStart.x);
      const height = Math.abs(selectionCurrent.y - selectionStart.y);

      // Only acknowledge regions larger than 3% in both dimensions
      if (width > 0.03 && height > 0.03) {
        const region: CropRegion = {
          x: Number(minX.toFixed(4)),
          y: Number(minY.toFixed(4)),
          width: Number(width.toFixed(4)),
          height: Number(height.toFixed(4)),
        };
        setPendingRegion(region);
      } else {
        setPendingRegion(null);
      }
      setSelectionStart(null);
      setSelectionCurrent(null);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (eyedropperActive && imgElementRef.current) {
      const coords = getNormalizedCoordinates(e.clientX, e.clientY);
      if (coords) {
        const sampled = samplePixelColor(imgElementRef.current, coords.normX, coords.normY);
        if (sampled) {
          onPixelPicked(sampled);
        }
      }
    }
  };

  const applySelectedRegion = () => {
    if (pendingRegion) {
      onRegionSelected(pendingRegion);
    }
  };

  const clearSelectedRegion = () => {
    setPendingRegion(null);
    setSelectionStart(null);
    setSelectionCurrent(null);
    onRegionSelected(null);
  };

  // Compute live selection box bounds during drag or confirmed region
  let boxStyle: React.CSSProperties | null = null;
  if (isPointerSelecting && selectionStart && selectionCurrent) {
    const left = Math.min(selectionStart.x, selectionCurrent.x) * 100;
    const top = Math.min(selectionStart.y, selectionCurrent.y) * 100;
    const width = Math.abs(selectionCurrent.x - selectionStart.x) * 100;
    const height = Math.abs(selectionCurrent.y - selectionStart.y) * 100;
    boxStyle = { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
  } else if (pendingRegion) {
    boxStyle = {
      left: `${pendingRegion.x * 100}%`,
      top: `${pendingRegion.y * 100}%`,
      width: `${pendingRegion.width * 100}%`,
      height: `${pendingRegion.height * 100}%`,
    };
  }

  const loadSample = (sample: (typeof SAMPLE_IMAGES)[number]) =>
    onImageSelected(sample.src, { name: sample.title, width: 1200, height: 800 });

  const paletteFull = paletteCount >= maxPaletteSize;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_INPUT}
        onChange={handleFileChange}
        className="hidden"
      />

      {!currentImageSrc ? (
        /* Empty state: uploading your own photo is the primary path */
        <div className="space-y-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isDecoding && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`debossed relative rounded-[20px] px-6 py-16 sm:py-24 text-center cursor-pointer transition-all ${
              isDraggingFile ? 'ring-2 ring-ink/40 ring-offset-4 ring-offset-canvas' : ''
            }`}
          >
            <div className="mx-auto mb-7 w-16 h-16 rounded-full sheet flex items-center justify-center">
              <ImageUp className="w-6 h-6 text-ink-soft stroke-[1.5]" />
            </div>
            <h1 className="letterpress font-serif text-4xl sm:text-5xl text-ink font-medium tracking-tight mb-3">
              Start with a photograph
            </h1>
            <p className="text-sm text-ink-soft mb-8">Drop it here, or</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isDecoding}
              className="btn-ink !px-6 !py-3 !text-sm"
            >
              {isDecoding ? 'Opening…' : 'Choose a photo'}
            </button>
            <p className="eyebrow mt-6">JPG · PNG · WebP · HEIC</p>

            {isDecoding && (
              <div className="absolute inset-0 rounded-[20px] bg-canvas/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Secondary: example photos */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs text-ink-faint">Or try an example</span>
            <div className="flex items-center gap-2">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadSample(sample)}
                  title={sample.title}
                  className="w-11 h-11 rounded-full overflow-hidden cursor-pointer opacity-80 hover:opacity-100 transition-all shadow-[0_0_0_2px_var(--color-paper),0_1px_3px_rgba(74,58,40,0.25)] hover:scale-105"
                >
                  <img
                    src={sample.src}
                    alt={sample.title}
                    draggable={false}
                    className="w-full h-full object-cover select-none"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Image View */
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => {
                setEyedropperActive(!eyedropperActive);
                setRegionSelectActive(false);
              }}
              aria-pressed={eyedropperActive}
              className="btn-paper"
              title="Pick a color from the photo"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Pick color</span>
            </button>

            <button
              onClick={() => {
                setRegionSelectActive(!regionSelectActive);
                setEyedropperActive(false);
              }}
              aria-pressed={regionSelectActive}
              className="btn-paper"
              title="Extract colors from one area"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>

            {activeRegion && (
              <button onClick={clearSelectedRegion} className="btn-paper" title="Use the whole photo again">
                <RotateCcw className="w-3 h-3" />
                <span>Full photo</span>
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecoding}
              className="btn-paper ml-auto"
              title="Use a different photo"
            >
              <RefreshCw className={`w-3 h-3 ${isDecoding ? 'animate-spin' : ''}`} />
              <span>{isDecoding ? 'Opening…' : 'Replace'}</span>
            </button>
          </div>

          {(eyedropperActive || regionSelectActive) && (
            <div
              className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-full text-xs ${
                eyedropperActive && paletteFull ? 'bg-amber-100 text-amber-900' : 'debossed text-ink-soft'
              }`}
            >
              <span>
                {regionSelectActive
                  ? 'Drag across the photo'
                  : paletteFull
                  ? `Palette is full (${paletteCount}/${maxPaletteSize})`
                  : `Click the photo to add a color · ${paletteCount}/${maxPaletteSize}`}
              </span>
              <button
                onClick={() => {
                  setEyedropperActive(false);
                  setRegionSelectActive(false);
                }}
                className="font-medium text-ink hover:underline cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Photo mounted in a shallow well */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`debossed relative p-3 sm:p-4 flex items-center justify-center select-none ${
              isDraggingFile ? 'ring-2 ring-ink/40' : ''
            }`}
          >
            <div
              className={`relative inline-block ${
                eyedropperActive || regionSelectActive ? 'cursor-crosshair' : 'cursor-default'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => setHoverColor(null)}
              onClick={handleImageClick}
              ref={overlayRef}
              style={{ touchAction: 'none' }}
            >
              <img
                ref={imgElementRef}
                src={currentImageSrc}
                alt="Source photograph"
                referrerPolicy="no-referrer"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-[480px] w-auto max-w-full object-contain block select-none pointer-events-none rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_8px_20px_-10px_rgba(0,0,0,0.35)]"
              />

              {boxStyle && (
                <div
                  className="absolute border border-white bg-white/15 pointer-events-none z-20 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                  style={boxStyle}
                />
              )}

              {eyedropperActive && hoverColor && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
                  style={{ left: hoverColor.screenX, top: hoverColor.screenY }}
                >
                  <div
                    className="w-11 h-11 rounded-full border-2 border-white shadow-xl flex items-center justify-center ring-1 ring-black/30"
                    style={{ backgroundColor: hoverColor.hex }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full mix-blend-difference" />
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-ink/90 text-white font-mono text-[10px] rounded-full shadow-md whitespace-nowrap">
                    {hoverColor.hex} · <span className="font-sans text-stone-300">{hoverColor.name}</span>
                  </div>
                </div>
              )}
            </div>

            {pendingRegion && !isPointerSelecting && (
              <div className="absolute bottom-6 z-30 bg-ink/90 backdrop-blur-md text-white pl-4 pr-1.5 py-1.5 rounded-full shadow-xl flex items-center gap-3">
                <button
                  onClick={clearSelectedRegion}
                  className="text-xs text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={applySelectedRegion}
                  className="px-3 py-1 bg-paper text-ink font-semibold rounded-full text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Use this area</span>
                </button>
              </div>
            )}

            {(isProcessing || isDecoding) && (
              <div className="absolute inset-0 rounded-[12px] bg-canvas/60 backdrop-blur-[2px] flex items-center justify-center z-40">
                <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <span className="text-[11px] text-ink-faint">Examples</span>
            {SAMPLE_IMAGES.map((sample) => (
              <button
                key={sample.id}
                onClick={() => loadSample(sample)}
                title={sample.title}
                className={`w-6 h-6 rounded-full overflow-hidden cursor-pointer transition-opacity ${
                  currentImageSrc === sample.src ? 'opacity-100 ring-1 ring-ink ring-offset-1 ring-offset-canvas' : 'opacity-50 hover:opacity-90'
                }`}
              >
                <img src={sample.src} alt={sample.title} draggable={false} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
