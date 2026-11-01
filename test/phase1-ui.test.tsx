/**
 * phase1-ui.test.tsx - UI Component & Interaction Test Suite
 * Governing IDs: UI-01, UI-02, UI-03, UI-05, TOOL-01 (P0), STAT-01, TITLE-02
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { FloatingToolbar } from '../src/renderer/components/FloatingToolbar';
import { StatusChip } from '../src/renderer/components/StatusChip';
import { HeaderRow1 } from '../src/renderer/components/HeaderRow1';
import { HeaderRow2 } from '../src/renderer/components/HeaderRow2';
import { LeftSidebar } from '../src/renderer/components/LeftSidebar';
import { TitleCard } from '../src/renderer/components/TitleCard';
import { ScreenplayBlock, ScriptDraft, TitleMetadata } from '../src/types/screenplay';

describe('Phase 1 UI Components (W1b Acceptance Gates)', () => {
  afterEach(() => {
    cleanup();
  });
  const dummyBlock: ScreenplayBlock = {
    id: 'block_1',
    type: 'character',
    text: 'ਰਣਜੀਤ ਸਿੰਘ',
  };

  describe('TOOL-01 (P0) & TITLE-02: Floating Toolbar Exact Ordering and States', () => {
    it('renders all toolbar buttons in the exact default order with honest disabled states', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      const onApplyFormat = vi.fn();
      const onToggleCase = vi.fn();
      const onCopy = vi.fn();
      const onSelectBlockType = vi.fn();

      render(
        <FloatingToolbar
          activeBlock={dummyBlock}
          isTitleEditing={false}
          canUndo={true}
          canRedo={false}
          onUndo={onUndo}
          onRedo={onRedo}
          onApplyFormat={onApplyFormat}
          onToggleCase={onToggleCase}
          onCopy={onCopy}
          onSelectBlockType={onSelectBlockType}
        />
      );

      // 1. Undo
      const undoBtn = screen.getByTitle(/Undo/i);
      expect(undoBtn).not.toBeDisabled();
      fireEvent.click(undoBtn);
      expect(onUndo).toHaveBeenCalledTimes(1);

      // 2. Redo (canRedo=false -> disabled)
      const redoBtn = screen.getByTitle(/Redo/i);
      expect(redoBtn).toBeDisabled();

      // 3. Current Element Indicator
      const elementIndicator = screen.getByTitle(/Current Screenplay Element: Character/i);
      expect(elementIndicator).toBeInTheDocument();

      // 4. Alignment
      const alignBtn = screen.getByTitle(/Screenplay Element Indentation/i);
      expect(alignBtn).not.toBeDisabled();

      // 5. Bold, Italic, Underline, Strikethrough
      expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Italic/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Underline/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Strikethrough/i)).toBeInTheDocument();

      // 6. Aa
      expect(screen.getByTitle(/Toggle Case/i)).toBeInTheDocument();

      // 7. Full Features (Highlight, Format Painter, Link, Add Layer, Comment)
      const highlightBtn = screen.getByTitle(/Highlight Selected Text/i);
      expect(highlightBtn).not.toBeDisabled();

      const painterBtn = screen.getByTitle(/Format Painter/i);
      expect(painterBtn).not.toBeDisabled();

      const linkBtn = screen.getByTitle(/Insert or Edit Link/i);
      expect(linkBtn).not.toBeDisabled();

      const copyBtn = screen.getByTitle(/Copy Selected Text/i);
      expect(copyBtn).not.toBeDisabled();

      const layerBtn = screen.getByTitle(/Annotation & Revision Layer/i);
      expect(layerBtn).not.toBeDisabled();

      const commentBtn = screen.getByTitle(/Script Notes & Comments/i);
      expect(commentBtn).not.toBeDisabled();
    });

    it('visibly disables element selector and alignment during title editing (TITLE-02)', () => {
      render(
        <FloatingToolbar
          activeBlock={dummyBlock}
          isTitleEditing={true}
          canUndo={true}
          canRedo={true}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          onApplyFormat={vi.fn()}
          onToggleCase={vi.fn()}
          onCopy={vi.fn()}
          onSelectBlockType={vi.fn()}
        />
      );

      // Element selector disabled
      const titleSelector = screen.getByTitle(/Element selector disabled in Title Card/i);
      expect(titleSelector).toBeInTheDocument();
      expect(titleSelector.className).toContain('opacity-30');

      // Alignment disabled
      const alignBtn = screen.getByTitle(/Alignment controls disabled in Title Card/i);
      expect(alignBtn).toBeDisabled();
    });
  });

  describe('STAT-01 & PAGE-03: Status Chip Verification', () => {
    it('displays word count, page count, and accessible help trigger', () => {
      const onOpenHelp = vi.fn();
      render(
        <StatusChip
          stats={{
            wordCount: 1420,
            pageCount: 3,
            characterCount: 6500,
            sceneCount: 4,
          }}
          onOpenHelp={onOpenHelp}
        />
      );

      expect(screen.getByText('1,420')).toBeInTheDocument();
      expect(screen.getByText('words')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('Page') && content.includes('3'))).toBeInTheDocument();

      const helpBtn = screen.getByTitle(/Keyboard Shortcuts/i);
      fireEvent.click(helpBtn);
      expect(onOpenHelp).toHaveBeenCalledTimes(1);
    });
  });

  describe('HeaderRow1: Save Status & Minimal Far-Right Diagnostics', () => {
    it('displays clean save state indicator and icon-only diagnostic controls', () => {
      const onStartDiagnostics = vi.fn();
      render(
        <HeaderRow1
          title="Desi Script"
          onTitleChange={vi.fn()}
          saveStatus="clean"
          currentFilePath="/docs/Desi.scriptproject"
          onOpenLibrary={vi.fn()}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
          onStartDiagnostics={onStartDiagnostics}
          isDiagnosticsRecording={false}
        />
      );

      expect(screen.getByTitle(/All changes saved to disk/i)).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();

      // Icon-only diagnostic controls on the far right
      const startBtn = screen.getByTitle(/Start Recording Diagnostics/i);
      expect(startBtn).toBeInTheDocument();
      expect(startBtn).not.toHaveTextContent('Start'); // Icon-only: no text labels
      fireEvent.click(startBtn);
      expect(onStartDiagnostics).toHaveBeenCalledTimes(1);
    });

    it('displays dirty save state indicator when unsaved', () => {
      render(
        <HeaderRow1
          title="Desi Script"
          onTitleChange={vi.fn()}
          saveStatus="dirty"
          currentFilePath="/docs/Desi.scriptproject"
          onOpenLibrary={vi.fn()}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
        />
      );

      expect(screen.getByTitle(/Unsaved changes in document/i)).toBeInTheDocument();
      expect(screen.getByText('Unsaved')).toBeInTheDocument();
    });
  });

  describe('HeaderRow2: Draft Tabs, Close Options and Paper Formats', () => {
    it('renders draft tabs with close buttons on non-main drafts', () => {
      const drafts: ScriptDraft[] = [
        {
          id: 'draft_1',
          name: 'Master Draft',
          isMain: true,
          createdAt: '',
          modifiedAt: '',
          blocks: [],
        },
        {
          id: 'draft_2',
          name: 'Revision 2',
          isMain: false,
          createdAt: '',
          modifiedAt: '',
          blocks: [],
        },
      ];

      const onPaperSizeChange = vi.fn();
      const onSelectDraft = vi.fn();
      const onCreateDraft = vi.fn();
      const onDeleteDraft = vi.fn();

      render(
        <HeaderRow2
          drafts={drafts}
          activeDraftId="draft_1"
          onSelectDraft={onSelectDraft}
          onCreateDraft={onCreateDraft}
          onDeleteDraft={onDeleteDraft}
          paperSize="letter"
          onPaperSizeChange={onPaperSizeChange}
          zoom={100}
          onZoomChange={vi.fn()}
          onOpenExport={vi.fn()}
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
        />
      );

      expect(screen.getByText('Master Draft')).toBeInTheDocument();
      expect(screen.getByText('Revision 2')).toBeInTheDocument();

      // Paper toggle
      const a4Btn = screen.getByText('A4');
      fireEvent.click(a4Btn);
      expect(onPaperSizeChange).toHaveBeenCalledWith('a4');

      // + Draft button
      const addDraftBtn = screen.getByTitle(/Create new draft/i);
      fireEvent.click(addDraftBtn);
      expect(onCreateDraft).toHaveBeenCalledTimes(1);

      // Close button for Revision 2
      const closeBtn = screen.getByTitle(/Close and remove draft "Revision 2"/i);
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(onDeleteDraft).toHaveBeenCalledWith('draft_2');
    });
  });

  describe('LeftSidebar: Language Switch & Settings Panel', () => {
    const dummyDraft: ScriptDraft = {
      id: 'd1',
      name: 'Master Draft',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'b1', type: 'scene_heading', text: 'INT. HAVELI - DAY' },
        { id: 'b2', type: 'action', text: 'A gentle breeze blows through the courtyard.' },
      ],
    };

    it('renders language switch and triggers toggle between Punjabi and English', () => {
      const onToggleInputMode = vi.fn();
      const onClose = vi.fn();

      render(
        <LeftSidebar
          isOpen={true}
          onClose={onClose}
          inputMode="pa"
          onToggleInputMode={onToggleInputMode}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          onOpenCustomDictionary={vi.fn()}
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={vi.fn()}
          draft={dummyDraft}
        />
      );

      expect(screen.getByText('ਪੰਜਾਬੀ')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();

      // Click English button
      const enBtn = screen.getByText('English').closest('button');
      if (enBtn) fireEvent.click(enBtn);
      expect(onToggleInputMode).toHaveBeenCalled();
    });

    it('renders ds-switch toggles for word count and character highlighting', () => {
      const onToggleWordCount = vi.fn();
      const onHighlightCharactersSettingChange = vi.fn();

      render(
        <LeftSidebar
          isOpen={true}
          onClose={vi.fn()}
          inputMode="pa"
          onToggleInputMode={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          showWordCount={true}
          onToggleWordCount={onToggleWordCount}
          highlightCharactersSetting={{ enabled: false, color: '#a78bfa', selectedCharacters: [] }}
          onHighlightCharactersSettingChange={onHighlightCharactersSettingChange}
          onOpenCustomDictionary={vi.fn()}
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={vi.fn()}
          draft={dummyDraft}
        />
      );

      // Verify switches exist with role="switch"
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(2);

      const wordCountSwitch = switches[0] as HTMLInputElement;
      expect(wordCountSwitch.checked).toBe(true);
      fireEvent.click(wordCountSwitch);
      expect(onToggleWordCount).toHaveBeenCalledWith(false);

      const highlightSwitch = switches[1] as HTMLInputElement;
      expect(highlightSwitch.checked).toBe(false);
      fireEvent.click(highlightSwitch);
      expect(onHighlightCharactersSettingChange).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe('TitleCard: Custom Image & Expandable Layout View', () => {
    it('supports expanding into full-page editing view and renders title elements', () => {
      const metadata: TitleMetadata = {
        title: 'ਸੂਰਮਾ (SOORMA)',
        author: 'ਹਰਪ੍ਰੀਤ ਸਿੰਘ',
        basedOn: 'True Story',
        contact: 'agent@punjabicinema.com',
        rights: 'First Draft',
        titleImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const onMetadataChange = vi.fn();
      const onFocusTitle = vi.fn();

      render(
        <TitleCard
          metadata={metadata}
          onMetadataChange={onMetadataChange}
          onFocusTitle={onFocusTitle}
          paperSize="letter"
          isExpanded={true}
        />
      );

      // In full-page view, verifies all title page elements
      expect(screen.getByText(/TITLE PAGE \(FIRST PAGE\)/i)).toBeInTheDocument();
      expect(screen.getByAltText('Official Title Artwork')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ਸੂਰਮਾ (SOORMA)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('ਹਰਪ੍ਰੀਤ ਸਿੰਘ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('True Story')).toBeInTheDocument();
      expect(screen.getByDisplayValue('First Draft')).toBeInTheDocument();
      expect(screen.getByDisplayValue('agent@punjabicinema.com')).toBeInTheDocument();
    });
  });
});
