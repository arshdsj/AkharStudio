/**
 * FindBar.tsx - In-Draft Search UI Component (ORG-04 P0, A11Y-01)
 * Accessible floating search bar supporting Gurmukhi & Latin search,
 * next/previous navigation, and match case / whole word options.
 */

import React, { useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X, CaseSensitive, WholeWord } from 'lucide-react';

interface FindBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  matchesCount: number;
  activeIndex: number; // 0-indexed; -1 if no matches
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  wholeWord: boolean;
  onToggleWholeWord: () => void;
  onFindNext: () => void;
  onFindPrev: () => void;
}

export const FindBar: React.FC<FindBarProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  matchesCount,
  activeIndex,
  caseSensitive,
  onToggleCaseSensitive,
  wholeWord,
  onToggleWholeWord,
  onFindNext,
  onFindPrev,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    }
  };

  const currentDisplay = matchesCount > 0 ? `${activeIndex + 1} of ${matchesCount}` : query ? 'No matches' : '';

  return (
    <div
      role="search"
      aria-label="Find in script"
      className="absolute top-3 right-6 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
      style={{
        background: 'var(--surface-overlay)',
        border: '1px solid var(--line-separator)',
        boxShadow: 'var(--shadow-overlay)',
        color: 'var(--text-primary)',
      }}
    >
      <Search size={14} style={{ color: 'var(--text-secondary)' }} className="shrink-0" aria-hidden="true" />

      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in script..."
        aria-label="Search term in script"
        className="w-48 bg-transparent text-xs focus:outline-none"
        style={{ color: 'var(--text-primary)' }}
      />

      {/* Match Count Indicator */}
      <span
        aria-live="polite"
        className="text-[11px] px-1.5 py-0.5 rounded font-mono"
        style={
          matchesCount > 0
            ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
            : query
            ? { background: 'var(--surface-sunken)', color: 'var(--text-danger)' }
            : { color: 'var(--text-secondary)' }
        }
      >
        {currentDisplay}
      </span>

      <div className="w-[1px] h-4 mx-1" style={{ background: 'var(--line-separator)' }} />

      {/* Case-sensitive toggle */}
      <button
        type="button"
        onClick={onToggleCaseSensitive}
        title="Match Case (Alt+C)"
        aria-label="Toggle match case"
        aria-pressed={caseSensitive}
        className="p-1 rounded text-xs transition-colors"
        style={
          caseSensitive
            ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
            : { color: 'var(--text-secondary)' }
        }
      >
        <CaseSensitive size={14} />
      </button>

      {/* Whole-word toggle */}
      <button
        type="button"
        onClick={onToggleWholeWord}
        title="Match Whole Word (Alt+W)"
        aria-label="Toggle match whole word"
        aria-pressed={wholeWord}
        className="p-1 rounded text-xs transition-colors"
        style={
          wholeWord
            ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
            : { color: 'var(--text-secondary)' }
        }
      >
        <WholeWord size={14} />
      </button>

      <div className="w-[1px] h-4 mx-1" style={{ background: 'var(--line-separator)' }} />

      {/* Previous match button */}
      <button
        type="button"
        onClick={onFindPrev}
        disabled={matchesCount === 0}
        title="Previous Match (Shift+Enter)"
        aria-label="Previous match"
        className="p-1 rounded transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronUp size={14} />
      </button>

      {/* Next match button */}
      <button
        type="button"
        onClick={onFindNext}
        disabled={matchesCount === 0}
        title="Next Match (Enter)"
        aria-label="Next match"
        className="p-1 rounded transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronDown size={14} />
      </button>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        title="Close (Escape)"
        aria-label="Close find bar"
        className="p-1 ml-1 rounded transition-colors"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
