/**
 * ContdPromptModal.tsx - One-time project prompt for automatic (CONT'D) labels (CONT-01, T-06)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import { ContdSetting } from '../../types/screenplay';

interface ContdPromptModalProps {
  isOpen: boolean;
  characterName: string;
  onChoice: (setting: ContdSetting) => void;
}

export const ContdPromptModal: React.FC<ContdPromptModalProps> = ({
  isOpen,
  characterName,
  onChoice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="ds-scrim">
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="contd-title">
        <div className="ds-dialog__header">
          <span id="contd-title">Repeated Character Dialogue (CONT&apos;D)</span>
        </div>

        <div className="ds-dialog__body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{characterName}</strong> speaks again consecutively in this scene. Would you like this screenplay to automatically display{' '}
            <code style={{ background: 'var(--surface-control)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
              (CONT&apos;D)
            </code>{' '}
            on repeated cues?
          </p>

          <p className="ds-help">
            This setting applies to this screenplay project and can be adjusted anytime in the Document settings.
          </p>
        </div>

        <div className="ds-dialog__footer">
          <button
            type="button"
            onClick={() => onChoice('off')}
            className="ds-btn ds-btn--lg"
          >
            Don&apos;t Add
          </button>

          <button
            type="button"
            onClick={() => onChoice('on')}
            className="ds-btn ds-btn--lg ds-btn--primary"
          >
            Automatically Add (CONT&apos;D)
          </button>
        </div>
      </div>
    </div>
  );
};
