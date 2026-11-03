/**
 * WelcomeScreen.tsx - Launch Screen adhering strictly to the Script Editor Design System
 * (tokens.css, components.css, design-rules.md, reference.html)
 *
 * Requirements:
 * - Rendered as a compact floating window (.ds-dialog) centered over .ds-scrim
 * - The actual application canvas is visible behind it through the scrim
 * - Prominent official brand logo (AkharStudio / ਅੱਖਰStudio) alternating per launch
 * - Top-right compact icon-only utility buttons: Export Database Backup, Restore Database Backup, Close
 * - Tooltips on hover, no permanently visible labels for utility buttons
 * - Exactly ONE instance of the primary action: "New Screenplay" (.ds-btn--primary in footer)
 * - Clean, uncluttered layout with primary focus on creating a new screenplay
 * - Visually distinguishes internal database projects from external files using design tokens
 */

import React, { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderOpen,
  Database,
  FileText,
  ArchiveRestore,
  Download,
  ChevronRight,
  X,
} from 'lucide-react';
import { AkharStudioLogo } from './AkharStudioLogo';
import { RecentProject } from '../../types/screenplay';
import { APP_VERSION, APP_AUTHOR } from '../../core/version';
import { useModalTransition } from '../hooks/useModalTransition';

interface WelcomeScreenProps {
  isOpen?: boolean;
  logoMode: 'en' | 'pa';
  recentProjects: RecentProject[];
  onNewDatabaseProject: () => void;
  onOpenExternalFile: () => void;
  onOpenRecent: (project: RecentProject) => void;
  onRestoreBackup: () => void;
  onExportBackup?: () => void;
  canDismiss?: boolean;
  onDismiss?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  isOpen = true,
  logoMode,
  recentProjects,
  onNewDatabaseProject,
  onOpenExternalFile,
  onOpenRecent,
  onRestoreBackup,
  onExportBackup,
  canDismiss = true,
  onDismiss = () => {},
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { mounted, scrimClassName } = useModalTransition(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canDismiss) {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canDismiss, onDismiss]);

  if (!mounted) return null;

  return (
    <div
      className={scrimClassName}
      onClick={(e) => {
        if (e.target === e.currentTarget && canDismiss) {
          onDismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="ds-dialog max-h-[85vh] flex flex-col"
        role="dialog"
        aria-labelledby="welcome-title"
      >
        {/* Top bar with icon-only controls in the top-right corner */}
        <div className="ds-dialog__header flex items-center justify-between">
          <span
            id="welcome-title"
            className="text-xs uppercase tracking-wider font-mono font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Welcome
          </span>

          {/* Top-Right Corner: Export DB, Restore DB, and Close */}
          <div className="flex items-center gap-1">
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="ds-icon-btn"
                title="Export Database Backup..."
                aria-label="Export Database Backup"
              >
                <Download size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onRestoreBackup}
              className="ds-icon-btn"
              title="Restore Database Backup..."
              aria-label="Restore Database Backup"
            >
              <ArchiveRestore size={16} />
            </button>

            {canDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="ds-icon-btn"
                title="Close (Escape)"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Dialog Body */}
        <div className="ds-dialog__body overflow-y-auto">
          {/* Prominent Hero Logo Section */}
          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <AkharStudioLogo mode={logoMode} size="xl" className="justify-center" />
            <p
              className="ds-help mt-3 text-center max-w-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Desktop-first Punjabi screenplay editor with instant local persistence and offline transliteration.
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--text-disabled)' }}>
              <span>Version {APP_VERSION}</span>
              <span>·</span>
              <span>Created By {APP_AUTHOR}</span>
            </div>
          </div>

          {/* Recent Screenplays Section */}
          <section className="ds-section">
            <div className="flex items-center justify-between">
              <h3 className="ds-section__title">Recent Screenplays</h3>
              <span className="ds-help font-mono">
                {recentProjects.length} {recentProjects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            {recentProjects.length === 0 ? (
              <div className="ds-empty">
                <FileText size={24} />
                <div className="ds-empty__title">No screenplays yet</div>
                <div className="ds-help">Click "New Screenplay" below to start writing.</div>
              </div>
            ) : (
              <div className="ds-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {recentProjects.map((rec) => {
                  const isDb = rec.source === 'database' || !rec.filePath;
                  return (
                    <button
                      key={rec.id + (rec.filePath || '')}
                      type="button"
                      onClick={() => onOpenRecent(rec)}
                      className="ds-row ds-row--two-line"
                    >
                      {isDb ? (
                        <Database className="ds-row__icon" size={16} />
                      ) : (
                        <FileText className="ds-row__icon" size={16} />
                      )}

                      <span className="ds-row__label">
                        <span className="flex items-center gap-2">
                          <span className="truncate">{rec.title || 'Untitled Screenplay'}</span>
                          {/* Visual Distinction Tag (Requirement 7) */}
                          {isDb ? (
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0"
                              style={{
                                background: 'var(--surface-selected)',
                                color: 'var(--text-accent)',
                              }}
                            >
                              Database
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-medium rounded shrink-0"
                              style={{
                                background: 'var(--surface-control)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              External File
                            </span>
                          )}
                        </span>
                        <span className="ds-row__sub font-mono truncate">
                          {isDb
                            ? `${rec.pageCount || 1} pages${rec.wordCount !== undefined ? ` · ${rec.wordCount} words` : ''}`
                            : rec.filePath}
                        </span>
                      </span>

                      <span className="ds-row__meta font-mono shrink-0">
                        {rec.modifiedAt
                          ? new Date(rec.modifiedAt).toLocaleDateString()
                          : ''}
                      </span>
                      <ChevronRight className="ds-row__chevron" size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer: Single primary focus on New Screenplay, with Open File on the left */}
        <div className="ds-dialog__footer flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenExternalFile}
            className="ds-btn ds-btn--lg flex items-center gap-2"
            title="Open an existing external screenplay (.scriptproject, .json)"
          >
            <FolderOpen size={16} />
            <span>Open File...</span>
          </button>

          <div className="flex items-center gap-2">
            {canDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="ds-btn ds-btn--lg"
              >
                Dismiss
              </button>
            )}
            <button
              type="button"
              onClick={onNewDatabaseProject}
              className="ds-btn ds-btn--lg ds-btn--primary flex items-center gap-2"
              autoFocus
            >
              <FilePlus size={16} />
              <span>New Screenplay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
