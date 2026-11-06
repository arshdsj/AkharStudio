/**
 * PasteConvertModal.tsx - Dedicated Roman Punjabi to Gurmukhi Conversion Window
 * Governed by: Stage 3 — Roman Punjabi to Gurmukhi Conversion
 *
 * Provides:
 * 1. Dedicated Roman Punjabi input area.
 * 2. Convert action reusing existing transliteration engine & dictionaries.
 * 3. Editable Gurmukhi preview with live manual correction.
 * 4. Contextual suggestion chips for uncertain/ambiguous words.
 * 5. Screenplay insertion preserving cursor position and formatting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Languages, ArrowRight, Check, AlertCircle, Copy } from 'lucide-react';
import {
  convertRomanPunjabiToGurmukhi,
  ConversionResult,
  ConvertedToken,
} from '../../core/transliteration/textConverter';
import { defaultTransliterator } from '../../core/transliteration/defaultEngine';
import { useModalTransition } from '../hooks/useModalTransition';

export interface PasteConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (gurmukhiText: string, mode: 'cursor' | 'replace-all') => void;
  initialText?: string;
  hasSelection?: boolean;
}

export const PasteConvertModal: React.FC<PasteConvertModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialText = '',
  hasSelection = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [preserveEnglish, setPreserveEnglish] = useState(true);
  const [insertMode, setInsertMode] = useState<'cursor' | 'replace-all'>('cursor');
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      const textToUse = initialText || '';
      setInputText(textToUse);
      if (textToUse.trim()) {
        const res = convertRomanPunjabiToGurmukhi(textToUse, defaultTransliterator, {
          preserveEnglish,
        });
        setConversionResult(res);
        setOutputText(res.convertedText);
      } else {
        setConversionResult(null);
        setOutputText('');
      }
      setInsertMode('cursor');
      setCopied(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  const handleConvert = () => {
    if (!inputText.trim()) {
      setOutputText('');
      setConversionResult(null);
      return;
    }
    const res = convertRomanPunjabiToGurmukhi(inputText, defaultTransliterator, {
      preserveEnglish,
    });
    setConversionResult(res);
    setOutputText(res.convertedText);
  };

  const handleApplySuggestion = (token: ConvertedToken, suggestion: string) => {
    // Replace the token's converted text in the output area
    if (!outputText) return;
    const oldText = token.converted;
    // Replace first occurrence of oldText after cursor or overall
    const updated = outputText.replace(oldText, suggestion);
    setOutputText(updated);
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!outputText.trim()) return;
    onInsert(outputText, insertMode);
    onClose();
  };

  const uncertainTokens = (conversionResult?.tokens || []).filter(
    (t) => t.isUncertain && t.suggestions.length > 1
  );

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div
        className="ds-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-dialog-title"
        style={{ maxWidth: '780px', width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="ds-dialog__header flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Languages size={18} style={{ color: 'var(--text-accent)' }} />
            <span id="convert-dialog-title" className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Roman Punjabi to Gurmukhi
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Converts full paragraphs while preserving line breaks & formatting
          </span>
        </div>

        {/* Body */}
        <div className="ds-dialog__body overflow-y-auto space-y-4 py-3 flex-1">
          {/* Dual Input/Output Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Input Column */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="roman-input" className="ds-label font-medium" style={{ fontSize: 'var(--text-xs)' }}>
                  Roman Punjabi Input (Paste or Type)
                </label>
                <button
                  type="button"
                  onClick={handleConvert}
                  className="ds-btn ds-btn--sm flex items-center gap-1"
                  style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                >
                  <span>Convert</span>
                  <ArrowRight size={12} />
                </button>
              </div>
              <textarea
                id="roman-input"
                ref={inputRef}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleConvert();
                  }
                }}
                placeholder="Paste Roman Punjabi text here (e.g. 'tusi kiddan ho? sab theek chal reha hai...')"
                rows={9}
                className="ds-input font-mono w-full resize-y"
                style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-relaxed, 1.5)',
                  padding: '8px',
                  background: 'var(--surface-sunken)',
                }}
              />
            </div>

            {/* Output Column */}
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="gurmukhi-output" className="ds-label font-medium" style={{ fontSize: 'var(--text-xs)' }}>
                  Gurmukhi Output (Editable Preview)
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!outputText}
                  className="ds-btn ds-btn--sm flex items-center gap-1"
                  style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                  title="Copy converted Gurmukhi text"
                >
                  {copied ? <Check size={12} style={{ color: 'var(--text-success)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <textarea
                id="gurmukhi-output"
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                placeholder="Converted Gurmukhi text will appear here. You can manually edit or correct it before inserting."
                rows={9}
                className="ds-input font-sans gurmukhi w-full resize-y"
                style={{
                  fontSize: 'var(--text-base)',
                  lineHeight: 'var(--leading-relaxed, 1.6)',
                  padding: '8px',
                  background: 'var(--surface-ground)',
                }}
              />
            </div>
          </div>

          {/* Options & Uncertain Words Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded" style={{ background: 'var(--surface-sunken)', fontSize: 'var(--text-xs)' }}>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preserveEnglish}
                onChange={(e) => {
                  setPreserveEnglish(e.target.checked);
                  if (inputText.trim()) {
                    const res = convertRomanPunjabiToGurmukhi(inputText, defaultTransliterator, {
                      preserveEnglish: e.target.checked,
                    });
                    setConversionResult(res);
                    setOutputText(res.convertedText);
                  }
                }}
              />
              <span style={{ color: 'var(--text-primary)' }}>Preserve common English words (e.g. hospital, police, car)</span>
            </label>

            <span style={{ color: 'var(--text-secondary)' }}>
              Tip: Press <strong>⌘ + Enter</strong> to convert
            </span>
          </div>

          {/* Uncertain Words Suggestions Chips */}
          {uncertainTokens.length > 0 && (
            <div className="p-3 rounded border space-y-2" style={{ borderColor: 'var(--line-separator)', background: 'var(--surface-overlay)' }}>
              <div className="flex items-center gap-1.5 font-medium" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-accent)' }}>
                <AlertCircle size={14} />
                <span>Suggestions for uncertain or ambiguous words (click to replace in output):</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {uncertainTokens.map((token, i) => (
                  <div
                    key={`${token.original}-${i}`}
                    className="flex items-center gap-1 px-2 py-1 rounded border text-xs"
                    style={{ background: 'var(--surface-ground)', borderColor: 'var(--line-separator)' }}
                  >
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {token.original}:
                    </span>
                    <div className="flex items-center gap-1">
                      {token.suggestions.slice(0, 3).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleApplySuggestion(token, sug)}
                          className="px-1.5 py-0.5 rounded text-xs gurmukhi transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                          style={{
                            background: outputText.includes(sug) ? 'var(--surface-selected)' : 'transparent',
                            color: 'var(--text-primary)',
                            fontWeight: outputText.includes(sug) ? 600 : 400,
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insertion Target Selection */}
          <div className="space-y-1.5">
            <span className="ds-label block" style={{ fontSize: 'var(--text-xs)' }}>
              Insert converted content to:
            </span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="insert-target"
                  checked={insertMode === 'cursor'}
                  onChange={() => setInsertMode('cursor')}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  {hasSelection ? 'Replace Selected Text' : 'Current Cursor Position'}
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="insert-target"
                  checked={insertMode === 'replace-all'}
                  onChange={() => setInsertMode('replace-all')}
                />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Replace Entire Screenplay (Warning)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ds-dialog__footer flex items-center justify-between border-t pt-3">
          <button type="button" onClick={onClose} className="ds-btn">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsert}
              disabled={!outputText.trim()}
              className="ds-btn ds-btn--primary flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Insert into Screenplay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
