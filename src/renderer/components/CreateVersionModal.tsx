/**
 * CreateVersionModal.tsx - Modal for creating an independent screenplay version
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { useModalTransition } from '../hooks/useModalTransition';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (customName?: string) => void;
  nextVersionNumber: number;
  activeVersionName: string;
}

export const CreateVersionModal: React.FC<CreateVersionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  nextVersionNumber,
  activeVersionName,
}) => {
  const { mounted, scrimClassName } = useModalTransition(isOpen);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomName('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(customName.trim() || undefined);
    onClose();
  };

  const previewName = customName.trim()
    ? customName.trim().toLowerCase().startsWith('version ') || customName.trim().toLowerCase().startsWith('v')
      ? customName.trim()
      : `Version ${nextVersionNumber} — ${customName.trim()}`
    : `Version ${nextVersionNumber}`;

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="create-version-title" style={{ maxWidth: '440px' }}>
        <form onSubmit={handleSubmit}>
          <div className="ds-dialog__header flex items-center gap-2">
            <Layers size={16} style={{ color: 'var(--text-accent)' }} />
            <span id="create-version-title">Create New Version</span>
          </div>

          <div className="ds-dialog__body space-y-3">
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
              Create an independent copy of <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{activeVersionName}&rdquo;</strong> to experiment with storylines, dialogue, or alternate endings without modifying the original.
            </p>

            <div className="ds-field">
              <label htmlFor="version-name-input" className="ds-label block mb-1">
                Version Name (Optional)
              </label>
              <input
                id="version-name-input"
                ref={inputRef}
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Alternate Story, Revised Ending"
                className="ds-input w-full"
                style={{
                  height: 'var(--h-md)',
                  padding: '0 var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  background: 'var(--surface-control)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--line-separator)',
                }}
              />
            </div>

            <div
              className="p-2.5 rounded flex items-center justify-between"
              style={{
                background: 'var(--surface-sunken)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-separator)',
              }}
            >
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Will be created as:
              </span>
              <span className="font-mono text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Layers size={11} style={{ color: 'var(--text-accent)' }} />
                <span>{previewName}</span>
              </span>
            </div>
          </div>

          <div className="ds-dialog__footer" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={onClose}
              className="ds-btn ds-btn--lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="ds-btn ds-btn--lg ds-btn--primary"
            >
              Create Version
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
