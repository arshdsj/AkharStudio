/**
 * SuggestionPopup.tsx - Floating autocomplete popup menu (AC-01, AC-02, AC-03, AC-04)
 * Follows the single-menu rule and strict keyboard priority state machine (DEC-011, DEC-030)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SuggestionItem } from '../../core/editor/autocomplete';

interface SuggestionPopupProps {
  isOpen: boolean;
  type: 'character' | 'scene_prefix' | 'transition';
  items: SuggestionItem[];
  selectedIndex: number;
  onSelect: (item: SuggestionItem) => void;
  onClose: () => void;
  coords: { top: number; left: number; bottom?: number; right?: number } | null;
  isVirtualKeyboardOpen?: boolean;
  keyboardHeight?: number;
}

export const SuggestionPopup: React.FC<SuggestionPopupProps> = ({
  isOpen,
  type,
  items,
  selectedIndex,
  onSelect,
  onClose,
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

  // Dismiss on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Keep position refreshed on window resize or scroll
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

  if (!isOpen || items.length === 0 || !coords) return null;

  const getTypeLabel = () => {
    switch (type) {
      case 'character':
        return 'Character Suggestions';
      case 'scene_prefix':
        return 'Scene Prefix';
      case 'transition':
        return 'Transition';
    }
  };

  const cursorTop = coords.top;
  const cursorBottom = coords.bottom ?? (coords.top + 24);
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const effectiveKeyboardHeight = isVirtualKeyboardOpen ? (keyboardHeight || 296) : 0;
  const visibleBottom = viewportHeight - effectiveKeyboardHeight;
  const popupWidth = 256; // w-64 = 256px
  const popupHeight = containerRef.current
    ? containerRef.current.offsetHeight
    : Math.min(224, 40 + items.length * 36);

  const spaceBelow = visibleBottom - cursorBottom - 8;
  const spaceAbove = cursorTop - 8;
  const positionAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;

  const top = positionAbove
    ? Math.max(8, cursorTop - popupHeight - 8)
    : Math.max(8, Math.min(visibleBottom - popupHeight - 8, cursorBottom + 8));

  const left = Math.max(16, Math.min(viewportWidth - popupWidth - 16, coords.left));

  const content = (
    <div
      ref={containerRef}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 90, // Kept below .ds-scrim (z-index: 100) and dialogs so it never overlaps modals
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        borderRadius: 'var(--radius-md)',
      }}
      className="w-64 max-h-56 overflow-hidden flex flex-col font-sans select-none"
    >
      <div
        className="px-3 py-1.5 uppercase font-semibold flex items-center justify-between"
        style={{
          boxShadow: 'inset 0 -1px 0 var(--line-separator)',
          fontSize: 'var(--text-xs)',
          letterSpacing: '.04em',
          color: 'var(--text-secondary)',
          background: 'var(--surface-sunken)',
        }}
      >
        <span>{getTypeLabel()}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer text-xs p-0.5 rounded leading-none"
          aria-label="Close suggestions"
          title="Close (Escape)"
        >
          ✕
        </button>
      </div>

      <div ref={listRef} className="overflow-y-auto p-1 space-y-0.5 max-h-48">
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const key = typeof item === 'string' ? `${item}-${idx}` : (item.id ?? `${item.label || idx}-${idx}`);
          const label = typeof item === 'string' ? item : item.label;
          return (
            <div
              key={key}
              onClick={() => onSelect(item)}
              className="px-3 py-1.5 rounded text-xs font-courier cursor-pointer transition-colors flex items-center justify-between"
              style={{
                background: isSelected ? 'var(--surface-control)' : 'transparent',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isSelected ? 'var(--weight-medium)' : 'var(--weight-regular)',
              }}
            >
              <span>{label}</span>
              {isSelected && (
                <span
                  className="font-sans font-normal"
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
                >
                  ↵ Enter / Space
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
