/**
 * RecoveryModal.tsx - Volatile crash recovery notification & restore prompt (REL-01, ERR-01)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import { RecoverySnapshot } from '../../types/screenplay';

interface RecoveryModalProps {
  snapshot: RecoverySnapshot | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  snapshot,
  onRestore,
  onDiscard,
}) => {
  if (!snapshot) return null;

  const date = new Date(snapshot.timestamp).toLocaleString();
  const title = snapshot.project?.title || 'Untitled Script';

  return (
    <div className="ds-scrim">
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <div className="ds-dialog__header">
          <span id="recovery-title">Unsaved Work Detected</span>
        </div>

        <div className="ds-dialog__body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
            An unsaved session was recovered from a previous run on this computer for:
          </p>

          <div
            className="p-3 rounded"
            style={{
              background: 'var(--surface-control)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <p className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>
              {title}
            </p>
            <p className="font-mono mt-1" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Snapshot saved: {date}
            </p>
          </div>
        </div>

        <div className="ds-dialog__footer">
          <button
            type="button"
            onClick={onDiscard}
            className="ds-btn ds-btn--lg"
          >
            Discard
          </button>

          <button
            type="button"
            onClick={onRestore}
            className="ds-btn ds-btn--lg ds-btn--primary"
          >
            Restore Session
          </button>
        </div>
      </div>
    </div>
  );
};
