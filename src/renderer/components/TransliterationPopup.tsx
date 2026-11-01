/**
 * TransliterationPopup.tsx - Floating Phonetic Transliteration Candidate Popup
 * Governing IDs: I18N-02, DEC-011, DEC-030, TM-03, TM-15 (combobox/listbox ARIA)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TransliterationPopupProps {
  isOpen: boolean;
  romanBuffer: string;
  candidates: string[];
  selectedIndex: number;
  onSelectCandidate: (candidate: string) => void;
  coords: { top: number; left: number } | null;
}

export const TransliterationPopup: React.FC<TransliterationPopupProps> = ({
  isOpen,
  romanBuffer,
  candidates,
  selectedIndex,
  onSelectCandidate,
  coords,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || candidates.length === 0 || !coords) return null;

  const content = (
    <div
      role="listbox"
      aria-label="Punjabi Transliteration Suggestions"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: coords.top + 8,
        left: Math.max(16, Math.min(window.innerWidth - 300, coords.left - 20)),
        zIndex: 9999,
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        borderRadius: 'var(--radius-md)',
      }}
      className="w-72 overflow-hidden font-sans select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header showing active Roman buffer */}
      <div
        className="px-3 py-1.5 flex items-center justify-between font-mono"
        style={{
          boxShadow: 'inset 0 -1px 0 var(--line-separator)',
          fontSize: 'var(--text-xs)',
          background: 'var(--surface-sunken)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Roman:</span>
        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{romanBuffer}</span>
      </div>

      {/* Candidate List */}
      <div ref={listRef} className="p-1 space-y-0.5 max-h-52 overflow-y-auto">
        {candidates.map((cand, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={cand + idx}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelectCandidate(cand)}
              className="px-3 py-1.5 rounded cursor-pointer transition-colors flex items-center justify-between"
              style={{
                background: isSelected ? 'var(--surface-selected)' : 'transparent',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono w-3" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  {idx + 1}.
                </span>
                <span className="text-base tracking-wide gurmukhi font-medium" style={{ color: 'var(--text-primary)' }}>
                  {cand}
                </span>
              </div>
              {isSelected && (
                <span
                  className="font-sans font-normal"
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
                >
                  ↵ / Space
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Accessible footer guide */}
      <div
        className="px-3 py-1 flex items-center justify-between"
        style={{
          boxShadow: 'inset 0 1px 0 var(--line-separator)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-disabled)',
          background: 'var(--surface-sunken)',
        }}
      >
        <span>↑↓ to navigate</span>
        <span>Esc to dismiss</span>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
