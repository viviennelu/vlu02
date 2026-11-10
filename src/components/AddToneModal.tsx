import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { ColorData, getReadableTextColor } from '../utils/colorUtils';
import {
  generateDisjointToneRecommendations,
  DisjointToneRecommendations,
  ToneRole,
} from '../utils/colorExtraction';

interface AddToneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColor: (newColor: ColorData) => void;
  existingColors: ColorData[];
  currentImageSrc: string | null;
}

const ROLES: { id: ToneRole; label: string; desc: string }[] = [
  {
    id: 'dominant',
    label: 'Dominant Ground',
    desc: 'Primary foundational color to carry broad structural visual weight',
  },
  {
    id: 'secondary',
    label: 'Supporting Secondary',
    desc: 'Midtone or harmonic bridge that complements the dominant tones',
  },
  {
    id: 'accent',
    label: 'Distinctive Accent',
    desc: 'High-contrast or complementary tone used selectively for focal emphasis',
  },
];

export const AddToneModal: React.FC<AddToneModalProps> = ({
  isOpen,
  onClose,
  onAddColor,
  existingColors,
  currentImageSrc,
}) => {
  const [selectedRole, setSelectedRole] = useState<ToneRole>('accent');
  const [pool, setPool] = useState<DisjointToneRecommendations>({
    dominant: [],
    secondary: [],
    accent: [],
  });
  const [selectedCandidate, setSelectedCandidate] = useState<ColorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch mutually exclusive image-grounded pools whenever modal opens, image changes, or palette changes
  useEffect(() => {
    if (isOpen && currentImageSrc) {
      setIsLoading(true);
      generateDisjointToneRecommendations(currentImageSrc, existingColors)
        .then((disjointPool) => {
          setPool(disjointPool);
          const currentList = disjointPool[selectedRole] || [];
          setSelectedCandidate(currentList.length > 0 ? currentList[0] : null);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [isOpen, currentImageSrc, existingColors]);

  // When user switches roles, update selectedCandidate to first available in that role
  const handleRoleChange = (role: ToneRole) => {
    setSelectedRole(role);
    const list = pool[role] || [];
    setSelectedCandidate(list.length > 0 ? list[0] : null);
  };

  const handleApply = () => {
    if (!selectedCandidate) return;
    onAddColor({
      ...selectedCandidate,
      locked: false,
    });
    onClose();
  };

  if (!isOpen) return null;

  const candidates = pool[selectedRole] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-[#FBF9F5] rounded-lg border border-stone-300 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E0D6] bg-white">
          <div>
            <h3 className="font-serif text-xl font-medium text-stone-900">
              Extend Chromatic Palette
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Select an intended design role to discover image-grounded candidates
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Intended Color Role Selection */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
              1. Intended Color Role
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`text-left p-3 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-stone-950 bg-white ring-1 ring-stone-950 shadow-xs'
                        : 'border-stone-200 bg-white/60 hover:border-stone-400 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-stone-950 font-bold' : 'text-stone-700'
                          }`}
                        >
                          {role.label}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                      </div>
                      <p className="text-[10px] text-stone-500 leading-snug">
                        {role.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Suggested Tones for Role */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">
              2. Suggested Photographic Tones ({ROLES.find((r) => r.id === selectedRole)?.label})
            </span>

            {isLoading ? (
              <div className="py-10 text-center text-xs font-mono text-stone-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
                <span>Evaluating image frequencies for {selectedRole} role...</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-stone-500 border border-dashed border-stone-300 rounded bg-stone-50 p-4">
                No distinct additional {selectedRole} frequencies detected in this image that differ from your active palette.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {candidates.map((c) => {
                  const isSelected = selectedCandidate?.id === c.id;
                  const textColor = getReadableTextColor(c.hex);

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={`text-left p-3 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-stone-950 bg-white ring-1 ring-stone-950 shadow-xs'
                          : 'border-stone-200 bg-white/75 hover:border-stone-400 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 mb-2">
                        <div
                          className="w-11 h-11 rounded-xs border border-black/10 flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check className="w-4 h-4" style={{ color: textColor }} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-serif font-bold text-sm text-stone-900 block truncate">
                            {c.name}
                          </span>
                          <span className="font-mono text-xs text-stone-600 block">{c.hex}</span>
                          <span className="text-[9px] font-mono text-stone-500 uppercase mt-0.5 inline-block">
                            Luminance: {c.hsl.l}% · Saturation: {c.hsl.s}%
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-stone-500 font-sans border-t border-stone-100 pt-1.5 line-clamp-2">
                        {c.sourceNote}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-[#E7E0D6] flex items-center justify-between">
          <span className="text-[11px] font-mono text-stone-500">
            {selectedCandidate ? `Selected: ${selectedCandidate.name} (${selectedCandidate.hex})` : 'Select a candidate tone'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedCandidate}
              className="px-5 py-2 text-xs font-semibold bg-[#1C1917] hover:bg-stone-800 text-white rounded transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tone to Palette</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
