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
    label: 'Dominant',
    desc: 'Primary foundational color to carry broad structural visual weight',
  },
  {
    id: 'secondary',
    label: 'Secondary',
    desc: 'Midtone or harmonic bridge that complements the dominant tones',
  },
  {
    id: 'accent',
    label: 'Accent',
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
          // Don't open on an empty role if another one has suggestions
          const role =
            (disjointPool[selectedRole] || []).length > 0
              ? selectedRole
              : ROLES.find((r) => (disjointPool[r.id] || []).length > 0)?.id ?? selectedRole;
          setSelectedRole(role);
          const currentList = disjointPool[role] || [];
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A221B]/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add tone"
        onClick={(e) => e.stopPropagation()}
        className="sheet !rounded-[20px] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h3 className="font-serif text-2xl font-medium text-ink">Add a tone</h3>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-full text-ink-faint hover:text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <div role="radiogroup" aria-label="Role" className="debossed rounded-full p-1 flex text-xs">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleRoleChange(role.id)}
                  title={role.desc}
                  className={`flex-1 py-1.5 rounded-full cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-paper text-ink font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(74,58,40,0.15)]'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {role.label}
                </button>
              );
            })}
          </div>

          {!currentImageSrc ? (
            <p className="py-10 text-center text-sm text-ink-soft">Add a photo to get suggestions.</p>
          ) : isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">No new {selectedRole} tones found in this photo.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {candidates.map((c) => {
                const isSelected = selectedCandidate?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCandidate(c)}
                    aria-pressed={isSelected}
                    title={c.sourceNote}
                    className={`text-left p-1.5 rounded-[12px] transition-all cursor-pointer ${
                      isSelected ? 'bg-paper shadow-[0_0_0_1.5px_var(--color-ink),0_2px_6px_rgba(74,58,40,0.15)]' : 'hover:bg-paper/70'
                    }`}
                  >
                    <div
                      className="h-16 rounded-[8px] flex items-end justify-end p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && <Check className="w-4 h-4" style={{ color: getReadableTextColor(c.hex) }} />}
                    </div>
                    <div className="px-1 pt-1.5 pb-0.5">
                      <span className="text-xs text-ink block truncate">{c.name}</span>
                      <span className="font-mono text-[10px] text-ink-faint">{c.hex}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="btn-paper">
              Cancel
            </button>
            <button onClick={handleApply} disabled={!selectedCandidate} className="btn-ink">
              <Plus className="w-3.5 h-3.5" />
              <span>Add to palette</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
