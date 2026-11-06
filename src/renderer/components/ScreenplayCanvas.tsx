/**
 * ScreenplayCanvas.tsx - Single vertical document scroller & centered paper cards
 * Governing IDs: UI-01, UI-05, PAGE-01, PAGE-02, PAGE-03, MODEL-01, MODEL-02, EDIT-01
 */

import React, { useRef, useImperativeHandle } from 'react';
import { TitleCard } from './TitleCard';
import {
  ProseMirrorEditor,
  ProseMirrorEditorHandle,
  PaginationEngineStatus,
} from './ProseMirrorEditor';
import { KeyOutput } from '../../core/editor/gurmukhiKeyboardMappings';
import { SearchState } from '../../core/editor/searchPlugin';
import {
  ScriptDraft,
  ScreenplayBlock,
  TitleMetadata,
  PaperSize,
  ContdSetting,
  HighlightCharactersSetting,
} from '../../types/screenplay';

interface ScreenplayCanvasProps {
  draft: ScriptDraft;
  metadata: TitleMetadata;
  onMetadataChange: (meta: TitleMetadata) => void;
  onDraftChange: (updatedDraft: ScriptDraft, options?: { isLineCompleted?: boolean }) => void;
  contdSetting: ContdSetting;
  inputMode: 'pa' | 'en';
  isVirtualKeyboardOpen?: boolean;
  onToggleVirtualKeyboard?: () => void;
  onShiftChange?: (isShift: boolean) => void;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
  onTriggerContdPrompt: (characterName: string) => void;
  paperSize: PaperSize;
  zoom: number;
  onFocusTitle: (isFocused: boolean) => void;
  onFocusBlock: (block: ScreenplayBlock | null) => void;
  isTitlePageExpanded?: boolean;
  onToggleTitlePageExpand?: () => void;
  highlightCharacters?: HighlightCharactersSetting;
  isModalOpen?: boolean;
  onSearchStateChange?: (state: SearchState) => void;
  onDetectRomanPunjabiPaste?: (text: string) => void;
  useUnifiedPagination?: boolean;
  onPaginationEngineStatusChange?: (status: PaginationEngineStatus) => void;
}

export const ScreenplayCanvas = React.forwardRef<ProseMirrorEditorHandle, ScreenplayCanvasProps>(
  (
    {
      draft,
      metadata,
      onMetadataChange,
      onDraftChange,
      contdSetting,
      inputMode,
      isVirtualKeyboardOpen,
      onToggleVirtualKeyboard,
      onShiftChange,
      onAltOrCtrlChange,
      onTriggerContdPrompt,
      paperSize,
      zoom,
      onFocusTitle,
      onFocusBlock,
      isTitlePageExpanded,
      onToggleTitlePageExpand,
      highlightCharacters,
      isModalOpen = false,
      onSearchStateChange,
      onDetectRomanPunjabiPaste,
      useUnifiedPagination = false,
      onPaginationEngineStatusChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<ProseMirrorEditorHandle>(null);
    const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      insertText: (text: string) => {
        editorRef.current?.insertText(text);
      },
      insertConvertedText: (text: string, mode?: 'cursor' | 'replace-all') => {
        editorRef.current?.insertConvertedText(text, mode);
      },
      hasSelection: () => {
        return editorRef.current?.hasSelection() ?? false;
      },
      insertKeyOutput: (output: KeyOutput) => {
        editorRef.current?.insertKeyOutput(output);
      },
      backspace: () => {
        editorRef.current?.backspace();
      },
      getSelectedBlocks: () => {
        return editorRef.current?.getSelectedBlocks() || null;
      },
      setSearch: (query: string, caseSensitive?: boolean, wholeWord?: boolean) => {
        editorRef.current?.setSearch(query, caseSensitive, wholeWord);
      },
      findNext: () => {
        editorRef.current?.findNext();
      },
      findPrev: () => {
        editorRef.current?.findPrev();
      },
      clearSearch: () => {
        editorRef.current?.clearSearch();
      },
      setBlockType: (type) => {
        editorRef.current?.setBlockType(type);
      },
      toggleFormat: (format) => {
        editorRef.current?.toggleFormat(format);
      },
      toggleHighlight: (color) => {
        editorRef.current?.toggleHighlight(color);
      },
      triggerFormatPainter: () => {
        return editorRef.current?.triggerFormatPainter() ?? false;
      },
      isFormatPainterActive: () => {
        return editorRef.current?.isFormatPainterActive() ?? false;
      },
      setLink: (url) => {
        editorRef.current?.setLink(url);
      },
      setBlockAnnotation: (layer) => {
        editorRef.current?.setBlockAnnotation(layer);
      },
      setBlockComment: (comment) => {
        editorRef.current?.setBlockComment(comment);
      },
    }));

    return (
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center"
        style={{
          background: 'var(--surface-canvas)',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Title Card & Expandable Title Page (TITLE-01, TITLE-02) */}
        <TitleCard
          metadata={metadata}
          onMetadataChange={onMetadataChange}
          onFocusTitle={onFocusTitle}
          paperSize={paperSize}
          isExpanded={isTitlePageExpanded}
          onToggleExpand={onToggleTitlePageExpand}
        />

        {/* Screenplay Paper Card (UI-01, PAGE-01, PAGE-03) */}
        <div
          className={`screenplay-paper ds-page select-text cursor-text shrink-0 ${
            paperSize === 'letter' ? 'paper-letter' : 'paper-a4'
          }`}
          onClick={() => {
            editorRef.current?.focus();
          }}
        >
          {/* Page number at top right (PAGE-03: initial page counter 1.) */}
          <div
            className="absolute top-[0.5in] right-[1.0in] text-xs font-courier select-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            1.
          </div>

          {/* ProseMirror Core Screenplay Editor */}
          <div className="script-content min-h-[8in] select-text cursor-text">
            <ProseMirrorEditor
              ref={editorRef}
              key={draft.id}
              draft={draft}
              paperSize={paperSize}
              onDraftChange={onDraftChange}
              contdSetting={contdSetting}
              inputMode={inputMode}
              isVirtualKeyboardOpen={isVirtualKeyboardOpen}
              onToggleVirtualKeyboard={onToggleVirtualKeyboard}
              onShiftChange={onShiftChange}
              onAltOrCtrlChange={onAltOrCtrlChange}
              onTriggerContdPrompt={onTriggerContdPrompt}
              onActiveBlockChange={(block) => {
                onFocusTitle(false);
                onFocusBlock(block);
              }}
              highlightCharacters={highlightCharacters}
              isModalOpen={isModalOpen}
              onSearchStateChange={onSearchStateChange}
              onDetectRomanPunjabiPaste={onDetectRomanPunjabiPaste}
              useUnifiedPagination={useUnifiedPagination}
              onPaginationEngineStatusChange={onPaginationEngineStatusChange}
              initialSelection={lastSelectionRef.current}
              onSelectionChange={(sel) => {
                lastSelectionRef.current = sel;
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);
ScreenplayCanvas.displayName = 'ScreenplayCanvas';
