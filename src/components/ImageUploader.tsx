import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Upload,
  Crosshair,
  Crop,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import { CropRegion, samplePixelColor } from '../utils/colorExtraction';
import { getColorName } from '../utils/colorUtils';

interface ImageUploaderProps {
  currentImageSrc: string | null;
  onImageSelected: (src: string, meta?: { name: string; width: number; height: number }) => void;
  onRegionSelected: (region: CropRegion | null) => void;
  onPixelPicked: (color: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
  }) => void;
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
  activeRegion,
  isProcessing,
  paletteCount = 0,
  maxPaletteSize = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
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
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const tempImg = new Image();
          tempImg.onload = () => {
            onImageSelected(result, {
              name: file.name,
              width: tempImg.naturalWidth,
              height: tempImg.naturalHeight,
            });
          };
          tempImg.src = result;
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
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

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Empty State */}
      {!currentImageSrc ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-10 md:p-14 text-center transition-all bg-[#F5F1EB]/60 ${
            isDraggingFile
              ? 'border-stone-800 bg-[#ECE6DD]'
              : 'border-[#D8D0C5] hover:border-stone-400'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <div className="w-8 h-10 rounded-sm bg-[#9A3412]/80 transform -rotate-6 shadow-xs" />
            <div className="w-8 h-12 rounded-sm bg-[#CA8A04]/80 transform -rotate-2 shadow-xs" />
            <div className="w-8 h-14 rounded-sm bg-[#166534]/80 shadow-xs" />
            <div className="w-8 h-12 rounded-sm bg-[#0E7490]/80 transform rotate-2 shadow-xs" />
            <div className="w-8 h-10 rounded-sm bg-[#3730A3]/80 transform rotate-6 shadow-xs" />
          </div>

          <h2 className="font-serif text-2xl md:text-3xl text-stone-900 font-medium mb-3">
            Deconstruct light into a chromatic narrative
          </h2>
          <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed mb-6 font-sans">
            Drop any photograph here to extract faithful pigment frequencies, explore nuanced harmonic variations, and preview them across editorial and digital systems.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 text-xs font-medium tracking-wide uppercase bg-[#1C1917] text-[#FBF9F5] rounded hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
            >
              Select Image from Computer
            </button>
            <span className="text-xs text-stone-500 font-mono">JPG · PNG · WEBP up to 25MB</span>
          </div>

          {/* Curated Sample Photographs */}
          <div className="border-t border-[#E7E0D6] pt-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3 text-left">
              <span className="text-xs uppercase tracking-widest font-mono text-stone-500">
                Or begin with curated reference studies
              </span>
              <span className="text-xs text-stone-400 font-serif italic">Click to load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() =>
                    onImageSelected(sample.src, {
                      name: sample.title,
                      width: 1200,
                      height: 800,
                    })
                  }
                  className="group text-left border border-stone-200 bg-white rounded p-2 hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer flex sm:flex-col gap-2.5 items-center sm:items-start"
                >
                  <div className="w-16 h-12 sm:w-full sm:h-24 overflow-hidden rounded-xs bg-stone-100 shrink-0">
                    <img
                      src={sample.src}
                      alt={sample.title}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">{sample.title}</p>
                    <p className="text-[11px] text-stone-500 truncate font-mono">{sample.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Image View */
        <div className="space-y-3">
          {/* Main Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-stone-500 uppercase tracking-wider text-[11px]">
                Source Photograph
              </span>
              {activeRegion && (
                <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  Region Filter Active
                  <button
                    onClick={clearSelectedRegion}
                    className="hover:text-amber-950 font-bold ml-1 cursor-pointer"
                    title="Remove region filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Eyedropper Toggle */}
              <button
                onClick={() => {
                  setEyedropperActive(!eyedropperActive);
                  setRegionSelectActive(false);
                }}
                className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  eyedropperActive
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                }`}
                title="Sample exact pixel color from image"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Pixel Eyedropper</span>
              </button>

              {/* Region Crop Toggle */}
              <button
                onClick={() => {
                  setRegionSelectActive(!regionSelectActive);
                  setEyedropperActive(false);
                }}
                className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  regionSelectActive
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-300 hover:border-stone-400'
                }`}
                title="Drag rectangle to isolate a sample region"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Sample Region</span>
              </button>

              {/* Replace Image */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 rounded border border-stone-300 bg-white text-stone-700 hover:border-stone-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>
            </div>
          </div>

          {/* Active Tool Guidance Notice */}
          {regionSelectActive && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded text-xs flex items-center justify-between animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-sans">
                <Crop className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                <span>
                  <strong>Region Tool Active:</strong> Click and drag a rectangle over the image to sample colors only from that area.
                </span>
              </div>
              <button
                onClick={() => setRegionSelectActive(false)}
                className="text-amber-800 hover:text-amber-950 font-mono text-[11px] underline ml-2 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {eyedropperActive && (
            <div className={`border px-3 py-2 rounded text-xs flex items-center justify-between animate-in fade-in duration-150 ${
              paletteCount >= maxPaletteSize
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-stone-100 border-stone-300 text-stone-800'
            }`}>
              <div className="flex items-center gap-2 font-sans">
                <Crosshair className="w-3.5 h-3.5 shrink-0 text-stone-700" />
                <span>
                  {paletteCount >= maxPaletteSize ? (
                    <>
                      <strong>Palette Limit Reached ({paletteCount}/{maxPaletteSize} tones):</strong> You have reached the maximum palette size. Remove a tone to sample more.
                    </>
                  ) : (
                    <>
                      <strong>Eyedropper Active ({paletteCount}/{maxPaletteSize} tones):</strong> Hover to inspect exact pixel values; click to append color to your palette.
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={() => setEyedropperActive(false)}
                className="text-stone-600 hover:text-stone-950 font-mono text-[11px] underline ml-2 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Image Container & Strict Coordinate Wrapper */}
          <div className="relative rounded-md overflow-hidden bg-stone-950 border border-stone-300 shadow-sm flex items-center justify-center select-none">
            {/* The tight image element with pointer-events handler overlay */}
            <div
              className={`relative inline-block ${
                eyedropperActive
                  ? 'cursor-crosshair'
                  : regionSelectActive
                  ? 'cursor-crosshair'
                  : 'cursor-default'
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={handleImageClick}
              ref={overlayRef}
              style={{ touchAction: 'none' }}
            >
              <img
                ref={imgElementRef}
                src={currentImageSrc}
                alt="Source photograph for palette extraction"
                referrerPolicy="no-referrer"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-[460px] w-auto max-w-full object-contain block select-none pointer-events-none"
              />

              {/* Selection Box Render (Exact boundaries) */}
              {boxStyle && (
                <div
                  className="absolute border-2 border-dashed border-amber-400 bg-amber-400/20 pointer-events-none shadow-md backdrop-contrast-110 z-20"
                  style={boxStyle}
                >
                  {/* Corner Anchors */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-400 rounded-full" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                </div>
              )}

              {/* Eyedropper Magnifier Loupe */}
              {eyedropperActive && hoverColor && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
                  style={{ left: hoverColor.screenX, top: hoverColor.screenY }}
                >
                  <div
                    className="w-11 h-11 rounded-full border-2 border-white shadow-xl flex items-center justify-center transition-colors duration-75 ring-1 ring-black/40"
                    style={{ backgroundColor: hoverColor.hex }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full mix-blend-difference" />
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-stone-950/90 text-white font-mono text-[10px] rounded shadow-md flex items-center gap-1.5 border border-white/20 whitespace-nowrap">
                    <span className="font-bold">{hoverColor.hex}</span>
                    <span className="text-stone-300 font-sans">· {hoverColor.name}</span>
                  </div>
                </div>
              )}
            </div>

            {/* In-container Confirm/Cancel Floating Bar for Region Selection */}
            {pendingRegion && !isPointerSelecting && (
              <div className="absolute bottom-4 z-30 bg-stone-900/90 backdrop-blur-md text-white px-3 py-2 rounded-md shadow-xl flex items-center gap-3 border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-mono">
                  Region: {Math.round(pendingRegion.width * 100)}% × {Math.round(pendingRegion.height * 100)}%
                </span>
                <button
                  onClick={applySelectedRegion}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Extract from Region</span>
                </button>
                <button
                  onClick={clearSelectedRegion}
                  className="text-xs text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Processing Spinner Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-[#FBF9F5]/70 backdrop-blur-xs flex items-center justify-center z-40">
                <div className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded font-mono text-xs">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Extracting faithful photographic spectrum...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Preset Strip */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <span className="text-[11px] font-mono text-stone-500 uppercase shrink-0">
                Switch Reference:
              </span>
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() =>
                    onImageSelected(sample.src, {
                      name: sample.title,
                      width: 1200,
                      height: 800,
                    })
                  }
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors shrink-0 cursor-pointer ${
                    currentImageSrc === sample.src
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {sample.category}: {sample.title.split('&')[0]}
                </button>
              ))}
            </div>

            {activeRegion && (
              <button
                onClick={clearSelectedRegion}
                className="text-xs font-mono text-stone-600 hover:text-stone-950 flex items-center gap-1 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Full Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
