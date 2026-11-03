/**
 * SwitchVersionModal.tsx - Prompt when switching versions with unsaved changes (Stage 2.C)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useModalTransition } from '../hooks/useModalTransition';

interface SwitchVersionModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSaveAndSwitch: () => void;
  onDiscardAndSwitch: () => void;
  targetVersionName: string;
}

export const SwitchVersionModal: React.FC<SwitchVersionModalProps> = ({
  isOpen,
  onCancel,
  onSaveAndSwitch,
  onDiscardAndSwitch,
  targetVersionName,
}) => {
  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="switch-version-title" style={{ maxWidth: '440px' }}>
        <div className="ds-dialog__header flex items-center gap-2">
          <AlertCircle size={16} style={{ color: 'var(--text-accent)' }} />
          <span id="switch-version-title">Unsaved Edits in Active Version</span>
        </div>

        <div className="ds-dialog__body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
            Autosave is disabled and there are unsaved changes in your current script version. What would you like to do before switching to <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{targetVersionName}&rdquo;</strong>?
          </p>
        </div>

        <div className="ds-dialog__footer" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={onCancel}
            className="ds-btn ds-btn--lg"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDiscardAndSwitch}
            className="ds-btn ds-btn--lg"
            style={{ color: 'var(--text-danger)' }}
          >
            Discard Edits
          </button>

          <button
            type="button"
            onClick={onSaveAndSwitch}
            className="ds-btn ds-btn--lg ds-btn--primary"
          >
            Save &amp; Switch
          </button>
        </div>
      </div>
    </div>
  );
};
