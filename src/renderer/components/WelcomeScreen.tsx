/**
 * WelcomeScreen.tsx - Visually stunning, immersive Launch & Welcome Experience
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, themes.css)
 *
 * Enhancements:
 * - Layered motion & entrance choreography with smooth spring-like bezier curves
 * - Luminous ambient aura & backdrop glass styling
 * - Ultra-responsive instant tooltips for backup & utility icons (no delayed native tooltips)
 * - Hero branding with interactive script switching
 * - Exactly ONE instance of the primary action: "New Screenplay" (.ds-btn--primary in footer)
 * - Clear distinction of internal database vs external files
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
  Sparkles,
} from 'lucide-react';
import { AkharStudioLogo } from './AkharStudioLogo';
import { Tooltip } from './Tooltip';
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
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={dialogRef}
        className="welcome-dialog-shell ds-dialog max-h-[88vh] flex flex-col relative"
        role="dialog"
        aria-labelledby="welcome-title"
        style={{
          width: '560px',
        }}
      >
        {/* Ambient luminous glow effect (fluid motion) */}
        <div className="welcome-aura" aria-hidden="true" />

        {/* Top Header Row with fast responsive tooltips */}
        <div className="ds-dialog__header flex items-center justify-between relative z-10 welcome-anim-1">
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: 'var(--text-accent)' }} className="opacity-80" />
            <span
              id="welcome-title"
              className="text-xs uppercase tracking-wider font-mono font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Welcome to Akhar Studio
            </span>
          </div>

          {/* Top-Right Corner: Instant responsive tooltips for Export DB, Restore DB, and Close */}
          <div className="flex items-center gap-1">
            {onExportBackup && (
              <Tooltip content="Export Database Backup..." position="bottom" delay={30}>
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="ds-icon-btn transition-transform active:scale-95"
                  aria-label="Export Database Backup"
                >
                  <Download size={15} />
                </button>
              </Tooltip>
            )}

            <Tooltip content="Restore Database Backup..." position="bottom" delay={30}>
              <button
                type="button"
                onClick={onRestoreBackup}
                className="ds-icon-btn transition-transform active:scale-95"
                aria-label="Restore Database Backup"
              >
                <ArchiveRestore size={15} />
              </button>
            </Tooltip>

            {canDismiss && (
              <Tooltip content="Close (Escape)" position="bottom" delay={30}>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="ds-icon-btn transition-transform active:scale-95"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Dialog Body with layered staggered animations */}
        <div className="ds-dialog__body overflow-y-auto relative z-10 space-y-5 py-4">
          {/* Prominent Hero Branding Section */}
          <div className="flex flex-col items-center text-center pt-2 pb-2 welcome-anim-2">
            <div className="p-2 rounded-2xl transition-transform hover:scale-[1.02] duration-300">
              <AkharStudioLogo mode={logoMode} size="xl" className="justify-center" />
            </div>

            <p
              className="ds-help mt-3 text-center max-w-md text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Desktop-first Punjabi screenplay editor with instant local persistence and offline transliteration.
            </p>

            <div
              className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-mono border"
              style={{
                background: 'var(--surface-sunken)',
                borderColor: 'var(--line-separator)',
                color: 'var(--text-disabled)',
              }}
            >
              <span>Version {APP_VERSION}</span>
              <span>·</span>
              <span>Created By {APP_AUTHOR}</span>
            </div>
          </div>

          {/* Recent Screenplays Section */}
          <section className="ds-section welcome-anim-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="ds-section__title text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Recent Screenplays
              </h3>
              <span
                className="font-mono text-xs px-2 py-0.5 rounded"
                style={{
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-secondary)',
                }}
              >
                {recentProjects.length} {recentProjects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            {recentProjects.length === 0 ? (
              <div
                className="ds-empty rounded-lg p-6 border border-dashed flex flex-col items-center justify-center text-center"
                style={{
                  borderColor: 'var(--line-separator)',
                  background: 'var(--surface-sunken)',
                }}
              >
                <FileText size={26} className="opacity-40 mb-2" style={{ color: 'var(--text-secondary)' }} />
                <div className="ds-empty__title font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  No screenplays yet
                </div>
                <div className="ds-help text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Click &ldquo;New Screenplay&rdquo; below to start writing.
                </div>
              </div>
            ) : (
              <div
                className="ds-list rounded-lg overflow-hidden border"
                style={{
                  maxHeight: '230px',
                  overflowY: 'auto',
                  borderColor: 'var(--line-separator)',
                  background: 'var(--surface-sunken)',
                }}
              >
                {recentProjects.map((rec) => {
                  const isDb = rec.source === 'database' || !rec.filePath;
                  return (
                    <button
                      key={rec.id + (rec.filePath || '')}
                      type="button"
                      onClick={() => onOpenRecent(rec)}
                      className="ds-row ds-row--two-line w-full text-left transition-colors group px-3 py-2 border-b last:border-b-0"
                      style={{
                        borderColor: 'var(--line-separator)',
                      }}
                    >
                      {isDb ? (
                        <Database
                          className="ds-row__icon shrink-0 group-hover:scale-110 transition-transform"
                          size={16}
                          style={{ color: 'var(--text-accent)' }}
                        />
                      ) : (
                        <FileText
                          className="ds-row__icon shrink-0 group-hover:scale-110 transition-transform"
                          size={16}
                          style={{ color: 'var(--text-secondary)' }}
                        />
                      )}

                      <span className="ds-row__label flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span
                            className="truncate font-medium text-sm group-hover:text-[var(--text-accent)] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {rec.title || 'Untitled Screenplay'}
                          </span>

                          {/* Visual Distinction Tag */}
                          {isDb ? (
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-semibold rounded shrink-0"
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

                        <span className="ds-row__sub font-mono truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {isDb
                            ? `${rec.pageCount || 1} pages${rec.wordCount !== undefined ? ` · ${rec.wordCount} words` : ''}`
                            : rec.filePath}
                        </span>
                      </span>

                      <span className="ds-row__meta font-mono shrink-0 text-xs text-right mr-1" style={{ color: 'var(--text-disabled)' }}>
                        {rec.modifiedAt
                          ? new Date(rec.modifiedAt).toLocaleDateString()
                          : ''}
                      </span>
                      <ChevronRight
                        className="ds-row__chevron shrink-0 group-hover:translate-x-0.5 transition-transform"
                        size={15}
                        style={{ color: 'var(--text-disabled)' }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer: Exactly ONE instance of the primary action (New Screenplay) */}
        <div className="ds-dialog__footer flex items-center justify-between relative z-10 welcome-anim-4">
          <button
            type="button"
            onClick={onOpenExternalFile}
            className="ds-btn ds-btn--lg flex items-center gap-2 transition-transform active:scale-98"
            aria-label="Open File"
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
              className="ds-btn ds-btn--lg ds-btn--primary flex items-center gap-2 shadow-md transition-transform active:scale-98"
              autoFocus
              aria-label="New Screenplay"
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
