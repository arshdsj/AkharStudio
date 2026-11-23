/**
 * FindBar.tsx - In-Draft Find and Replace UI Component (ORG-04 P0, A11Y-01)
 * Accessible floating Find and Replace bar supporting Gurmukhi & Latin search,
 * live highlighting, next/previous navigation, single replace, replace all,
 * and unified transliteration based on the active Tool Options language mode.
 */

import React, { useEffect, useRef } from 'react';
import { Search, Replace, ChevronDown, ChevronUp, X, CaseSensitive, WholeWord } from 'lucide-react';
import { TransliteratedInput, TransliteratedInputHandle } from './TransliteratedInput';

export interface FindBarProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  replaceText?: string;
  onReplaceTextChange?: (replaceText: string) => void;
  matchesCount: number;
  activeIndex: number; // 0-indexed; -1 if no matches
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  wholeWord: boolean;
  onToggleWholeWord: () => void;
  onFindNext: () => void;
  onFindPrev: () => void;
  onReplace?: () => void;
  onReplaceAll?: () => void;
  inputMode?: 'pa' | 'en';
}

export const FindBar: React.FC<FindBarProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  replaceText = '',
  onReplaceTextChange,
  matchesCount,
  activeIndex,
  caseSensitive,
  onToggleCaseSensitive,
  wholeWord,
  onToggleWholeWord,
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  inputMode = 'pa',
}) => {
  const findInputRef = useRef<TransliteratedInputHandle>(null);
  const replaceInputRef = useRef<TransliteratedInputHandle>(null);

  // Focus Find input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFindKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isTranslitActive: boolean) => {
    if (isTranslitActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFindNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFindPrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isTranslitActive: boolean) => {
    if (isTranslitActive) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onFindNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onFindPrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onFindPrev();
      } else if (onReplace) {
        onReplace();
      }
    }
  };

  const currentDisplay =
    matchesCount > 0
      ? `${activeIndex + 1} of ${matchesCount}`
      : query.trim().length > 0
      ? '0 matches'
      : '';

  return (
    <div
      role="search"
      aria-label="Find and replace in script"
      className="absolute top-3 right-6 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
      style={{
        background: 'var(--surface-overlay)',
        border: '1px solid var(--line-separator)',
        boxShadow: 'var(--shadow-overlay)',
        color: 'var(--text-primary)',
      }}
    >
      {/* 1. Find Textbox */}
      <div className="flex items-center gap-1">
        <Search size={14} style={{ color: 'var(--text-secondary)' }} className="shrink-0" aria-hidden="true" />
        <TransliteratedInput
          ref={findInputRef}
          value={query}
          onChange={onQueryChange}
          onKeyDown={handleFindKeyDown}
          placeholder="Find in script..."
          ariaLabel="Search term in script"
          inputMode={inputMode}
          className="w-40 bg-transparent text-xs focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <div className="w-[1px] h-4 mx-0.5" style={{ background: 'var(--line-separator)' }} />

      {/* 2. Replace with Textbox */}
      <div className="flex items-center gap-1">
        <Replace size={14} style={{ color: 'var(--text-secondary)' }} className="shrink-0" aria-hidden="true" />
        <TransliteratedInput
          ref={replaceInputRef}
          value={replaceText}
          onChange={onReplaceTextChange || (() => {})}
          onKeyDown={handleReplaceKeyDown}
          placeholder="Replace with..."
          ariaLabel="Replacement text"
          inputMode={inputMode}
          className="w-40 bg-transparent text-xs focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Replace & Replace All Buttons */}
      <div className="flex items-center gap-1 ml-0.5">
        <button
          type="button"
          onClick={onReplace}
          disabled={matchesCount === 0}
          title="Replace active occurrence (Enter in Replace box)"
          aria-label="Replace active occurrence"
          className="px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-neutral-700/40 active:bg-neutral-600/50"
          style={{
            background: 'var(--surface-control)',
            border: '1px solid var(--line-separator)',
            color: 'var(--text-primary)',
          }}
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onReplaceAll}
          disabled={matchesCount === 0}
          title="Replace all occurrences"
          aria-label="Replace all occurrences"
          className="px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-neutral-700/40 active:bg-neutral-600/50"
          style={{
            background: 'var(--surface-control)',
            border: '1px solid var(--line-separator)',
            color: 'var(--text-primary)',
          }}
        >
          Replace All
        </button>
      </div>

      {/* Match Count Indicator */}
      {currentDisplay ? (
        <span
          aria-live="polite"
          className="text-[11px] px-1.5 py-0.5 rounded font-mono ml-1 shrink-0"
          style={
            matchesCount > 0
              ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
              : { background: 'var(--surface-sunken)', color: 'var(--text-danger)' }
          }
        >
          {currentDisplay}
        </span>
      ) : null}

      <div className="w-[1px] h-4 mx-0.5" style={{ background: 'var(--line-separator)' }} />

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

      <div className="w-[1px] h-4 mx-0.5" style={{ background: 'var(--line-separator)' }} />

      {/* Previous match button */}
      <button
        type="button"
        onClick={onFindPrev}
        disabled={matchesCount === 0}
        title="Previous Match (Up Arrow / Shift+Enter)"
        aria-label="Previous match"
        className="p-1 rounded transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronUp size={14} />
      </button>

      {/* Next match button */}
      <button
        type="button"
        onClick={onFindNext}
        disabled={matchesCount === 0}
        title="Next Match (Down Arrow / Enter)"
        aria-label="Next match"
        className="p-1 rounded transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronDown size={14} />
      </button>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        title="Close (Escape)"
        aria-label="Close find and replace bar"
        className="p-1 ml-0.5 rounded transition-colors cursor-pointer"
        style={{ color: 'var(--text-secondary)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
