/**
 * RecoveryModal.tsx - Interrupted Session Recovery Dialogue (Stage 1.C, REL-01, ERR-01)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useRef } from 'react';
import { RecoverySnapshot, SessionRecoveryCheckpoint } from '../../types/screenplay';
import { RotateCcw } from 'lucide-react';
import { useModalTransition } from '../hooks/useModalTransition';

interface RecoveryModalProps {
  snapshot: RecoverySnapshot | SessionRecoveryCheckpoint | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  snapshot,
  onRestore,
  onDiscard,
}) => {
  const { mounted, scrimClassName } = useModalTransition(Boolean(snapshot));
  const lastSnapshotRef = useRef(snapshot);
  if (snapshot) lastSnapshotRef.current = snapshot;
  const activeSnapshot = snapshot || lastSnapshotRef.current;

  if (!mounted || !activeSnapshot) return null;

  const date = new Date(activeSnapshot.timestamp).toLocaleString();
  const project = 'project' in activeSnapshot ? activeSnapshot.project : activeSnapshot.projectSnapshot;
  const title = project?.title || ('projectTitle' in activeSnapshot ? activeSnapshot.projectTitle : '') || 'Untitled Script';
  const draftName = 'activeDraftName' in activeSnapshot && activeSnapshot.activeDraftName
    ? activeSnapshot.activeDraftName
    : project?.drafts?.find((d) => d.id === project.activeDraftId)?.name || 'Version 1';
  const sceneHeading = 'activeSceneHeading' in activeSnapshot && activeSnapshot.activeSceneHeading
    ? activeSnapshot.activeSceneHeading
    : undefined;

  return (
    <div className={scrimClassName} style={{ zIndex: 9999 }}>
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title" style={{ maxWidth: '460px' }}>
        <div className="ds-dialog__header flex items-center gap-2">
          <RotateCcw size={16} style={{ color: 'var(--text-accent)' }} />
          <span id="recovery-title">Continue with previous session?</span>
        </div>

        <div className="ds-dialog__body">
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-body)' }}>
            An interrupted session was detected. You can restore your working project, active version, editing position, and content.
          </p>

          <div
            className="p-3.5 mt-3 space-y-1.5 rounded"
            style={{
              background: 'var(--surface-control)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-separator)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-md)' }}>
                {title}
              </span>
              <span
                className="font-mono px-2 py-0.5 rounded text-[11px]"
                style={{ background: 'var(--surface-sunken)', color: 'var(--text-accent)' }}
              >
                {draftName}
              </span>
            </div>

            {sceneHeading && (
              <p className="font-mono text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                Scene: {sceneHeading}
              </p>
            )}

            <p className="font-mono text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Last saved: {date}
            </p>
          </div>
        </div>

        <div className="ds-dialog__footer" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button
            type="button"
            onClick={onDiscard}
            className="ds-btn ds-btn--lg"
            title="Discard recovery checkpoint and proceed normally without affecting saved projects"
          >
            Discard Recovery
          </button>

          <button
            type="button"
            onClick={onRestore}
            className="ds-btn ds-btn--lg ds-btn--primary"
            title="Restore previous project, active version, and editing location"
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
};
