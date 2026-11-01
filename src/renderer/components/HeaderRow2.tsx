/**
 * HeaderRow2.tsx - Second header row (UI-01, UI-03, DRAFT-01, PAGE-01, DEC-014)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import {
  Plus,
  Sparkles,
  FileDown,
  Layers,
  X,
} from 'lucide-react';
import { ScriptDraft, PaperSize } from '../../types/screenplay';

interface HeaderRow2Props {
  drafts: ScriptDraft[];
  activeDraftId: string;
  onSelectDraft: (draftId: string) => void;
  onCreateDraft: () => void;
  onDeleteDraft?: (draftId: string) => void;
  paperSize: PaperSize;
  onPaperSizeChange: (size: PaperSize) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onOpenExport: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const HeaderRow2: React.FC<HeaderRow2Props> = ({
  drafts,
  activeDraftId,
  onSelectDraft,
  onCreateDraft,
  onDeleteDraft,
  paperSize,
  onPaperSizeChange,
  zoom,
  onZoomChange,
  onOpenExport,
  sidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <div
      className="flex items-center justify-between select-none"
      style={{
        height: 'var(--tabs-h)',
        background: 'var(--surface-chrome)',
        boxShadow: 'inset 0 -1px 0 var(--line-separator)',
        padding: '0 var(--panel-pad)',
      }}
    >
      {/* Left controls: Sidebar toggle & Draft tabs (DRAFT-01) */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {/* Left Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse Sidebar (Navigation & Settings)' : 'Expand Sidebar (Navigation & Settings)'}
          aria-label={sidebarOpen ? 'Collapse Left Sidebar' : 'Expand Left Sidebar'}
          className="ds-icon-btn"
          style={sidebarOpen ? { background: 'var(--surface-control)', color: 'var(--text-primary)' } : undefined}
        >
          <svg style={{ width: '16px', height: '16px' }}><use href="#i-sidebar" /></svg>
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--line-separator)' }} />

        {/* Draft Tabs */}
        <div className="flex items-center space-x-1">
          {drafts.map((draft) => {
            const isActive = draft.id === activeDraftId;
            return (
              <div
                key={draft.id}
                onClick={() => onSelectDraft(draft.id)}
                className="group flex items-center gap-1.5 cursor-pointer rounded transition-all"
                style={{
                  height: 'var(--h-md)',
                  padding: '0 var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 'var(--weight-medium)' : 'var(--weight-regular)',
                  background: isActive ? 'var(--surface-control)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectDraft(draft.id);
                }}
              >
                {draft.isMain ? (
                  <Sparkles size={11} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }} />
                ) : (
                  <Layers size={11} style={{ color: 'var(--text-disabled)' }} />
                )}
                <span>{draft.name}</span>

                {/* Close/Remove draft option for non-main drafts */}
                {!draft.isMain && onDeleteDraft && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDraft(draft.id);
                    }}
                    title={`Close and remove draft "${draft.name}"`}
                    aria-label={`Close draft ${draft.name}`}
                    className="ds-icon-btn ml-1 opacity-70 group-hover:opacity-100"
                    style={{ width: '16px', height: '16px' }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          {/* + Button to create a new draft (DRAFT-01) */}
          <button
            type="button"
            onClick={onCreateDraft}
            title="Create new draft (clones active draft)"
            aria-label="Create new draft"
            className="ds-icon-btn"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Right controls: Paper size, Zoom, Export */}
      <div className="flex items-center space-x-2">
        {/* Paper Size selector (PAGE-01, DEC-014) */}
        <div className="ds-seg" role="radiogroup" aria-label="Paper format" style={{ width: '160px' }}>
          <button
            type="button"
            onClick={() => onPaperSizeChange('letter')}
            className="ds-seg__item"
            role="radio"
            aria-checked={paperSize === 'letter'}
            title="Standard US Letter (8.5 × 11 in) format"
          >
            Letter
          </button>
          <button
            type="button"
            onClick={() => onPaperSizeChange('a4')}
            className="ds-seg__item"
            role="radio"
            aria-checked={paperSize === 'a4'}
            title="Standard A4 (210 × 297 mm) format (DEC-014)"
          >
            A4
          </button>
        </div>

        {/* Zoom Selector */}
        <select
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="ds-select"
          style={{ width: '76px' }}
          title="Document Zoom"
        >
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
        </select>

        {/* Export Button (P0 EXPORT-01 trigger) */}
        <button
          type="button"
          onClick={onOpenExport}
          className="ds-btn ds-btn--primary flex items-center gap-1.5"
          title="Export Screenplay (PDF / Text)"
        >
          <FileDown size={14} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
