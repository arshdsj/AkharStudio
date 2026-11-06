/**
 * RemoveVersionModal.tsx - Context-aware confirmation dialog for removing a screenplay version
 * Strictly adheres to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useModalTransition } from '../hooks/useModalTransition';

interface RemoveVersionModalProps {
  isOpen: boolean;
  versionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RemoveVersionModal: React.FC<RemoveVersionModalProps> = ({
  isOpen,
  versionName,
  onConfirm,
  onCancel,
}) => {
  const { mounted, scrimClassName } = useModalTransition(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!mounted) return null;

  return (
    <div
      className={scrimClassName}
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="ds-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-version-title"
        aria-describedby="remove-version-desc"
        style={{ maxWidth: '440px' }}
      >
        <div className="ds-dialog__header flex items-center gap-2">
          <AlertCircle size={17} style={{ color: 'var(--text-danger)' }} className="shrink-0" />
          <span id="remove-version-title">Close and Remove Version</span>
        </div>

        <div className="ds-dialog__body space-y-2">
          <p
            id="remove-version-desc"
            style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-body)',
              fontWeight: 'var(--weight-medium)',
            }}
          >
            Are you sure you want to close and remove &ldquo;{versionName}&rdquo;?
          </p>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-body)',
            }}
          >
            This version contains screenplay text that will be permanently removed. The rest of your screenplay will remain intact.
          </p>
        </div>

        <div className="ds-dialog__footer" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="ds-btn ds-btn--lg"
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="ds-btn ds-btn--lg"
            style={{
              background: 'var(--red-600, #d9473f)',
              color: 'var(--text-on-accent, #ffffff)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            Remove Version
          </button>
        </div>
      </div>
    </div>
  );
};
