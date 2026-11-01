/**
 * HelpShortcutsModal.tsx - Keyboard shortcuts and Punjabi typing reference (STAT-01, UX-01)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { APP_VERSION, APP_AUTHOR, APP_FULL_NAME } from '../../core/version';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
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

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const mod = isMac ? '⌘' : 'Ctrl+';

  return (
    <div
      className="ds-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ds-dialog max-h-[85vh] flex flex-col"
        style={{ width: '640px', maxWidth: 'calc(100vw - 32px)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        {/* Header */}
        <div className="ds-dialog__header">
          <span id="help-title">Keyboard Shortcuts & Punjabi Typing</span>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-btn"
            aria-label="Close"
            title="Close dialog (Escape)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="ds-dialog__body overflow-y-auto space-y-6">
          {/* Screenplay Element Shortcuts */}
          <section className="ds-section">
            <h3 className="ds-section__title">Screenplay Elements</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {[
                { label: 'Scene Heading', shortcut: `${mod}1` },
                { label: 'Action', shortcut: `${mod}2` },
                { label: 'Character', shortcut: `${mod}3` },
                { label: 'Parenthetical', shortcut: `${mod}4` },
                { label: 'Dialogue', shortcut: `${mod}5` },
                { label: 'Shot', shortcut: `${mod}6` },
                { label: 'Transition', shortcut: `${mod}7` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-center px-3 py-2 rounded"
                  style={{ background: 'var(--surface-control)', fontSize: 'var(--text-xs)' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <kbd
                    className="px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
                  >
                    {item.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* Screenplay Flow */}
          <section className="ds-section">
            <h3 className="ds-section__title">Screenplay Flow & Typing</h3>
            <div className="space-y-1.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Enter:</strong> At end of Character block → creates Dialogue block. At end of Dialogue → creates Action block.
              </p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Tab:</strong> On empty Action block → opens element picker (cycles Character).
              </p>
              <p>
                <strong style={{ color: 'var(--text-primary)' }}>Backspace:</strong> At start of empty block → converts to previous block type or merges.
              </p>
            </div>
          </section>

          {/* Phonetic Punjabi Reference */}
          <section className="ds-section">
            <h3 className="ds-section__title">Phonetic Punjabi Input Reference</h3>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {[
                { roman: 'kitthe', pa: 'ਕਿੱਥੇ' },
                { roman: 'putt', pa: 'ਪੁੱਤ' },
                { roman: 'punjab', pa: 'ਪੰਜਾਬ' },
                { roman: 'munda', pa: 'ਮੁੰਡਾ' },
                { roman: 'kudi', pa: 'ਕੁੜੀ' },
                { roman: 'zindagi', pa: 'ਜ਼ਿੰਦਗੀ' },
              ].map((pair) => (
                <div
                  key={pair.roman}
                  className="px-3 py-2 rounded flex justify-between items-center"
                  style={{ background: 'var(--surface-control)', fontSize: 'var(--text-xs)' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{pair.roman}</span>
                  <span className="font-bold gurmukhi" style={{ color: 'var(--text-primary)' }}>{pair.pa}</span>
                </div>
              ))}
            </div>

            <div
              className="mt-2 p-3 rounded space-y-1"
              style={{ background: 'var(--surface-control)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Explicit Punctuation & Mark Tokens:</p>
              <p><code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{ADDAK}"}</code> or <code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{A}"}</code> → ੱ (Gemination)</p>
              <p><code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{TIPPI}"}</code> or <code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{TP}"}</code> → ੰ (Nasalization)</p>
              <p><code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{BINDI}"}</code> or <code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{BD}"}</code> → ਂ (Bindi)</p>
              <p><code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{DANDA}"}</code> or <code style={{ background: 'var(--surface-sunken)', padding: '1px 4px', borderRadius: '3px' }}>{"{DA}"}</code> → । (Purna Viram)</p>
            </div>
          </section>

          {/* About Section (Requirement 2) */}
          <section className="ds-section pt-4 border-t" style={{ borderColor: 'var(--line-separator)' }}>
            <h3 className="ds-section__title flex items-center gap-1.5">
              <Info size={13} />
              <span>About {APP_FULL_NAME}</span>
            </h3>
            <div className="p-3 rounded space-y-1.5" style={{ background: 'var(--surface-control)', fontSize: 'var(--text-xs)' }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Version</span>
                <span className="font-mono font-medium px-2 py-0.5 rounded" style={{ background: 'var(--surface-sunken)', color: 'var(--text-accent)' }}>
                  {APP_VERSION}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'var(--text-secondary)' }}>Created By</span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {APP_AUTHOR}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="ds-dialog__footer">
          <button type="button" onClick={onClose} className="ds-btn ds-btn--lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
