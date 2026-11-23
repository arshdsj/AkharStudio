/**
 * TransliterationPopup.tsx - Floating Phonetic Transliteration Candidate Popup
 * Governing IDs: I18N-02, DEC-011, DEC-030, TM-03, TM-15 (combobox/listbox ARIA)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SuggestionDetail } from '../../core/transliteration/engine';

interface TransliterationPopupProps {
  isOpen: boolean;
  romanBuffer: string;
  candidates: string[];
  candidateDetails?: SuggestionDetail[];
  selectedIndex: number;
  onSelectCandidate: (candidate: string) => void;
  coords: { top: number; left: number; bottom?: number; right?: number } | null;
  isVirtualKeyboardOpen?: boolean;
  keyboardHeight?: number;
}

export const TransliterationPopup: React.FC<TransliterationPopupProps> = ({
  isOpen,
  romanBuffer,
  candidates,
  candidateDetails,
  selectedIndex,
  onSelectCandidate,
  coords,
  isVirtualKeyboardOpen = false,
  keyboardHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keep position refreshed on window resize or container scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => setTick((t) => t + 1);
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen]);

  if (!isOpen || candidates.length === 0 || !coords) return null;

  const cursorTop = coords.top;
  const cursorBottom = coords.bottom ?? (coords.top + 24);
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const effectiveKeyboardHeight = isVirtualKeyboardOpen ? (keyboardHeight || 296) : 0;
  const visibleBottom = viewportHeight - effectiveKeyboardHeight;
  const popupWidth = 288; // w-72 = 288px
  const popupHeight = containerRef.current
    ? containerRef.current.offsetHeight
    : Math.min(260, 42 + candidates.length * 36 + 30);

  const spaceBelow = visibleBottom - cursorBottom - 8;
  const spaceAbove = cursorTop - 8;
  const positionAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;

  const top = positionAbove
    ? Math.max(8, cursorTop - popupHeight - 8)
    : Math.max(8, Math.min(visibleBottom - popupHeight - 8, cursorBottom + 8));

  const left = Math.max(16, Math.min(viewportWidth - popupWidth - 16, coords.left - 20));

  const content = (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Punjabi Transliteration Suggestions"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        borderRadius: 'var(--radius-md)',
      }}
      className="w-72 overflow-hidden font-sans select-none"
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
          const detail = candidateDetails?.find((d) => d.word === cand);
          const isTranslation = detail?.isTranslation;
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
                <span
                  className={`text-base tracking-wide font-medium ${cand === romanBuffer ? 'font-sans' : 'gurmukhi'}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {cand}
                </span>
                {cand === romanBuffer && (
                  <span
                    className="text-[10px] font-sans font-semibold uppercase px-1.5 py-0.5 rounded tracking-wider"
                    style={{
                      background: 'var(--surface-control)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--line-separator)',
                    }}
                  >
                    English
                  </span>
                )}
                {isTranslation && (
                  <span
                    className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded tracking-wider"
                    style={{
                      background: 'var(--surface-control)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--line-separator)',
                    }}
                  >
                    Punjabi equivalent
                  </span>
                )}
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
        <span>Esc / Shift+Space: English</span>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
