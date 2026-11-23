/**
 * ScreenplayCanvas.tsx - Single vertical document scroller & centered paper cards
 * Governing IDs: UI-01, UI-05, PAGE-01, PAGE-02, PAGE-03, MODEL-01, MODEL-02, EDIT-01
 */

import React, { useRef, useImperativeHandle, useCallback } from 'react';
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
import { PaginationResult, createPaginationEngine } from '../../core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../../core/layout/paginationAdapter';
import { LINE_PITCH_PX } from '../../core/layout/screenplayGeometry';

interface ScreenplayCanvasProps {
  draft: ScriptDraft;
  metadata: TitleMetadata;
  onMetadataChange: (meta: TitleMetadata) => void;
  onDraftChange: (updatedDraft: ScriptDraft, options?: { isLineCompleted?: boolean }) => void;
  contdSetting: ContdSetting;
  inputMode: 'pa' | 'en';
  isVirtualKeyboardOpen?: boolean;
  keyboardHeight?: number;
  onToggleVirtualKeyboard?: () => void;
  onShiftChange?: (isShift: boolean) => void;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
  onTriggerContdPrompt: (characterName: string) => void;
  paperSize: PaperSize;
  zoom: number;
  onFocusTitle: (isFocused: boolean) => void;
  onFocusBlock: (block: ScreenplayBlock | null, isMixed?: boolean) => void;
  isTitlePageExpanded?: boolean;
  onToggleTitlePageExpand?: () => void;
  highlightCharacters?: HighlightCharactersSetting;
  isModalOpen?: boolean;
  onSearchStateChange?: (state: SearchState) => void;
  onDetectRomanPunjabiPaste?: (text: string) => void;
  useUnifiedPagination?: boolean;
  onPaginationEngineStatusChange?: (status: PaginationEngineStatus) => void;
  onPaginationChange?: (result: PaginationResult) => void;
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
      keyboardHeight,
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
      onPaginationChange,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<ProseMirrorEditorHandle>(null);
    const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);

    const lastAutoScrollTimeRef = useRef<number>(0);
    const pendingAutoScrollTimeoutRef = useRef<any>(null);

    // Clean up pending auto-scroll timers on unmount
    React.useEffect(() => {
      return () => {
        if (pendingAutoScrollTimeoutRef.current) {
          clearTimeout(pendingAutoScrollTimeoutRef.current);
          pendingAutoScrollTimeoutRef.current = null;
        }
      };
    }, []);

    // Intelligent automatic scrolling while typing: maintains comfortable visible space beneath active caret
    const checkAndAutoScrollWhileTyping = useCallback(() => {
      if (typeof window === 'undefined') return;

      requestAnimationFrame(() => {
        const canvas = containerRef.current;
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        if (!canvasRect || canvasRect.height <= 0) return;

        // Measure live active caret position
        const coords = editorRef.current?.getCursorCoords?.();
        let caretBottom: number | null = null;
        if (coords && coords.bottom > 0) {
          caretBottom = coords.bottom;
        } else {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (typeof range.getBoundingClientRect === 'function') {
              const rect = range.getBoundingClientRect();
              if (rect && rect.bottom > 0) {
                caretBottom = rect.bottom;
              }
            }
          }
        }

        if (caretBottom === null) return;

        const effectiveKeyboardHeight = isVirtualKeyboardOpen ? (keyboardHeight || 280) + 16 : 0;
        const visibleBottom = canvasRect.bottom - effectiveKeyboardHeight;
        const visibleHeight = canvasRect.height - effectiveKeyboardHeight;
        if (visibleHeight <= 0) return;

        // Dynamic lower threshold: adapts to visible viewport height and window bounds
        const lowerThreshold = Math.round(Math.min(220, Math.max(120, visibleHeight * 0.22)));
        const triggerBottom = visibleBottom - lowerThreshold;

        // Only scroll if the active typing caret is breaching the lower visibility threshold
        if (caretBottom > triggerBottom) {
          // Desired comfortable bottom margin beneath the cursor line
          const comfortSpace = Math.round(Math.min(380, Math.max(220, visibleHeight * 0.38)));
          const deltaClient = caretBottom - (visibleBottom - comfortSpace);

          if (deltaClient > 0) {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const autoScrollCooldownMs = 280;

            if (now - lastAutoScrollTimeRef.current < autoScrollCooldownMs) {
              // Smooth scroll is currently in progress; schedule follow-up check when it completes
              if (pendingAutoScrollTimeoutRef.current) {
                clearTimeout(pendingAutoScrollTimeoutRef.current);
              }
              const remainingTime = autoScrollCooldownMs - (now - lastAutoScrollTimeRef.current) + 20;
              pendingAutoScrollTimeoutRef.current = setTimeout(() => {
                checkAndAutoScrollWhileTyping();
              }, remainingTime);
              return;
            }

            lastAutoScrollTimeRef.current = now;
            const zoomScale = (zoom || 100) / 100;
            const scrollDelta = deltaClient / zoomScale;

            if (typeof canvas.scrollBy === 'function') {
              canvas.scrollBy({ top: scrollDelta, behavior: 'smooth' });
            } else if (typeof canvas.scrollTo === 'function') {
              canvas.scrollTo({ top: canvas.scrollTop + scrollDelta, behavior: 'smooth' });
            } else {
              canvas.scrollTop += scrollDelta;
            }
          }
        }
      });
    }, [zoom, isVirtualKeyboardOpen, keyboardHeight]);

    const handleDraftChange = useCallback(
      (updatedDraft: ScriptDraft, options?: { isLineCompleted?: boolean }) => {
        onDraftChange(updatedDraft, options);
        checkAndAutoScrollWhileTyping();
      },
      [onDraftChange, checkAndAutoScrollWhileTyping]
    );

    // Smoothly scroll active caret into safe writing viewport when virtual keyboard opens
    React.useEffect(() => {
      if (isVirtualKeyboardOpen && containerRef.current) {
        const coords = editorRef.current?.getCursorCoords?.();
        let targetBottom: number | null = null;
        if (coords && coords.bottom > 0) {
          targetBottom = coords.bottom;
        } else if (typeof window !== 'undefined') {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect && rect.bottom > 0) {
              targetBottom = rect.bottom;
            }
          }
        }

        if (targetBottom !== null && typeof window !== 'undefined') {
          const canvas = containerRef.current;
          const canvasRect = canvas.getBoundingClientRect();
          const effectiveKeyboardHeight = (keyboardHeight || 280) + 16;
          const visibleBottom = canvasRect.bottom - effectiveKeyboardHeight;
          const comfortableThreshold = visibleBottom - 56;

          if (targetBottom > comfortableThreshold) {
            const scrollDistance = targetBottom - comfortableThreshold;
            canvas.scrollBy({ top: scrollDistance, behavior: 'smooth' });
          }
        }
      }
    }, [isVirtualKeyboardOpen, keyboardHeight]);

    // Scroll active search match safely into viewport, avoiding top FindBar and bottom status/keyboard
    const scrollMatchIntoView = useCallback(() => {
      requestAnimationFrame(() => {
        const canvas = containerRef.current;
        if (!canvas) return;
        const coords = editorRef.current?.getCursorCoords?.();
        if (!coords) return;

        const canvasRect = canvas.getBoundingClientRect();
        const topSafetyMargin = 72; // Below header / FindBar
        const bottomSafetyMargin = isVirtualKeyboardOpen ? (keyboardHeight || 280) + 40 : 64; // Above status chip

        const visibleTop = canvasRect.top + topSafetyMargin;
        const visibleBottom = canvasRect.bottom - bottomSafetyMargin;
        const zoomScale = (zoom || 100) / 100;

        if (coords.top < visibleTop) {
          const delta = (coords.top - visibleTop - 24) / zoomScale;
          if (typeof canvas.scrollBy === 'function') {
            canvas.scrollBy({ top: delta, behavior: 'smooth' });
          } else {
            canvas.scrollTop += delta;
          }
        } else if (coords.bottom > visibleBottom) {
          const delta = (coords.bottom - visibleBottom + 24) / zoomScale;
          if (typeof canvas.scrollBy === 'function') {
            canvas.scrollBy({ top: delta, behavior: 'smooth' });
          } else {
            canvas.scrollTop += delta;
          }
        }
      });
    }, [zoom, isVirtualKeyboardOpen, keyboardHeight]);

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
        scrollMatchIntoView();
      },
      findNext: () => {
        editorRef.current?.findNext();
        scrollMatchIntoView();
      },
      findPrev: () => {
        editorRef.current?.findPrev();
        scrollMatchIntoView();
      },
      clearSearch: () => {
        editorRef.current?.clearSearch();
      },
      replaceCurrent: (replacement: string) => {
        const result = editorRef.current?.replaceCurrent(replacement) ?? false;
        scrollMatchIntoView();
        return result;
      },
      replaceAll: (replacement: string) => {
        return editorRef.current?.replaceAll(replacement) ?? 0;
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
      getCursorCoords: () => {
        return editorRef.current?.getCursorCoords?.() ?? null;
      },
      scrollCursorIntoView: () => {
        editorRef.current?.scrollCursorIntoView?.();
      },
    }));

    const [paginationResult, setPaginationResult] = React.useState<PaginationResult | null>(() => {
      try {
        const layoutBlocks = draftToLayoutBlocks(draft);
        if (layoutBlocks.length > 0) {
          const eng = createPaginationEngine();
          return eng.paginate(layoutBlocks, { paperSize, contdSetting });
        }
      } catch {
        // fallback
      }
      return null;
    });
    const pageCount = Math.max(1, paginationResult?.pages.length || 1);
    const isLetter = paperSize === 'letter';
    const paperWidthPx = isLetter ? 816 : 793.7;
    const paperHeightPx = isLetter ? 1056 : 1122.5;

    return (
      <div
        ref={containerRef}
        data-testid="screenplay-canvas-scroller"
        className="screenplay-canvas-scroller flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center"
        style={{
          background: 'var(--surface-canvas)',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          paddingBottom: '3rem',
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

        {/* Screenplay Paper Container & Discrete Fixed-Size Page Boxes */}
        <div className="screenplay-paper-wrapper relative flex flex-col items-center">
          {/* Fixed-Size Page Boxes Layer (real paper height: 1056px Letter, 1122.5px A4) */}
          <div className="screenplay-page-boxes-layer absolute top-0 left-0 right-0 pointer-events-none flex flex-col items-center">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <div
                key={idx}
                className={`screenplay-page-box select-none shrink-0 ${
                  paperSize === 'a4' ? 'paper-a4' : 'paper-letter'
                }`}
                data-page-number={idx + 1}
                style={{
                  width: `${paperWidthPx}px`,
                  height: `${paperHeightPx}px`,
                  marginBottom: idx < pageCount - 1 ? '36px' : '0px',
                  background: 'var(--page-surface)',
                  boxShadow:
                    '0 4px 16px rgba(0, 0, 0, 0.45), 0 20px 56px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
                  borderRadius: 'var(--radius-sm)',
                  boxSizing: 'border-box',
                }}
              />
            ))}
          </div>

          {/* ProseMirror Screenplay Paper Editor */}
          <div
            className={`screenplay-paper ds-page select-text cursor-text shrink-0 relative z-10 ${
              paperSize === 'letter' ? 'paper-letter' : 'paper-a4'
            }`}
            style={{
              '--screenplay-line-pitch': `${LINE_PITCH_PX}px`,
              background: 'transparent',
              boxShadow: 'none',
              borderRadius: 0,
            } as React.CSSProperties}
            onClick={() => {
              editorRef.current?.focus();
            }}
          >
            {/* ProseMirror Core Screenplay Editor */}
            <div className="script-content min-h-[8in] select-text cursor-text">
              <ProseMirrorEditor
                ref={editorRef}
                key={draft.id}
                draft={draft}
                paperSize={paperSize}
                onDraftChange={handleDraftChange}
                contdSetting={contdSetting}
                inputMode={inputMode}
                isVirtualKeyboardOpen={isVirtualKeyboardOpen}
                keyboardHeight={keyboardHeight}
                onToggleVirtualKeyboard={onToggleVirtualKeyboard}
                onShiftChange={onShiftChange}
                onAltOrCtrlChange={onAltOrCtrlChange}
                onTriggerContdPrompt={onTriggerContdPrompt}
                onActiveBlockChange={(block, isMixed) => {
                  onFocusTitle(false);
                  onFocusBlock(block, isMixed);
                }}
                highlightCharacters={highlightCharacters}
                isModalOpen={isModalOpen}
                onSearchStateChange={onSearchStateChange}
                onDetectRomanPunjabiPaste={onDetectRomanPunjabiPaste}
                useUnifiedPagination={useUnifiedPagination}
                onPaginationEngineStatusChange={onPaginationEngineStatusChange}
                onPaginationChange={(res) => {
                  setPaginationResult(res);
                  onPaginationChange?.(res);
                }}
                initialSelection={lastSelectionRef.current}
                onSelectionChange={(sel) => {
                  lastSelectionRef.current = sel;
                }}
              />
            </div>
          </div>
        </div>

        {/* Generous bottom writing space so active typing position is never cramped against window bottom */}
        <div
          className="screenplay-scroll-bottom-spacer shrink-0 w-full pointer-events-none"
          style={{ height: '35vh', minHeight: '200px' }}
        />
      </div>
    );
  }
);
ScreenplayCanvas.displayName = 'ScreenplayCanvas';
