/**
 * HeaderRow1.tsx - Topmost header row (UI-01, UI-02, SAVE-01)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Play,
  Square,
  MoreVertical,
  Download,
  Trash2,
  Maximize2,
  Activity,
  FileSpreadsheet,
  Database,
  Languages,
} from 'lucide-react';
import { SaveStatus, ProjectSource } from '../../types/screenplay';
import { AkharStudioLogo } from './AkharStudioLogo';

interface HeaderRow1Props {
  title: string;
  onTitleChange: (newTitle: string) => void;
  saveStatus: SaveStatus;
  autosaveEnabled?: boolean;
  inputMode?: 'pa' | 'en';
  onToggleInputMode?: () => void;
  currentFilePath: string | null;
  projectSource?: ProjectSource;
  onOpenLibrary: () => void;
  onOpenRomanConverter?: () => void;
  onOpenSearch: () => void;
  onRetrySave: () => void;
  onExpandTitlePage?: () => void;
  onOpenCustomDictionary?: () => void;
  onOpenDiagnostics?: () => void;
  isDiagnosticsRecording?: boolean;
  onStartDiagnostics?: () => void;
  onStopDiagnostics?: () => void;
  onExportDiagnostics?: () => void;
  onClearOlderDiagnostics?: () => void;
}

export const HeaderRow1: React.FC<HeaderRow1Props> = ({
  title,
  onTitleChange,
  saveStatus,
  autosaveEnabled = true,
  currentFilePath,
  projectSource = 'database',
  onOpenLibrary,
  onOpenRomanConverter,
  onOpenSearch,
  onRetrySave,
  onExpandTitlePage,
  onOpenDiagnostics = () => {},
  isDiagnosticsRecording = false,
  onStartDiagnostics = () => {},
  onStopDiagnostics = () => {},
  onExportDiagnostics = () => {},
  onClearOlderDiagnostics = () => {},
}) => {
  const [editingTitle, setEditingTitle] = useState(title);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  useEffect(() => {
    setEditingTitle(title);
  }, [title]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleTitleBlur = () => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed);
    } else {
      setEditingTitle(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditingTitle(title);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <header
      className="select-none app-drag flex items-center justify-between"
      style={{
        height: 'var(--panel-header-h)',
        background: 'var(--surface-chrome)',
        boxShadow: 'inset 0 -1px 0 var(--line-separator)',
        padding: '0 var(--panel-pad)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Left controls */}
      <div className="flex items-center space-x-2 no-drag">
        {/* macOS Traffic Lights spacer */}
        {isMac && <div className="w-[72px] shrink-0 pointer-events-none" aria-hidden="true" />}

        {/* AkharStudio Brand Logo */}
        <AkharStudioLogo className="mr-1" />

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Home / Files button */}
        <button
          type="button"
          onClick={onOpenLibrary}
          title="Project Library & Files (Cmd/Ctrl+O)"
          className="ds-btn ds-btn--quiet flex items-center gap-1.5"
          style={{ height: 'var(--h-md)', padding: '0 var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
        >
          <FolderOpen size={15} />
          <span>Projects</span>
        </button>

        {/* Roman Punjabi to Gurmukhi Paste & Convert button */}
        {onOpenRomanConverter && (
          <button
            type="button"
            onClick={onOpenRomanConverter}
            title="Convert Roman Punjabi to Gurmukhi (Paste & Convert)"
            className="ds-btn ds-btn--quiet flex items-center gap-1.5"
            style={{ height: 'var(--h-md)', padding: '0 var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
          >
            <Languages size={15} />
            <span>Roman to Gurmukhi</span>
          </button>
        )}

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Project Title Input with Expand Title Page shortcut */}
        <div className="flex items-center no-drag">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            title="Edit Project Title (Click to rename)"
            aria-label="Project Title"
            className="ds-input font-medium truncate no-drag"
            style={{
              height: 'var(--h-md)',
              maxWidth: '220px',
              padding: '0 var(--space-2)',
              fontSize: 'var(--text-sm)',
              background: 'transparent',
            }}
          />
          {onExpandTitlePage && (
            <button
              type="button"
              onClick={onExpandTitlePage}
              title="Expand Full Title Page (Movie graphic, credits & layout)"
              aria-label="Expand Full Title Page"
              className="ds-icon-btn ml-0.5"
            >
              <FileSpreadsheet size={13} />
            </button>
          )}
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Search button */}
        <button
          type="button"
          onClick={onOpenSearch}
          title="Find in Script (Cmd/Ctrl+F)"
          className="ds-icon-btn no-drag"
        >
          <Search size={14} />
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Save Status Chip */}
        <div className="flex items-center no-drag">
          {saveStatus === 'clean' && (
            <div
              className="flex items-center gap-1 rounded font-medium"
              style={{
                height: 'var(--h-sm)',
                padding: '0 var(--space-2)',
                background: 'var(--surface-control)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
              }}
              title={autosaveEnabled ? 'All changes saved to disk' : 'All changes saved to disk (Autosave is off)'}
            >
              <Check size={11} strokeWidth={2.5} style={{ color: 'var(--text-secondary)' }} />
              <span>{autosaveEnabled ? 'Saved' : 'Saved (Manual)'}</span>
            </div>
          )}

          {saveStatus === 'saving' && (
            <div
              className="flex items-center gap-1 rounded font-medium animate-pulse"
              style={{
                height: 'var(--h-sm)',
                padding: '0 var(--space-2)',
                background: 'var(--surface-control)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-xs)',
              }}
              title="Saving changes to disk..."
            >
              <Loader2 size={11} className="animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          {saveStatus === 'dirty' && (
            <div
              className="flex items-center gap-1.5 rounded font-medium"
              style={{
                height: 'var(--h-sm)',
                padding: '0 var(--space-2)',
                background: 'var(--surface-sunken)',
                color: autosaveEnabled ? 'var(--text-disabled)' : 'var(--text-accent)',
                fontSize: 'var(--text-xs)',
              }}
              title={
                autosaveEnabled
                  ? 'Unsaved changes in document'
                  : 'Unsaved changes in document (Autosave is off — manual save required: Cmd/Ctrl+S)'
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: autosaveEnabled ? 'var(--text-disabled)' : 'var(--text-accent)' }}
              />
              <span>{autosaveEnabled ? 'Unsaved' : 'Unsaved (Manual)'}</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <button
              type="button"
              onClick={onRetrySave}
              className="ds-btn flex items-center gap-1 cursor-pointer no-drag"
              style={{
                height: 'var(--h-sm)',
                padding: '0 var(--space-2)',
                background: 'var(--surface-control)',
                color: 'var(--text-danger)',
                fontSize: 'var(--text-xs)',
              }}
              title="Autosave failed. Click to retry save."
            >
              <AlertCircle size={11} />
              <span>Save Failed (Retry)</span>
            </button>
          )}
        </div>
      </div>

      {/* Far Right Area: File name & Minimal Icon-Only Diagnostic System */}
      <div className="flex items-center space-x-2.5 no-drag">
        {/* Current File Path / Database indicator */}
        <div
          className="flex items-center gap-1.5 truncate max-w-[240px] font-mono"
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
        >
          {projectSource === 'database' ? (
            <span
              className="flex items-center gap-1 font-sans font-medium text-[11px]"
              style={{ color: 'var(--text-accent)' }}
            >
              <Database size={12} />
              <span>Local Database</span>
            </span>
          ) : currentFilePath ? (
            <span title={currentFilePath} className="truncate">
              {currentFilePath.split('/').pop() || currentFilePath.split('\\').pop()}
            </span>
          ) : (
            <span className="italic" style={{ color: 'var(--text-disabled)' }}>Untitled Script (Unsaved)</span>
          )}
        </div>

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Minimal Icon-Only Diagnostic System */}
        <div
          className="flex items-center gap-0.5 rounded relative"
          style={{
            height: 'var(--h-md)',
            padding: '2px',
            background: 'var(--surface-sunken)',
          }}
          ref={dropdownRef}
        >
          {/* Active Recording pulsing dot */}
          {isDiagnosticsRecording && (
            <div
              className="flex items-center px-1.5"
              title="Diagnostics Recording is active"
              aria-label="Diagnostics Recording is active"
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red-600)' }} />
            </div>
          )}

          {/* Start Recording (Icon Only) */}
          <button
            type="button"
            onClick={onStartDiagnostics}
            disabled={isDiagnosticsRecording}
            title={isDiagnosticsRecording ? 'Recording is currently active' : 'Start Recording Diagnostics'}
            aria-label="Start Recording Diagnostics"
            className="ds-icon-btn"
          >
            <Play size={12} className="fill-current" />
          </button>

          {/* Stop Recording (Icon Only) */}
          <button
            type="button"
            onClick={onStopDiagnostics}
            disabled={!isDiagnosticsRecording}
            title={!isDiagnosticsRecording ? 'No active recording to stop' : 'Stop Recording Diagnostics'}
            aria-label="Stop Recording Diagnostics"
            className="ds-icon-btn"
            style={isDiagnosticsRecording ? { color: 'var(--text-danger)' } : undefined}
          >
            <Square size={12} className="fill-current" />
          </button>

          {/* Direct Diagnostic Modal Trigger (Icon Only) */}
          <button
            type="button"
            onClick={onOpenDiagnostics}
            title="Open Diagnostic Console"
            aria-label="Open Diagnostic Console"
            className="ds-icon-btn"
          >
            <Activity size={13} />
          </button>

          {/* Diagnostic Options Menu Trigger (⋮) (Icon Only) */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Diagnostic Options"
            aria-label="Diagnostic Options"
            className="ds-icon-btn"
          >
            <MoreVertical size={13} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="ds-menu absolute right-0 top-full mt-1.5 z-50"
            >
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onExportDiagnostics();
                }}
                className="ds-row"
              >
                <Download className="ds-row__icon" size={14} />
                <span className="ds-row__label">Export Current Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onClearOlderDiagnostics();
                }}
                className="ds-row"
              >
                <Trash2 className="ds-row__icon" size={14} />
                <span className="ds-row__label">Clear Older Diagnostics</span>
              </button>

              <div className="ds-menu__sep" />

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenDiagnostics();
                }}
                className="ds-row"
              >
                <Maximize2 className="ds-row__icon" size={14} />
                <span className="ds-row__label">Expand Diagnostic Window</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
