/**
 * AboutModal.tsx - Application About dialog
 * Displays centralized version, credits, and metadata.
 * Follows the Script Editor Design System.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AkharStudioLogo } from './AkharStudioLogo';
import { APP_VERSION, APP_AUTHOR, APP_FULL_NAME } from '../../core/version';
import { useModalTransition } from '../hooks/useModalTransition';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  return (
    <div
      className={scrimClassName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ds-dialog flex flex-col"
        style={{ width: '460px', maxWidth: 'calc(100vw - 32px)' }}
        role="dialog"
        aria-labelledby="about-title"
      >
        {/* Header */}
        <div className="ds-dialog__header">
          <span id="about-title">About</span>
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

        {/* Body */}
        <div className="ds-dialog__body flex flex-col items-center text-center py-6 px-6 space-y-4">
          {/* Logo */}
          <div className="p-3 rounded-2xl" style={{ background: 'var(--surface-control)' }}>
            <AkharStudioLogo size="lg" />
          </div>

          <div>
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {APP_FULL_NAME}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span
                className="font-mono text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-accent)',
                  border: '1px solid var(--line-edge)',
                }}
              >
                Version {APP_VERSION}
              </span>
            </div>
          </div>

          <p
            className="text-xs leading-relaxed max-w-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            A desktop-first, local-first Punjabi screenplay editor engineered for writers,
            screenplays, and cinematic narratives in Gurmukhi and English.
          </p>

          <div
            className="w-full pt-4 border-t flex flex-col items-center gap-1"
            style={{ borderColor: 'var(--line-separator)' }}
          >
            <div
              className="text-xs font-medium flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <span>Created By</span>
              <strong className="tracking-wide" style={{ color: 'var(--text-accent)' }}>
                {APP_AUTHOR}
              </strong>
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Offline-First · Punjabi Screenwriting Studio
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="ds-dialog__footer">
          <button
            type="button"
            onClick={onClose}
            className="ds-btn ds-btn--lg ds-btn--primary"
            autoFocus
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
