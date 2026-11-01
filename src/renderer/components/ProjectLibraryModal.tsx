/**
 * ProjectLibraryModal.tsx - Project Library and File Management (PROJ-01, STORE-01, STORE-02, EXPORT-02, TM-16)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderOpen,
  X,
  FileDown,
  Code2,
  ChevronRight,
  Database,
  ArchiveRestore,
  Download,
  FileText,
} from 'lucide-react';
import { RecentProject } from '../../types/screenplay';

interface ProjectLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onOpenFile: () => void;
  recentProjects: RecentProject[];
  onOpenRecent: (project: RecentProject) => void;
  onImportFountain?: () => void;
  onImportBundle?: () => void;
  onExportBackup?: () => void;
  onRestoreBackup?: () => void;
}

export const ProjectLibraryModal: React.FC<ProjectLibraryModalProps> = ({
  isOpen,
  onClose,
  onNewProject,
  onOpenFile,
  recentProjects,
  onOpenRecent,
  onImportFountain,
  onImportBundle,
  onExportBackup,
  onRestoreBackup,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ds-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="ds-dialog max-h-[85vh] flex flex-col"
        role="dialog"
        aria-labelledby="library-title"
      >
        {/* Header */}
        <div className="ds-dialog__header">
          <span id="library-title">Project Library</span>
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

        {/* Dialog Body */}
        <div className="ds-dialog__body overflow-y-auto">
          {/* Actions Section */}
          <section className="ds-section">
            <h3 className="ds-section__title">Actions</h3>
            <div className="ds-list">
              <button
                type="button"
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="ds-row ds-row--two-line"
              >
                <FilePlus className="ds-row__icon" size={16} />
                <span className="ds-row__label">
                  New Screenplay
                  <span className="ds-row__sub">Create database-backed screenplay</span>
                </span>
                <ChevronRight className="ds-row__chevron" size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenFile();
                  onClose();
                }}
                className="ds-row ds-row--two-line"
              >
                <FolderOpen className="ds-row__icon" size={16} />
                <span className="ds-row__label">
                  Open Project File...
                  <span className="ds-row__sub">Open existing .scriptproject or .json</span>
                </span>
                <ChevronRight className="ds-row__chevron" size={16} />
              </button>

              {onExportBackup && (
                <button
                  type="button"
                  onClick={() => {
                    onExportBackup();
                    onClose();
                  }}
                  className="ds-row ds-row--two-line"
                >
                  <Download className="ds-row__icon" size={16} />
                  <span className="ds-row__label">
                    Export Full Database Backup
                    <span className="ds-row__sub">Portable .akharbackup of all screenplays & assets</span>
                  </span>
                  <ChevronRight className="ds-row__chevron" size={16} />
                </button>
              )}

              {onRestoreBackup && (
                <button
                  type="button"
                  onClick={() => {
                    onRestoreBackup();
                    onClose();
                  }}
                  className="ds-row ds-row--two-line"
                >
                  <ArchiveRestore className="ds-row__icon" size={16} />
                  <span className="ds-row__label">
                    Restore Database Backup...
                    <span className="ds-row__sub">Import screenplays from a backup archive</span>
                  </span>
                  <ChevronRight className="ds-row__chevron" size={16} />
                </button>
              )}

              {onImportFountain && (
                <button
                  type="button"
                  onClick={() => {
                    onImportFountain();
                    onClose();
                  }}
                  className="ds-row ds-row--two-line"
                >
                  <Code2 className="ds-row__icon" size={16} />
                  <span className="ds-row__label">
                    Import Fountain
                    <span className="ds-row__sub">.fountain with Gurmukhi @ cues</span>
                  </span>
                  <ChevronRight className="ds-row__chevron" size={16} />
                </button>
              )}

              {onImportBundle && (
                <button
                  type="button"
                  onClick={() => {
                    onImportBundle();
                    onClose();
                  }}
                  className="ds-row ds-row--two-line"
                >
                  <FileDown className="ds-row__icon" size={16} />
                  <span className="ds-row__label">
                    Import Project Copy
                    <span className="ds-row__sub">Fork bundle to a new project</span>
                  </span>
                  <ChevronRight className="ds-row__chevron" size={16} />
                </button>
              )}
            </div>
          </section>

          {/* Recent Projects Section */}
          <section className="ds-section">
            <h3 className="ds-section__title">Recent Projects</h3>
            {recentProjects.length === 0 ? (
              <p className="ds-help italic" style={{ padding: 'var(--space-2) 0' }}>
                No recent projects found on this machine.
              </p>
            ) : (
              <div className="ds-list">
                {recentProjects.map((rec) => {
                  const isDb = rec.source === 'database' || !rec.filePath;
                  return (
                    <button
                      key={rec.id + (rec.filePath || '')}
                      type="button"
                      onClick={() => {
                        onOpenRecent(rec);
                        onClose();
                      }}
                      className="ds-row ds-row--two-line"
                    >
                      {isDb ? (
                        <Database className="ds-row__icon" size={16} />
                      ) : (
                        <FileText className="ds-row__icon" size={16} />
                      )}
                      <span className="ds-row__label">
                        <span className="flex items-center gap-2">
                          <span>{rec.title || 'Untitled Script'}</span>
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
                              File
                            </span>
                          )}
                        </span>
                        <span className="ds-row__sub font-mono truncate">
                          {isDb
                            ? `${rec.pageCount || 1} pages${rec.wordCount !== undefined ? ` · ${rec.wordCount} words` : ''}`
                            : rec.filePath}
                        </span>
                      </span>
                      <span className="ds-row__meta font-mono">
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

        {/* Footer */}
        <div className="ds-dialog__footer">
          <button type="button" onClick={onClose} className="ds-btn ds-btn--lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
