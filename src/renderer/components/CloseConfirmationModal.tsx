/**
 * CloseConfirmationModal.tsx - Context-aware application close confirmation dialogue
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { SaveStatus } from '../../types/screenplay';
import { useModalTransition } from '../hooks/useModalTransition';

interface CloseConfirmationModalProps {
  isOpen: boolean;
  autosaveEnabled: boolean;
  saveStatus: SaveStatus;
  projectTitle: string;
  onConfirmClose: () => void;
  onSaveAndClose: () => Promise<void>;
  onCloseWithoutSaving: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export const CloseConfirmationModal: React.FC<CloseConfirmationModalProps> = ({
  isOpen,
  autosaveEnabled,
  saveStatus,
  projectTitle,
  onConfirmClose,
  onSaveAndClose,
  onCloseWithoutSaving,
  onCancel,
  isSaving = false,
  saveError = null,
}) => {
  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  const hasUnsavedChanges = saveStatus === 'dirty' || saveStatus === 'error' || !autosaveEnabled && saveStatus !== 'clean';

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="close-dialog-title" style={{ maxWidth: '440px' }}>
        <div className="ds-dialog__header">
          <span id="close-dialog-title">
            {hasUnsavedChanges ? 'Unsaved Changes' : 'Close AkharStudio'}
          </span>
        </div>

        <div className="ds-dialog__body">
          {hasUnsavedChanges ? (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
                You have unsaved changes in <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{projectTitle || 'Untitled Script'}&rdquo;</strong>.
                Would you like to save your changes before closing?
              </p>

              {saveError && (
                <div
                  className="mt-3 p-3 rounded flex items-start gap-2"
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--text-danger)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-danger)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Saving failed:</span>
                    <span>{saveError}. Please retry or stay in the application.</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
              Are you sure you want to close AkharStudio? All your changes are safely saved.
            </p>
          )}
        </div>

        <div className="ds-dialog__footer" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="ds-btn ds-btn--lg"
          >
            Cancel
          </button>

          {hasUnsavedChanges ? (
            <>
              <button
                type="button"
                onClick={onCloseWithoutSaving}
                disabled={isSaving}
                className="ds-btn ds-btn--lg"
                style={{ color: 'var(--text-danger)' }}
              >
                Close Without Saving
              </button>

              <button
                type="button"
                onClick={onSaveAndClose}
                disabled={isSaving}
                className="ds-btn ds-btn--lg ds-btn--primary flex items-center gap-1.5"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                <span>{isSaving ? 'Saving...' : 'Save & Close'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConfirmClose}
              className="ds-btn ds-btn--lg ds-btn--primary"
            >
              Close AkharStudio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
