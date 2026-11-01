/**
 * HighlightCharactersModal.tsx - Compact character selection interface
 * Reference: Visual reference screenshot & Requirement 5
 * Allows writers to select specific characters and apply subtle background highlight
 * to their dialogue cues, dialogue lines, and parentheticals.
 */

import React, { useEffect } from 'react';
import { X, Check, Ban } from 'lucide-react';
import { HighlightCharactersSetting } from '../../types/screenplay';

export interface HighlightColorOption {
  id: string;
  name: string;
  color: string;
  swatch: string;
}

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  {
    id: 'violet',
    name: 'Violet',
    color: 'rgba(167, 139, 250, 0.35)',
    swatch: '#a78bfa',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    color: 'rgba(250, 204, 21, 0.35)',
    swatch: '#facc15',
  },
  {
    id: 'blue',
    name: 'Blue',
    color: 'rgba(96, 165, 250, 0.35)',
    swatch: '#60a5fa',
  },
  {
    id: 'green',
    name: 'Green',
    color: 'rgba(74, 222, 128, 0.35)',
    swatch: '#4ade80',
  },
  {
    id: 'pink',
    name: 'Pink',
    color: 'rgba(244, 114, 182, 0.35)',
    swatch: '#f472b6',
  },
  {
    id: 'orange',
    name: 'Orange',
    color: 'rgba(251, 146, 60, 0.35)',
    swatch: '#fb923c',
  },
];

interface HighlightCharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedCharacters: string[];
  settings: HighlightCharactersSetting;
  onSettingsChange: (settings: HighlightCharactersSetting) => void;
}

export const HighlightCharactersModal: React.FC<HighlightCharactersModalProps> = ({
  isOpen,
  onClose,
  detectedCharacters,
  settings,
  onSettingsChange,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedSet = new Set(
    (settings.selectedCharacters || []).map((c) => c.toUpperCase().trim())
  );

  const handleToggleCharacter = (charName: string) => {
    const normalized = charName.toUpperCase().trim();
    const newSelected = new Set(selectedSet);
    if (newSelected.has(normalized)) {
      newSelected.delete(normalized);
    } else {
      newSelected.add(normalized);
    }
    onSettingsChange({
      ...settings,
      selectedCharacters: Array.from(newSelected),
    });
  };

  const handleUnselectAll = () => {
    onSettingsChange({
      ...settings,
      selectedCharacters: [],
    });
  };

  const handleColorChange = (color: string) => {
    onSettingsChange({
      ...settings,
      color,
    });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    onSettingsChange({
      ...settings,
      enabled,
    });
  };

  const currentColor = settings.color || HIGHLIGHT_COLORS[0].color;

  return (
    <div
      className="ds-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ds-dialog flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--surface-overlay, #1c1d22)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-overlay), 0 20px 40px rgba(0,0,0,0.6)',
          border: '1px solid var(--line-edge, rgba(255,255,255,0.08))',
        }}
        role="dialog"
        aria-labelledby="highlight-chars-title"
      >
        {/* Compact Header matching Visual Reference Screenshot */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid var(--line-separator, rgba(255,255,255,0.06))' }}
        >
          <span
            id="highlight-chars-title"
            className="font-semibold text-base"
            style={{ color: 'var(--text-primary, #f4f4f5)' }}
          >
            Highlight characters
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUnselectAll}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: 'var(--surface-control, rgba(255,255,255,0.08))',
                color: 'var(--text-secondary, #a1a1aa)',
              }}
              title="Remove all character selections"
            >
              Unselect all
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ds-icon-btn rounded-full hover:bg-white/10"
              aria-label="Close"
              title="Close panel (Escape)"
            >
              <X size={18} style={{ color: 'var(--text-secondary, #a1a1aa)' }} />
            </button>
          </div>
        </div>

        {/* Feature Toggle & Color Selection */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{
            background: 'var(--surface-sunken, rgba(0,0,0,0.25))',
            borderBottom: '1px solid var(--line-separator, rgba(255,255,255,0.06))',
          }}
        >
          {/* Active Highlight Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              className="sr-only"
              aria-label="Toggle character highlighting"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            <div
              className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                settings.enabled ? 'bg-purple-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </div>
            <span
              className="font-medium"
              style={{ color: settings.enabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {settings.enabled ? 'Highlighting Active' : 'Highlighting Disabled'}
            </span>
          </label>

          {/* Color Swatch Picker */}
          <div className="flex items-center gap-1.5" title="Choose Highlight Color">
            {HIGHLIGHT_COLORS.map((opt) => {
              const isSelected = currentColor === opt.color;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleColorChange(opt.color)}
                  className={`w-5 h-5 rounded-full transition-all flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: opt.swatch }}
                  title={`${opt.name} Highlight`}
                />
              );
            })}
          </div>
        </div>

        {/* Character List */}
        <div
          className="p-3 max-h-[340px] overflow-y-auto space-y-1 select-none"
          style={{ scrollbarWidth: 'thin' }}
        >
          {detectedCharacters.length === 0 ? (
            <div className="text-center py-8 px-4" style={{ color: 'var(--text-secondary)' }}>
              <p className="text-sm font-medium">No characters detected yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>
                Type dialogue cues (e.g. GEJA, ਬਾਪੂ) to populate characters automatically.
              </p>
            </div>
          ) : (
            detectedCharacters.map((name) => {
              const normalized = name.toUpperCase().trim();
              const isChecked = selectedSet.has(normalized);

              return (
                <div
                  key={normalized}
                  onClick={() => handleToggleCharacter(name)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                  style={{
                    background: isChecked ? 'rgba(167, 139, 250, 0.08)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                        isChecked
                          ? 'bg-purple-600 border border-purple-500'
                          : 'border border-zinc-600 bg-zinc-800'
                      }`}
                    >
                      {isChecked && <Check size={12} className="text-white stroke-[3]" />}
                    </div>

                    {/* Character Name */}
                    <span
                      className="font-mono text-sm tracking-wide font-medium truncate"
                      style={{ color: isChecked ? '#ffffff' : 'var(--text-secondary, #d4d4d8)' }}
                    >
                      {name}
                    </span>
                  </div>

                  {/* Right Status Icon */}
                  <div className="flex items-center">
                    {isChecked ? (
                      <span
                        className="w-4 h-4 rounded-full border flex items-center justify-center"
                        style={{
                          backgroundColor: currentColor,
                          borderColor: 'var(--line-edge)',
                        }}
                        title="Highlighted"
                      />
                    ) : (
                      <Ban size={15} className="text-purple-400/50" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className="px-5 py-2.5 flex justify-between items-center text-[11px]"
          style={{
            borderTop: '1px solid var(--line-separator, rgba(255,255,255,0.06))',
            color: 'var(--text-disabled, #71717a)',
          }}
        >
          <span>
            {selectedSet.size} of {detectedCharacters.length} character{detectedCharacters.length === 1 ? '' : 's'} selected
          </span>
          <span>Saves with project</span>
        </div>
      </div>
    </div>
  );
};
