/**
 * TransliteratedInput.tsx - Phonetic Gurmukhi & English Transliterated Input Component
 * Reuses the application's singleton Gurmukhi transliteration engine identically with the main editor.
 * Behaviour depends exclusively on the provided inputMode ('pa' | 'en').
 */

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { defaultTransliterator } from '../../core/transliteration/defaultEngine';
import { GurmukhiTransliterator, SuggestionDetail } from '../../core/transliteration/engine';
import { TransliterationPopup } from './TransliterationPopup';

export interface TransliteratedInputHandle {
  focus: () => void;
  select: () => void;
  getInputElement: () => HTMLInputElement | null;
}

export interface TransliteratedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode: 'pa' | 'en';
  transliterator?: GurmukhiTransliterator;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>, isTranslitActive: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  autoFocus?: boolean;
}

export const TransliteratedInput = forwardRef<TransliteratedInputHandle, TransliteratedInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      inputMode,
      transliterator = defaultTransliterator,
      onKeyDown: onKeyDownProp,
      className,
      style,
      ariaLabel,
      autoFocus,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [romanBuffer, setRomanBuffer] = useState('');
    const [candidates, setCandidates] = useState<string[]>([]);
    const [candidateDetails, setCandidateDetails] = useState<SuggestionDetail[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [anchorPos, setAnchorPos] = useState<number | null>(null);
    const [popupCoords, setPopupCoords] = useState<{ top: number; left: number; bottom?: number; right?: number } | null>(null);
    const isComposingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      select: () => inputRef.current?.select(),
      getInputElement: () => inputRef.current,
    }));

    const updateCoords = useCallback(() => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setPopupCoords({
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
        });
      }
    }, []);

    // Commit transliteration candidate
    const commitCandidate = useCallback(
      (chosen: string, trailing: string = '') => {
        if (!inputRef.current || anchorPos === null) return;
        const currentVal = inputRef.current.value;
        const prefix = currentVal.slice(0, anchorPos);
        const suffix = currentVal.slice(anchorPos + romanBuffer.length);
        const toInsert = chosen + trailing;
        const nextVal = prefix + toInsert + suffix;

        transliterator.recordSelection(chosen, romanBuffer);

        setRomanBuffer('');
        setCandidates([]);
        setCandidateDetails([]);
        setSelectedIndex(0);
        setAnchorPos(null);
        setPopupCoords(null);

        onChange(nextVal);

        const newCaret = anchorPos + toInsert.length;
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newCaret, newCaret);
            inputRef.current.focus();
          }
        });
      },
      [anchorPos, romanBuffer, transliterator, onChange]
    );

    // Commit literal Roman buffer without transliteration
    const commitLiteral = useCallback(
      (trailing: string = '') => {
        if (!inputRef.current || anchorPos === null) return;
        const currentVal = inputRef.current.value;
        const prefix = currentVal.slice(0, anchorPos);
        const suffix = currentVal.slice(anchorPos + romanBuffer.length);
        const toInsert = romanBuffer + trailing;
        const nextVal = prefix + toInsert + suffix;

        setRomanBuffer('');
        setCandidates([]);
        setCandidateDetails([]);
        setSelectedIndex(0);
        setAnchorPos(null);
        setPopupCoords(null);

        onChange(nextVal);

        const newCaret = anchorPos + toInsert.length;
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newCaret, newCaret);
            inputRef.current.focus();
          }
        });
      },
      [anchorPos, romanBuffer, onChange]
    );

    // If inputMode changes to 'en' while buffer is active, commit literal and dismiss popup
    useEffect(() => {
      if (inputMode === 'en' && romanBuffer.length > 0) {
        commitLiteral('');
      }
    }, [inputMode, romanBuffer, commitLiteral]);

    // Handle blur: commit current candidate if uncommitted buffer remains
    const handleBlur = () => {
      if (romanBuffer.length > 0 && candidates.length > 0) {
        const chosen = candidates[selectedIndex] || romanBuffer;
        commitCandidate(chosen, '');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isComposingRef.current) return;

      const isBufferActive = romanBuffer.length > 0;

      // 1. If in English mode, do not perform transliteration
      if (inputMode === 'en') {
        if (isBufferActive) {
          commitLiteral('');
        }
        onKeyDownProp?.(e, false);
        return;
      }

      // 2. Transliteration buffer is active in Punjabi mode
      if (isBufferActive) {
        // Arrow navigation in candidate popup
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (candidates.length > 0) {
            setSelectedIndex((prev) => (prev + 1) % candidates.length);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (candidates.length > 0) {
            setSelectedIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
          }
          return;
        }

        // Arrow Left / Right: commit candidate so cursor moves naturally
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const chosen = candidates[selectedIndex] || romanBuffer;
          commitCandidate(chosen, '');
          return;
        }

        // Space: commit candidate + space (or Shift+Space for literal buffer)
        if (e.key === ' ') {
          e.preventDefault();
          if (e.shiftKey) {
            commitLiteral(' ');
          } else {
            const chosen = candidates[selectedIndex] || romanBuffer;
            commitCandidate(chosen, ' ');
          }
          return;
        }

        // Enter: commit candidate without trailing space (or Shift+Enter for literal buffer)
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) {
            commitLiteral('');
          } else {
            const chosen = candidates[selectedIndex] || romanBuffer;
            commitCandidate(chosen, '');
          }
          return;
        }

        // Escape or Tab: dismiss popup, commit literal Roman text
        if (e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          commitLiteral('');
          return;
        }

        // Punctuation: commit candidate + punctuation mark
        if (['.', ',', '!', '?', ';', ':'].includes(e.key)) {
          e.preventDefault();
          const chosen = candidates[selectedIndex] || romanBuffer;
          commitCandidate(chosen, e.key);
          return;
        }

        // Backspace: delete last character from Roman buffer
        if (e.key === 'Backspace') {
          e.preventDefault();
          const newBuf = romanBuffer.slice(0, -1);
          if (newBuf.length === 0) {
            const currentVal = inputRef.current?.value || '';
            const prefix = currentVal.slice(0, anchorPos!);
            const suffix = currentVal.slice(anchorPos! + romanBuffer.length);
            setRomanBuffer('');
            setCandidates([]);
            setCandidateDetails([]);
            setSelectedIndex(0);
            setAnchorPos(null);
            setPopupCoords(null);
            onChange(prefix + suffix);
            requestAnimationFrame(() => {
              inputRef.current?.setSelectionRange(anchorPos!, anchorPos!);
            });
          } else {
            const detailed = transliterator.suggestWithDetails(newBuf, 5);
            const cands = [...detailed.candidates];
            if (!newBuf.startsWith('{') && !cands.includes(newBuf)) {
              cands.push(newBuf);
            }
            setRomanBuffer(newBuf);
            setCandidates(cands);
            setCandidateDetails(detailed.details);
            setSelectedIndex(0);

            const currentVal = inputRef.current?.value || '';
            const prefix = currentVal.slice(0, anchorPos!);
            const suffix = currentVal.slice(anchorPos! + romanBuffer.length);
            onChange(prefix + newBuf + suffix);

            requestAnimationFrame(() => {
              const pos = anchorPos! + newBuf.length;
              inputRef.current?.setSelectionRange(pos, pos);
            });
            updateCoords();
          }
          return;
        }
      }

      // 3. Capturing Roman phonetic input (a-z, A-Z, braces for tokens)
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.length === 1 &&
        /^[a-zA-Z{}_\-]$/.test(e.key)
      ) {
        e.preventDefault();

        const inputEl = inputRef.current;
        if (!inputEl) return;

        const selStart = inputEl.selectionStart ?? inputEl.value.length;
        const selEnd = inputEl.selectionEnd ?? inputEl.value.length;

        let currentAnchor = anchorPos;
        let currentVal = inputEl.value;

        if (romanBuffer.length === 0 || currentAnchor === null) {
          // Starting a new buffer: replace any current selection
          const prefix = currentVal.slice(0, selStart);
          const suffix = currentVal.slice(selEnd);
          currentAnchor = selStart;
          currentVal = prefix + suffix;
        }

        const prefix = currentVal.slice(0, currentAnchor);
        const suffix = currentVal.slice(currentAnchor + romanBuffer.length);
        const newBuf = romanBuffer + e.key;

        const detailed = transliterator.suggestWithDetails(newBuf, 5);
        const cands = [...detailed.candidates];
        if (!newBuf.startsWith('{') && !cands.includes(newBuf)) {
          cands.push(newBuf);
        }

        setAnchorPos(currentAnchor);
        setRomanBuffer(newBuf);
        setCandidates(cands);
        setCandidateDetails(detailed.details);
        setSelectedIndex(0);

        const nextVal = prefix + newBuf + suffix;
        onChange(nextVal);

        requestAnimationFrame(() => {
          const newPos = currentAnchor! + newBuf.length;
          inputRef.current?.setSelectionRange(newPos, newPos);
        });
        updateCoords();
        return;
      }

      // 4. Fallback to external keydown handler (e.g. Find Next/Prev navigation)
      onKeyDownProp?.(e, isBufferActive);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            if (romanBuffer.length === 0) {
              onChange(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          className={className}
          style={style}
        />

        {/* Transliteration Candidates Popup */}
        {inputMode === 'pa' && romanBuffer.length > 0 && candidates.length > 0 && popupCoords && (
          <TransliterationPopup
            isOpen={true}
            romanBuffer={romanBuffer}
            candidates={candidates}
            candidateDetails={candidateDetails}
            selectedIndex={selectedIndex}
            onSelectCandidate={(chosen) => commitCandidate(chosen, '')}
            coords={popupCoords}
          />
        )}
      </div>
    );
  }
);

TransliteratedInput.displayName = 'TransliteratedInput';
