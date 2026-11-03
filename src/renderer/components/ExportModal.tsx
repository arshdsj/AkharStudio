/**
 * ExportModal.tsx - Screenplay export dialog (EXPORT-01, EXPORT-02, STORE-02, TM-16)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect } from 'react';
import { PaperSize, ScriptProject, ScreenplayBlock } from '../../types/screenplay';
import { useModalTransition } from '../hooks/useModalTransition';

export type ExportArea = 'entire_script' | 'selected_pages' | 'highlighted_text' | 'character_sheet';

export interface ExportPdfOptions {
  paperSize: PaperSize;
  includeTitlePage: boolean;
  exportArea: ExportArea;
  pageRange?: { from: number; to: number };
  highlightedBlocks?: ScreenplayBlock[];
  password?: string;
  preserveCharacterHighlights?: boolean;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ScriptProject;
  currentPaperSize: PaperSize;
  totalPages?: number;
  highlightedBlocks?: ScreenplayBlock[] | null;
  onExportPdf: (options: ExportPdfOptions) => void;
  onExportText: () => void;
  onExportFountain: () => void;
  onExportNativeProject: () => void;
  onExportDatabaseBackup?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentPaperSize,
  totalPages = 1,
  highlightedBlocks = null,
  onExportPdf,
  onExportText,
  onExportFountain,
  onExportNativeProject,
  onExportDatabaseBackup,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>(currentPaperSize);
  const [includeTitlePage, setIncludeTitlePage] = useState(true);
  const [exportArea, setExportArea] = useState<ExportArea>('entire_script');
  const [fromPage, setFromPage] = useState<number>(1);
  const [toPage, setToPage] = useState<number>(Math.max(1, totalPages));
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [preserveCharacterHighlights, setPreserveCharacterHighlights] = useState<boolean>(() => {
    return Boolean(project?.settings?.highlightCharacters?.enabled);
  });

  useEffect(() => {
    setPaperSize(currentPaperSize);
  }, [currentPaperSize]);

  useEffect(() => {
    if (isOpen) {
      setFromPage(1);
      setToPage(Math.max(1, totalPages));
      setExportArea('entire_script');
      setIsPasswordProtected(false);
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setPreserveCharacterHighlights(Boolean(project?.settings?.highlightCharacters?.enabled));
    }
  }, [isOpen, totalPages, project?.settings?.highlightCharacters?.enabled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validation for selected pages
  const isPageRangeValid = fromPage >= 1 && toPage <= totalPages && fromPage <= toPage;
  let pageRangeError = '';
  if (!isPageRangeValid) {
    if (fromPage < 1) {
      pageRangeError = 'Starting page must be at least 1.';
    } else if (toPage > totalPages) {
      pageRangeError = `Ending page cannot exceed total script pages (${totalPages}).`;
    } else if (fromPage > toPage) {
      pageRangeError = `Starting page (${fromPage}) cannot be greater than ending page (${toPage}).`;
    } else {
      pageRangeError = 'Invalid page range.';
    }
  }

  // Validation for password protection
  let passwordError = '';
  const isPasswordValid = !isPasswordProtected || (password.trim().length > 0 && password === confirmPassword);
  if (isPasswordProtected) {
    if (!password.trim()) {
      passwordError = 'Please enter a password.';
    } else if (password !== confirmPassword) {
      passwordError = 'Passwords do not match.';
    }
  }

  // Validation for highlighted text
  const hasSelectedText = Boolean(
    highlightedBlocks &&
      highlightedBlocks.length > 0 &&
      highlightedBlocks.some((b) => b.text && b.text.trim().length > 0)
  );

  let canExport = isPasswordValid;
  if (exportArea === 'selected_pages') {
    canExport = canExport && isPageRangeValid;
  } else if (exportArea === 'highlighted_text') {
    canExport = canExport && hasSelectedText;
  }

  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  return (
    <div
      className={scrimClassName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        {/* Dialog Header */}
        <div className="ds-dialog__header">
          <span id="dlg-title">Export</span>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-btn"
            aria-label="Close"
            title="Close dialog (Escape)"
          >
            <svg><use href="#i-close" /></svg>
          </button>
        </div>

        {/* Dialog Body */}
        <div className="ds-dialog__body">
          {/* Screenplay PDF Section */}
          <section className="ds-section">
            <h3 className="ds-section__title">Screenplay PDF</h3>

            {/* Export Area Setting (Requirement 3) */}
            <div className="ds-field">
              <label htmlFor="export-area-select" className="ds-label">
                Export Area
              </label>
              <select
                id="export-area-select"
                value={exportArea}
                onChange={(e) => setExportArea(e.target.value as ExportArea)}
                className="ds-select font-medium"
              >
                <option value="entire_script">Entire Script</option>
                <option value="selected_pages">Selected Pages</option>
                <option value="highlighted_text">Highlighted Text</option>
                <option value="character_sheet">Character Sheet</option>
              </select>
            </div>

            {/* Selected Pages Inputs (Requirement 3.B) */}
            {exportArea === 'selected_pages' && (
              <div
                className="ds-field p-3 rounded space-y-2 border"
                style={{
                  background: 'var(--surface-control)',
                  borderColor: isPageRangeValid ? 'var(--line-separator)' : 'var(--red-600, #dc2626)',
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="ds-label text-xs" htmlFor="from-page-input">
                      From Page
                    </label>
                    <input
                      id="from-page-input"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={fromPage}
                      onChange={(e) => setFromPage(parseInt(e.target.value, 10) || 0)}
                      className="ds-input font-mono mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="ds-label text-xs" htmlFor="to-page-input">
                      To Page
                    </label>
                    <input
                      id="to-page-input"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={toPage}
                      onChange={(e) => setToPage(parseInt(e.target.value, 10) || 0)}
                      className="ds-input font-mono mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>Screenplay Total: {totalPages} page{totalPages === 1 ? '' : 's'}</span>
                  {isPageRangeValid && (
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-accent)' }}>
                      Inclusive pages {fromPage} to {toPage}
                    </span>
                  )}
                </div>

                {!isPageRangeValid && (
                  <div
                    className="text-xs font-semibold p-2 rounded"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                  >
                    {pageRangeError}
                  </div>
                )}
              </div>
            )}

            {/* Highlighted Text Warning & Info (Requirement 3.C) */}
            {exportArea === 'highlighted_text' && (
              <div className="space-y-2">
                {!hasSelectedText ? (
                  <div
                    className="p-3 rounded text-xs font-semibold border"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderColor: 'var(--red-600, #dc2626)',
                      color: '#ef4444',
                    }}
                  >
                    No text selected! Please go back to the editor and select the text you want to export.
                  </div>
                ) : (
                  <p className="ds-help" style={{ color: 'var(--text-accent)' }}>
                    Exporting {highlightedBlocks?.length} selected screenplay element(s) with preserved typography.
                  </p>
                )}
              </div>
            )}

            {/* Character Sheet Info (Requirement 3.D) */}
            {exportArea === 'character_sheet' && (
              <p className="ds-help">
                Generates a clean character reference sheet listing all unique characters in first-appearance order with dialogue cues and scene appearances.
              </p>
            )}

            <div className="ds-field">
              <span className="ds-label">Paper size</span>
              <div className="ds-seg" role="radiogroup" aria-label="Paper size">
                <button
                  type="button"
                  className="ds-seg__item"
                  role="radio"
                  aria-checked={paperSize === 'letter'}
                  onClick={() => setPaperSize('letter')}
                >
                  US Letter · 8.5 × 11 in
                </button>
                <button
                  type="button"
                  className="ds-seg__item"
                  role="radio"
                  aria-checked={paperSize === 'a4'}
                  onClick={() => setPaperSize('a4')}
                >
                  A4 · 210 × 297 mm
                </button>
              </div>
            </div>

            {exportArea === 'entire_script' && (
              <label className="ds-check">
                <input
                  type="checkbox"
                  checked={includeTitlePage}
                  onChange={(e) => setIncludeTitlePage(e.target.checked)}
                />
                <span className="ds-check__box" />
                <span>Include title page</span>
              </label>
            )}

            {/* Preserve Character Highlights in PDF (Requirement 4) */}
            {project?.settings?.highlightCharacters?.enabled && (
              <label className="ds-check">
                <input
                  type="checkbox"
                  checked={preserveCharacterHighlights}
                  onChange={(e) => setPreserveCharacterHighlights(e.target.checked)}
                />
                <span className="ds-check__box" />
                <span>Preserve character highlights in PDF</span>
              </label>
            )}

            {/* Password-Protected PDF Option (Requirement 5) */}
            <div className="ds-field pt-1">
              <label className="ds-check">
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={(e) => {
                    setIsPasswordProtected(e.target.checked);
                    if (!e.target.checked) {
                      setPassword('');
                      setConfirmPassword('');
                    }
                  }}
                />
                <span className="ds-check__box" />
                <span>Password-protect this PDF</span>
              </label>

              {isPasswordProtected && (
                <div
                  className="flex flex-col gap-2 mt-2 p-2.5 rounded"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--line-separator)' }}
                >
                  <div>
                    <span className="text-[11px] font-medium text-neutral-400 block mb-1">Set Password</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ds-input text-xs"
                      autoFocus
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-neutral-400 block mb-1">Confirm Password</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm password..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="ds-input text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="ds-check text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPassword}
                        onChange={(e) => setShowPassword(e.target.checked)}
                      />
                      <span className="ds-check__box" />
                      <span className="text-xs">Show password</span>
                    </label>
                    {passwordError && (
                      <span className="text-xs text-red-400 font-medium">{passwordError}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="ds-help">
              Set in Noto Sans Gurmukhi and Courier. Fonts are embedded, nothing to install.
            </p>
          </section>

          {/* Other Formats Section */}
          <section className="ds-section">
            <h3 className="ds-section__title">Other formats</h3>
            <div className="ds-list">
              <button
                type="button"
                onClick={() => {
                  onExportText();
                  onClose();
                }}
                className="ds-row ds-row--two-line"
              >
                <span className="ds-row__label">
                  Plain text
                  <span className="ds-row__sub">.txt formatted screenplay</span>
                </span>
                <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportFountain();
                  onClose();
                }}
                className="ds-row ds-row--two-line"
              >
                <span className="ds-row__label">
                  Fountain
                  <span className="ds-row__sub">.fountain with @ cues</span>
                </span>
                <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportNativeProject();
                  onClose();
                }}
                className="ds-row ds-row--two-line"
              >
                <span className="ds-row__label">
                  Native project
                  <span className="ds-row__sub">.scriptproject bundle</span>
                </span>
                <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
              </button>

              {onExportDatabaseBackup && (
                <button
                  type="button"
                  onClick={() => {
                    onExportDatabaseBackup();
                    onClose();
                  }}
                  className="ds-row ds-row--two-line"
                >
                  <span className="ds-row__label">
                    Full database backup
                    <span className="ds-row__sub">.akharbackup portable database archive</span>
                  </span>
                  <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Dialog Footer */}
        <div className="ds-dialog__footer">
          <button type="button" onClick={onClose} className="ds-btn ds-btn--lg">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canExport}
            onClick={() => {
              if (!canExport) return;
              onExportPdf({
                paperSize,
                includeTitlePage: exportArea === 'entire_script' ? includeTitlePage : false,
                exportArea,
                pageRange: exportArea === 'selected_pages' ? { from: fromPage, to: toPage } : undefined,
                highlightedBlocks: exportArea === 'highlighted_text' ? (highlightedBlocks || []) : undefined,
                password: isPasswordProtected ? password.trim() : undefined,
                preserveCharacterHighlights,
              });
              onClose();
            }}
            className="ds-btn ds-btn--lg ds-btn--primary"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};
