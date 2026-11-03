/**
 * DirectPastePromptModal.tsx - Prompt shown when Roman Punjabi text is pasted into the editor
 * Governed by: Stage 3.D — Direct Paste Option
 *
 * Detects Roman Punjabi clipboard content and gives user 1-click options:
 * 1. Convert to Gurmukhi & insert immediately.
 * 2. Review and adjust in the full Paste & Convert window.
 * 3. Paste as-is without conversion.
 * 4. Cancel.
 */

import React, { useRef } from 'react';
import { Languages, FileText, X } from 'lucide-react';
import { convertRomanPunjabiToGurmukhi } from '../../core/transliteration/textConverter';
import { defaultTransliterator } from '../../core/transliteration/defaultEngine';
import { useModalTransition } from '../hooks/useModalTransition';

export interface DirectPastePromptModalProps {
  isOpen: boolean;
  pastedText: string;
  onConvertAndInsert: (convertedText: string) => void;
  onOpenInConverter: (text: string) => void;
  onPasteAsIs: (rawText: string) => void;
  onCancel: () => void;
}

export const DirectPastePromptModal: React.FC<DirectPastePromptModalProps> = ({
  isOpen,
  pastedText,
  onConvertAndInsert,
  onOpenInConverter,
  onPasteAsIs,
  onCancel,
}) => {
  const { mounted, scrimClassName } = useModalTransition(isOpen && Boolean(pastedText));
  const lastTextRef = useRef(pastedText);
  if (pastedText) lastTextRef.current = pastedText;
  const activeText = pastedText || lastTextRef.current;

  if (!mounted || !activeText) return null;

  const previewGurmukhi = convertRomanPunjabiToGurmukhi(
    activeText.slice(0, 300),
    defaultTransliterator
  ).convertedText;

  const handleConvertAndInsert = () => {
    const fullConverted = convertRomanPunjabiToGurmukhi(
      activeText,
      defaultTransliterator
    ).convertedText;
    onConvertAndInsert(fullConverted);
  };

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div
        className="ds-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-prompt-title"
        style={{ maxWidth: '520px' }}
      >
        <div className="ds-dialog__header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages size={18} style={{ color: 'var(--text-accent)' }} />
            <span id="paste-prompt-title" className="font-semibold">
              Roman Punjabi Detected
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-200"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="ds-dialog__body space-y-3 py-2">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
            The text you are pasting appears to be Roman Punjabi. Would you like to convert it to Gurmukhi?
          </p>

          {/* Quick Preview comparison */}
          <div
            className="p-3 rounded border space-y-2"
            style={{
              background: 'var(--surface-sunken)',
              borderColor: 'var(--line-separator)',
              fontSize: 'var(--text-xs)',
            }}
          >
            <div>
              <span className="font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                Original Roman text:
              </span>
              <p className="font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                {pastedText.slice(0, 120)}
                {pastedText.length > 120 ? '...' : ''}
              </p>
            </div>

            <div>
              <span className="font-semibold block mb-0.5" style={{ color: 'var(--text-accent)' }}>
                Gurmukhi preview:
              </span>
              <p className="font-sans gurmukhi text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {previewGurmukhi.slice(0, 120)}
                {previewGurmukhi.length > 120 ? '...' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="ds-dialog__footer flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPasteAsIs(pastedText)}
              className="ds-btn ds-btn--sm flex items-center gap-1"
              title="Paste the Roman text directly without converting"
            >
              <FileText size={12} />
              <span>Paste As Is</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenInConverter(pastedText)}
              className="ds-btn ds-btn--sm flex items-center gap-1"
              title="Open the full converter to inspect suggestions and make corrections"
            >
              <span>Review in Converter</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="ds-btn ds-btn--sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConvertAndInsert}
              className="ds-btn ds-btn--primary ds-btn--sm flex items-center gap-1"
            >
              <Languages size={12} />
              <span>Convert & Insert</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
