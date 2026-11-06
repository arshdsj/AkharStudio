/**
 * ProseMirrorEditor.tsx - ProseMirror Screenplay Editor Component with Transliteration
 * Governing IDs: MODEL-01, MODEL-03, EDIT-01..05, AC-01..04, CONT-01, CONT-02, I18N-02, DEC-011, DEC-030
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { EditorState, Transaction, Selection, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { history } from 'prosemirror-history';
import { toggleMark } from 'prosemirror-commands';
import { Mark, Fragment, Slice, Node as PMNode } from 'prosemirror-model';

import { screenplaySchema } from '../../core/editor/schema';
import { createScreenplayKeymap } from '../../core/editor/keymap';
import { handleScreenplayBackspace, setBlockType as setScreenplayBlockType } from '../../core/editor/commands';
import { draftToProseMirrorDoc, proseMirrorDocToDraft } from '../../core/editor/documentAdapter';
import { generateId } from '../../core/model/ProjectModel';
import {
  getActiveSuggestions,
  SuggestionState,
  SuggestionItem,
} from '../../core/editor/autocomplete';
import { analyzeContdEligibleBlocks, normalizeCharacterName } from '../../core/editor/contd';
import {
  createTransliterationPlugin,
  commitTransliterationCandidate,
  TransliterationState,
} from '../../core/editor/transliterationPlugin';
import { defaultTransliterator } from '../../core/transliteration/defaultEngine';
import { isLikelyRomanPunjabi } from '../../core/transliteration/textConverter';
import {
  createVirtualKeyboardPlugin,
  insertVirtualKeyOutput,
} from '../../core/editor/virtualKeyboardPlugin';
import {
  createSearchPlugin,
  setSearchQuery,
  findNextMatch,
  findPrevMatch,
  clearSearch,
  SearchState,
} from '../../core/editor/searchPlugin';
import {
  createPaginationPlugin,
  paginationPluginKey,
} from '../../core/editor/paginationPlugin';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../../core/editor/unifiedPaginationPlugin';
import { KeyOutput } from '../../core/editor/gurmukhiKeyboardMappings';
import { SuggestionPopup } from './SuggestionPopup';
import { TransliterationPopup } from './TransliterationPopup';
import { Palette, ChevronRight, Copy, Scissors, Ban } from 'lucide-react';
import {
  ScriptDraft,
  ScreenplayBlock,
  ScreenplayBlockType,
  ContdSetting,
  HighlightCharactersSetting,
  PaperSize,
} from '../../types/screenplay';

interface ContextMenuState {
  x: number;
  y: number;
  from: number;
  to: number;
  selectedText: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow (ਪੀਲਾ)', hex: '#eab308' },
  { name: 'Red (ਲਾਲ)', hex: '#ef4444' },
  { name: 'Orange (ਸੰਤਰੀ)', hex: '#f97316' },
  { name: 'Green (ਹਰਾ)', hex: '#22c55e' },
  { name: 'Blue (ਨੀਲਾ)', hex: '#3b82f6' },
  { name: 'Purple (ਜਾਮਣੀ)', hex: '#a855f7' },
  { name: 'Pink (ਗੁਲਾਬੀ)', hex: '#ec4899' },
  { name: 'White (ਚਿੱਟਾ)', hex: '#ffffff' },
];

export interface ProseMirrorEditorHandle {
  focus: () => void;
  insertText: (text: string) => void;
  insertConvertedText: (text: string, mode?: 'cursor' | 'replace-all') => void;
  hasSelection: () => boolean;
  insertKeyOutput: (output: KeyOutput) => void;
  backspace: () => void;
  getSelectedBlocks: () => ScreenplayBlock[] | null;
  setSearch: (query: string, caseSensitive?: boolean, wholeWord?: boolean) => void;
  findNext: () => void;
  findPrev: () => void;
  clearSearch: () => void;
  setBlockType: (type: ScreenplayBlockType) => void;
  toggleFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => void;
  toggleHighlight: (color?: string) => void;
  triggerFormatPainter: () => boolean;
  isFormatPainterActive: () => boolean;
  setLink: (url: string) => void;
  setBlockAnnotation: (layer: string) => void;
  setBlockComment: (comment: string) => void;
}

export interface PaginationEngineStatus {
  engine: 'legacy' | 'unified';
  isFallback: boolean;
  fallbackReason?: string;
}

interface ProseMirrorEditorProps {
  draft: ScriptDraft;
  onDraftChange: (updatedDraft: ScriptDraft, options?: { isLineCompleted?: boolean }) => void;
  contdSetting: ContdSetting;
  inputMode: 'pa' | 'en';
  isVirtualKeyboardOpen?: boolean;
  onToggleVirtualKeyboard?: () => void;
  onShiftChange?: (isShift: boolean) => void;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
  onTriggerContdPrompt: (characterName: string) => void;
  onActiveBlockChange: (block: ScreenplayBlock | null) => void;
  highlightCharacters?: HighlightCharactersSetting;
  paperSize?: PaperSize;
  isModalOpen?: boolean;
  onSearchStateChange?: (state: SearchState) => void;
  onDetectRomanPunjabiPaste?: (text: string) => void;
  useUnifiedPagination?: boolean;
  onPaginationEngineStatusChange?: (status: PaginationEngineStatus) => void;
  initialSelection?: { from: number; to: number } | null;
  onSelectionChange?: (sel: { from: number; to: number }) => void;
}

export const ProseMirrorEditor = React.forwardRef<ProseMirrorEditorHandle, ProseMirrorEditorProps>(
  (
    {
      draft,
      onDraftChange,
      contdSetting,
      inputMode,
      isVirtualKeyboardOpen = false,
      onToggleVirtualKeyboard,
      onShiftChange,
      onAltOrCtrlChange,
      onTriggerContdPrompt,
      onActiveBlockChange,
      highlightCharacters,
      paperSize = 'letter',
      isModalOpen = false,
      onSearchStateChange,
      onDetectRomanPunjabiPaste,
      useUnifiedPagination = false,
      onPaginationEngineStatusChange,
      initialSelection = null,
      onSelectionChange,
    },
    ref
  ) => {
    const editorMountRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Keep active refs for callbacks to avoid stale closures in ProseMirror
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const onSelectionChangeRef = useRef(onSelectionChange);
    onSelectionChangeRef.current = onSelectionChange;

    const onDraftChangeRef = useRef(onDraftChange);
    onDraftChangeRef.current = onDraftChange;

    const onPaginationEngineStatusChangeRef = useRef(onPaginationEngineStatusChange);
    onPaginationEngineStatusChangeRef.current = onPaginationEngineStatusChange;

    const inputModeRef = useRef(inputMode);
    inputModeRef.current = inputMode;

    const contdSettingRef = useRef(contdSetting);
    contdSettingRef.current = contdSetting;

    const onTriggerContdPromptRef = useRef(onTriggerContdPrompt);
    onTriggerContdPromptRef.current = onTriggerContdPrompt;

    const onActiveBlockChangeRef = useRef(onActiveBlockChange);
    onActiveBlockChangeRef.current = onActiveBlockChange;

    const isVirtualKeyboardOpenRef = useRef(isVirtualKeyboardOpen);
    isVirtualKeyboardOpenRef.current = isVirtualKeyboardOpen;

    const onToggleVirtualKeyboardRef = useRef(onToggleVirtualKeyboard);
    onToggleVirtualKeyboardRef.current = onToggleVirtualKeyboard;

    const onShiftChangeRef = useRef(onShiftChange);
    onShiftChangeRef.current = onShiftChange;

    const onAltOrCtrlChangeRef = useRef(onAltOrCtrlChange);
    onAltOrCtrlChangeRef.current = onAltOrCtrlChange;

    const isModalOpenRef = useRef(isModalOpen);
    isModalOpenRef.current = isModalOpen;

    const onSearchStateChangeRef = useRef(onSearchStateChange);
    onSearchStateChangeRef.current = onSearchStateChange;

    const onDetectRomanPunjabiPasteRef = useRef(onDetectRomanPunjabiPaste);
    onDetectRomanPunjabiPasteRef.current = onDetectRomanPunjabiPaste;

    // Screenplay Autocomplete state (Character, Scene, Transition)
    const [suggestionState, setSuggestionState] = useState<SuggestionState | null>(null);
    const suggestionStateRef = useRef<SuggestionState | null>(null);
    const [caretCoords, setCaretCoords] = useState<{ top: number; left: number } | null>(null);

    // Format Painter state
    const copiedMarksRef = useRef<readonly Mark[] | null>(null);
    const [formatPainterActive, setFormatPainterActive] = useState<boolean>(false);
    const formatPainterActiveRef = useRef(false);
    formatPainterActiveRef.current = formatPainterActive;

    // Dismiss suggestions whenever a modal/dialog opens
    useEffect(() => {
      if (isModalOpen) {
        suggestionStateRef.current = null;
        setSuggestionState(null);
      }
    }, [isModalOpen]);

    // Dismiss suggestions when window loses focus or resizes
    useEffect(() => {
      const dismissSuggestions = () => {
        if (suggestionStateRef.current) {
          suggestionStateRef.current = null;
          setSuggestionState(null);
        }
      };
      window.addEventListener('blur', dismissSuggestions);
      window.addEventListener('resize', dismissSuggestions);
      return () => {
        window.removeEventListener('blur', dismissSuggestions);
        window.removeEventListener('resize', dismissSuggestions);
      };
    }, []);

    // Phonetic Roman-to-Gurmukhi Transliteration state
    const [translitState, setTranslitState] = useState<TransliterationState>({
      isActive: false,
      romanBuffer: '',
      candidates: [],
      selectedIndex: 0,
      lastCommitted: null,
      coords: null,
      isComposingIME: false,
      mode: inputMode,
      anchorPos: null,
    });

    // Text Highlighting / Color Context Menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [colorSubmenuOpen, setColorSubmenuOpen] = useState(false);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
          setContextMenu(null);
          setColorSubmenuOpen(false);
        }
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && contextMenu) {
          setContextMenu(null);
          setColorSubmenuOpen(false);
        }
      };
      if (contextMenu) {
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [contextMenu]);

    const applyTextColor = useCallback(
      (colorHex: string | null) => {
        const view = viewRef.current;
        if (!view || !contextMenu) return;

        const { from, to } = contextMenu;
        const { state, dispatch } = view;
        const tr = state.tr;
        if (colorHex) {
          tr.addMark(from, to, screenplaySchema.marks.color.create({ color: colorHex }));
        } else {
          tr.removeMark(from, to, screenplaySchema.marks.color);
        }
        dispatch(tr);
        setContextMenu(null);
        setColorSubmenuOpen(false);
        view.focus();
      },
      [contextMenu]
    );

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (viewRef.current) {
          viewRef.current.focus();
        }
      },
      insertText: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        insertVirtualKeyOutput(view, text);
        view.focus();
      },
      insertConvertedText: (text: string, mode: 'cursor' | 'replace-all' = 'cursor') => {
        const view = viewRef.current;
        if (!view) return;

        if (mode === 'replace-all') {
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const newBlocks: ScreenplayBlock[] = (lines.length > 0 ? lines : ['']).map((l, idx) => ({
            id: generateId(),
            type: 'action',
            text: l,
            order: idx,
          }));
          const newDraft = { ...draftRef.current, blocks: newBlocks, updatedAt: new Date().toISOString() };
          onDraftChangeRef.current(newDraft);
          const newDoc = draftToProseMirrorDoc(newDraft);
          const newState = EditorState.create({
            doc: newDoc,
            schema: screenplaySchema,
            plugins: view.state.plugins,
          });
          view.updateState(newState);
          view.focus();
          return;
        }

        // Insert at cursor / replace current selection
        const { state, dispatch } = view;
        const { from, to } = state.selection;
        const lines = text.split(/\r?\n/);

        if (lines.length <= 1) {
          const tr = state.tr.insertText(text, from, to);
          dispatch(tr.scrollIntoView());
        } else {
          const $from = state.doc.resolve(from);
          const activeBlockType = ($from.parent?.attrs?.type as ScreenplayBlockType) || 'action';

          const blockNodes: PMNode[] = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            blockNodes.push(
              screenplaySchema.nodes.screenplay_block.create(
                {
                  id: generateId(),
                  type: i === 0 ? activeBlockType : 'action',
                },
                line ? screenplaySchema.text(line) : []
              )
            );
          }

          const slice = new Slice(Fragment.from(blockNodes), 0, 0);
          const tr = state.tr.replaceSelection(slice);
          dispatch(tr.scrollIntoView());
        }
        view.focus();
      },
      hasSelection: () => {
        const view = viewRef.current;
        return view ? !view.state.selection.empty : false;
      },
      insertKeyOutput: (output: KeyOutput) => {
        const view = viewRef.current;
        if (!view) return;
        insertVirtualKeyOutput(view, output);
        view.focus();
      },
      backspace: () => {
        const view = viewRef.current;
        if (!view) return;
        handleScreenplayBackspace(view.state, view.dispatch);
        view.focus();
      },
      getSelectedBlocks: () => {
        const view = viewRef.current;
        if (!view) return null;
        const { state } = view;
        const { from, to, empty } = state.selection;
        if (empty || from >= to) return null;

        const blocks: ScreenplayBlock[] = [];
        state.doc.forEach((node, offset) => {
          if (node.type.name !== 'screenplay_block') return;

          const blockStart = offset + 1;
          const blockEnd = offset + 1 + node.content.size;

          // Check if this block intersects with [from, to]
          if (blockEnd > from && blockStart < to) {
            const textStart = Math.max(0, from - blockStart);
            const textEnd = Math.min(node.textContent.length, to - blockStart);
            const sliceText = node.textContent.substring(textStart, textEnd);

            if (sliceText.trim().length > 0) {
              blocks.push({
                id: node.attrs.id || generateId(),
                type: node.attrs.type as ScreenplayBlockType,
                text: sliceText,
              });
            }
          }
        });

        return blocks.length > 0 ? blocks : null;
      },
      setSearch: (query: string, caseSensitive?: boolean, wholeWord?: boolean) => {
        const view = viewRef.current;
        if (!view) return;
        setSearchQuery(view, query, caseSensitive, wholeWord);
      },
      findNext: () => {
        const view = viewRef.current;
        if (!view) return;
        findNextMatch(view);
      },
      findPrev: () => {
        const view = viewRef.current;
        if (!view) return;
        findPrevMatch(view);
      },
      clearSearch: () => {
        const view = viewRef.current;
        if (!view) return;
        clearSearch(view);
      },
      setBlockType: (type: ScreenplayBlockType) => {
        const view = viewRef.current;
        if (!view) return;
        setScreenplayBlockType(type)(view.state, view.dispatch);
        view.focus();
      },
      toggleFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
        const view = viewRef.current;
        if (!view) return;
        const markType = screenplaySchema.marks[format];
        if (markType) {
          toggleMark(markType)(view.state, view.dispatch);
          view.focus();
        }
      },
      toggleHighlight: (color = 'rgba(234, 179, 8, 0.35)') => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const { from, to, empty } = state.selection;
        const markType = screenplaySchema.marks.highlight;
        if (empty) return;
        const hasMark = state.doc.rangeHasMark(from, to, markType);
        if (hasMark) {
          dispatch(state.tr.removeMark(from, to, markType));
        } else {
          dispatch(state.tr.addMark(from, to, markType.create({ color })));
        }
        view.focus();
      },
      triggerFormatPainter: () => {
        const view = viewRef.current;
        if (!view) return false;
        if (formatPainterActiveRef.current) {
          copiedMarksRef.current = null;
          setFormatPainterActive(false);
          return false;
        }
        const { state } = view;
        const { from, empty, $from } = state.selection;
        const marks = state.storedMarks || (!empty ? state.doc.resolve(from).marks() : $from.marks());
        copiedMarksRef.current = marks || [];
        setFormatPainterActive(true);
        return true;
      },
      isFormatPainterActive: () => formatPainterActiveRef.current,
      setLink: (url: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const { from, to, empty } = state.selection;
        const markType = screenplaySchema.marks.link;
        if (empty) return;
        if (!url) {
          dispatch(state.tr.removeMark(from, to, markType));
        } else {
          dispatch(state.tr.addMark(from, to, markType.create({ href: url })));
        }
        view.focus();
      },
      setBlockAnnotation: (layer: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const { $from } = state.selection;
        if ($from.depth >= 1) {
          const blockPos = $from.before(1);
          const node = state.doc.nodeAt(blockPos);
          if (node && node.type === screenplaySchema.nodes.screenplay_block) {
            const tr = state.tr.setNodeMarkup(blockPos, undefined, {
              ...node.attrs,
              annotation: layer,
            });
            dispatch(tr);
          }
        }
      },
      setBlockComment: (comment: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { state, dispatch } = view;
        const { $from } = state.selection;
        if ($from.depth >= 1) {
          const blockPos = $from.before(1);
          const node = state.doc.nodeAt(blockPos);
          if (node && node.type === screenplaySchema.nodes.screenplay_block) {
            const tr = state.tr.setNodeMarkup(blockPos, undefined, {
              ...node.attrs,
              comment,
            });
            dispatch(tr);
          }
        }
      },
    }));

    const highlightSettingRef = useRef(highlightCharacters);
    highlightSettingRef.current = highlightCharacters;

    // Stable references to editor plugins so undo/redo history and editor extensions
    // are strictly preserved across pagination mode, paper size, and cont'd setting switches
    const historyPluginRef = useRef<Plugin | null>(null);
    if (!historyPluginRef.current) {
      historyPluginRef.current = history();
    }
    const translitPluginRef = useRef<Plugin | null>(null);
    const vkPluginRef = useRef<Plugin | null>(null);
    const characterHighlightPluginRef = useRef<Plugin | null>(null);
    const searchPluginRef = useRef<Plugin | null>(null);
    const keymapPluginRef = useRef<Plugin | null>(null);

    const buildPaginationPlugin = useCallback(
      (unified: boolean, paper: PaperSize, contd: ContdSetting): Plugin => {
        if (unified) {
          onPaginationEngineStatusChangeRef.current?.({
            engine: 'unified',
            isFallback: false,
          });
          try {
            return createUnifiedPaginationPlugin({
              paperSize: paper,
              contdSetting: contd,
              onFallback: (reason) => {
                onPaginationEngineStatusChangeRef.current?.({
                  engine: 'unified',
                  isFallback: true,
                  fallbackReason: reason,
                });
              },
            });
          } catch (err) {
            console.error(
              '[ProseMirrorEditor] Failed to construct unified pagination plugin, falling back to legacy plugin:',
              err
            );
            onPaginationEngineStatusChangeRef.current?.({
              engine: 'unified',
              isFallback: true,
              fallbackReason: 'layout_crash',
            });
            return createPaginationPlugin({ paperSize: paper });
          }
        } else {
          onPaginationEngineStatusChangeRef.current?.({
            engine: 'legacy',
            isFallback: false,
          });
          return createPaginationPlugin({ paperSize: paper });
        }
      },
      []
    );

    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.dispatch(viewRef.current.state.tr.setMeta('characterHighlightUpdated', true));
      }
    }, [highlightCharacters]);

    const prevModeRef = useRef(useUnifiedPagination);
    const isInitialMountRef = useRef(true);
    useEffect(() => {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        return;
      }
      const view = viewRef.current;
      if (!view) return;

      if (prevModeRef.current !== useUnifiedPagination) {
        prevModeRef.current = useUnifiedPagination;
        const paginationPlugin = buildPaginationPlugin(useUnifiedPagination, paperSize, contdSetting);
        const newPlugins = [
          historyPluginRef.current!,
          translitPluginRef.current!,
          vkPluginRef.current!,
          characterHighlightPluginRef.current!,
          paginationPlugin,
          searchPluginRef.current!,
          keymapPluginRef.current!,
        ];

        const reconfiguredState = view.state.reconfigure({ plugins: newPlugins });
        view.updateState(reconfiguredState);
      } else {
        if (useUnifiedPagination) {
          view.dispatch(
            view.state.tr.setMeta(unifiedPaginationPluginKey, { paperSize, contdSetting })
          );
        } else {
          view.dispatch(
            view.state.tr.setMeta(paginationPluginKey, { paperSize })
          );
        }
      }
    }, [paperSize, contdSetting, useUnifiedPagination, buildPaginationPlugin]);

    // Dismiss transliteration popup if switched to English mode or Virtual Keyboard is active
    useEffect(() => {
      if ((inputMode === 'en' || isVirtualKeyboardOpen) && translitState.isActive) {
        setTranslitState((prev) => ({
          ...prev,
          isActive: false,
          romanBuffer: '',
          candidates: [],
        }));
      }
    }, [inputMode, isVirtualKeyboardOpen, translitState.isActive]);

    // Apply Screenplay suggestion item (AC-01..04)
    const applySuggestion = useCallback((item: SuggestionItem) => {
      const view = viewRef.current;
      if (!view) return;

      const { state } = view;
      const { $from } = state.selection;
      const blockStart = $from.start(1);
      const blockEnd = $from.end(1);
      const currentBlock = state.doc.child($from.index(0));
      const currentType = currentBlock.attrs.type as ScreenplayBlockType;

      const tr = state.tr;
      tr.replaceWith(blockStart, blockEnd, screenplaySchema.text(item.value));

      if (currentType === 'character') {
        const nextPos = tr.mapping.map(blockEnd);
        const newDialogueBlock = screenplaySchema.nodes.screenplay_block.create({
          type: 'dialogue',
          contd: false,
        });
        tr.insert(nextPos + 1, newDialogueBlock);
        tr.setSelection(Selection.near(tr.doc.resolve(nextPos + 2)));
      }

      view.dispatch(tr.scrollIntoView());
      suggestionStateRef.current = null;
      setSuggestionState(null);
      view.focus();
    }, []);

    const applySuggestionRef = useRef(applySuggestion);
    applySuggestionRef.current = applySuggestion;

    // Apply Transliteration candidate selection
    const applyTransliterationCandidate = useCallback((candidate: string) => {
      const view = viewRef.current;
      if (!view) return;

      commitTransliterationCandidate(view, candidate, defaultTransliterator);
      view.focus();
    }, []);

    // Initialize ProseMirror EditorView
    useEffect(() => {
      if (!editorMountRef.current) return;

      const initialDoc = draftToProseMirrorDoc(draftRef.current);
      if (!translitPluginRef.current) {
        translitPluginRef.current = createTransliterationPlugin(
          defaultTransliterator,
          (newState) => {
            setTranslitState(newState);
          },
          () => inputModeRef.current,
          undefined,
          () => isVirtualKeyboardOpenRef.current
        );
      }

      if (!vkPluginRef.current) {
        vkPluginRef.current = createVirtualKeyboardPlugin({
          isVirtualKeyboardActive: () => isVirtualKeyboardOpenRef.current,
          onShiftChange: (isShift) => {
            onShiftChangeRef.current?.(isShift);
          },
          onAltOrCtrlChange: (isAltOrCtrl) => {
            onAltOrCtrlChangeRef.current?.(isAltOrCtrl);
          },
          onDeactivate: () => {
            onToggleVirtualKeyboardRef.current?.();
          },
        });
      }

      // Presentation-layer character highlight plugin (Requirement 5)
      if (!characterHighlightPluginRef.current) {
        characterHighlightPluginRef.current = new Plugin({
          key: new PluginKey('characterHighlightPlugin'),
          props: {
            decorations(state) {
              const cfg = highlightSettingRef.current;
              if (!cfg || !cfg.enabled || !cfg.selectedCharacters || cfg.selectedCharacters.length === 0) {
                return DecorationSet.empty;
              }

              const selectedSet = new Set(cfg.selectedCharacters.map((c) => c.toUpperCase().trim()));
              const color = cfg.color || 'rgba(167, 139, 250, 0.35)';
              const decos: Decoration[] = [];
              let currentSpeaker: string | null = null;

              state.doc.forEach((node, offset) => {
                if (node.type.name !== 'screenplay_block') return;

                const type = node.attrs.type as ScreenplayBlockType;
                const text = node.textContent.trim();

                if (type === 'scene_heading') {
                  currentSpeaker = null;
                } else if (type === 'character') {
                  const charName = normalizeCharacterName(text);
                  if (charName && selectedSet.has(charName)) {
                    currentSpeaker = charName;
                    if (node.content.size > 0) {
                      decos.push(
                        Decoration.inline(offset + 1, offset + 1 + node.content.size, {
                          class: 'character-highlight-text',
                          style: `background-color: ${color}; border-radius: 3px; padding: 2px 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;`,
                        })
                      );
                    }
                  } else {
                    currentSpeaker = null;
                  }
                } else if (currentSpeaker && (type === 'dialogue' || type === 'parenthetical')) {
                  if (node.content.size > 0) {
                    decos.push(
                      Decoration.inline(offset + 1, offset + 1 + node.content.size, {
                        class: 'character-highlight-text',
                        style: `background-color: ${color}; border-radius: 3px; padding: 2px 4px; box-decoration-break: clone; -webkit-box-decoration-break: clone;`,
                      })
                    );
                  }
                } else if (type === 'action' || type === 'transition' || type === 'shot') {
                  currentSpeaker = null;
                }
              });

              return DecorationSet.create(state.doc, decos);
            },
          },
        });
      }

      if (!searchPluginRef.current) {
        searchPluginRef.current = createSearchPlugin((s) => {
          onSearchStateChangeRef.current?.(s);
        });
      }

      if (!keymapPluginRef.current) {
        keymapPluginRef.current = createScreenplayKeymap();
      }

      const paginationPlugin = buildPaginationPlugin(useUnifiedPagination, paperSize, contdSetting);

      let state = EditorState.create({
        doc: initialDoc,
        schema: screenplaySchema,
        plugins: [
          historyPluginRef.current!,
          translitPluginRef.current!,
          vkPluginRef.current!,
          characterHighlightPluginRef.current!,
          paginationPlugin,
          searchPluginRef.current!,
          keymapPluginRef.current!,
        ],
      });

      if (initialSelection && initialSelection.from >= 0 && initialSelection.from <= initialDoc.content.size) {
        try {
          const resolvedFrom = Math.min(Math.max(1, initialSelection.from), initialDoc.content.size);
          const sel = Selection.near(state.doc.resolve(resolvedFrom));
          state = state.apply(state.tr.setSelection(sel));
        } catch {
          // ignore if position resolution fails
        }
      }

      const view = new EditorView(editorMountRef.current, {
        state,
        dispatchTransaction(tr: Transaction) {
          const newState = view.state.apply(tr);
          view.updateState(newState);

          onSelectionChangeRef.current?.({ from: newState.selection.from, to: newState.selection.to });

          if (tr.docChanged) {
            const updatedDraft = proseMirrorDocToDraft(newState.doc, draftRef.current);
            const isLineCompleted = updatedDraft.blocks.length > draftRef.current.blocks.length;
            onDraftChangeRef.current(updatedDraft, { isLineCompleted });

            if (contdSettingRef.current === 'unasked') {
              const analyses = analyzeContdEligibleBlocks(newState.doc);
              const firstEligible = analyses.find((a) => a.isEligible && !a.hasManualContd);
              if (firstEligible) {
                onTriggerContdPromptRef.current(firstEligible.characterName);
              }
            }
          }

          const { $from } = newState.selection;
          if ($from.depth >= 1) {
            const currentBlockNode = newState.doc.child($from.index(0));
            onActiveBlockChangeRef.current({
              id: currentBlockNode.attrs.id,
              type: currentBlockNode.attrs.type as ScreenplayBlockType,
              text: currentBlockNode.textContent,
              annotationLayer: currentBlockNode.attrs.annotation || undefined,
              comment: currentBlockNode.attrs.comment || undefined,
            });
          }

          // Format painter application on target selection
          if (
            formatPainterActiveRef.current &&
            copiedMarksRef.current &&
            tr.selectionSet &&
            !newState.selection.empty
          ) {
            const marksToApply = copiedMarksRef.current;
            copiedMarksRef.current = null;
            setFormatPainterActive(false);
            setTimeout(() => {
              if (viewRef.current) {
                const { from, to } = viewRef.current.state.selection;
                let painterTr = viewRef.current.state.tr;
                [
                  screenplaySchema.marks.bold,
                  screenplaySchema.marks.italic,
                  screenplaySchema.marks.underline,
                  screenplaySchema.marks.strikethrough,
                  screenplaySchema.marks.color,
                  screenplaySchema.marks.highlight,
                ].forEach((m) => {
                  if (m) painterTr = painterTr.removeMark(from, to, m);
                });
                marksToApply.forEach((m) => {
                  painterTr = painterTr.addMark(from, to, m);
                });
                viewRef.current.dispatch(painterTr);
              }
            }, 0);
          }

          // Screenplay element autocomplete (suppressed while transliterating or when modal is open)
          const isTransliterating =
            translitPluginRef.current?.getState(newState)?.isActive || false;
          if (!isTransliterating && !isModalOpenRef.current) {
            const suggestions = getActiveSuggestions(newState);
            if (suggestions) {
              suggestionStateRef.current = suggestions;
              setSuggestionState(suggestions);
              try {
                const coords = view.coordsAtPos(newState.selection.from);
                setCaretCoords({ top: coords.top, left: coords.left });
              } catch {
                setCaretCoords(null);
              }
            } else {
              suggestionStateRef.current = null;
              setSuggestionState(null);
            }
          } else {
            suggestionStateRef.current = null;
            setSuggestionState(null);
          }
        },
        handlePaste(_view: EditorView, event: ClipboardEvent) {
          const text = event.clipboardData?.getData('text/plain');
          if (text && onDetectRomanPunjabiPasteRef.current && isLikelyRomanPunjabi(text)) {
            onDetectRomanPunjabiPasteRef.current(text);
            return true;
          }
          return false;
        },
        handleKeyDown(_view, event) {
          // Handle screenplay autocomplete popup if open
          const currentSuggestions = suggestionStateRef.current;
          if (currentSuggestions && currentSuggestions.isOpen && currentSuggestions.items.length > 0) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              const nextIndex =
                (currentSuggestions.selectedIndex + 1) % currentSuggestions.items.length;
              const nextState = { ...currentSuggestions, selectedIndex: nextIndex };
              suggestionStateRef.current = nextState;
              setSuggestionState(nextState);
              return true;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              const nextIndex =
                (currentSuggestions.selectedIndex - 1 + currentSuggestions.items.length) %
                currentSuggestions.items.length;
              const nextState = { ...currentSuggestions, selectedIndex: nextIndex };
              suggestionStateRef.current = nextState;
              setSuggestionState(nextState);
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab' || event.key === ' ') {
              event.preventDefault();
              const selected = currentSuggestions.items[currentSuggestions.selectedIndex];
              if (selected) {
                applySuggestionRef.current(selected);
              }
              return true;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              suggestionStateRef.current = null;
              setSuggestionState(null);
              return true;
            }
          }
          return false;
        },
        handleDOMEvents: {
          blur(_view: EditorView) {
            // Dismiss suggestions immediately when the editor loses focus
            suggestionStateRef.current = null;
            setSuggestionState(null);
            return false;
          },
          contextmenu(_view: EditorView, event: MouseEvent) {
            const { state } = _view;
            const { from, to, empty } = state.selection;
            if (!empty && from < to) {
              event.preventDefault();
              const text = state.doc.textBetween(from, to, ' ');
              setContextMenu({
                x: Math.min(event.clientX, window.innerWidth - 240),
                y: Math.min(event.clientY, window.innerHeight - 300),
                from,
                to,
                selectedText: text,
              });
              setColorSubmenuOpen(false);
              return true;
            }
            setContextMenu(null);
            return false;
          },
        },
      });

      viewRef.current = view;

      // Auto-focus on mount so the user can type immediately
      setTimeout(() => {
        try {
          if (viewRef.current && !viewRef.current.hasFocus()) {
            viewRef.current.focus();
          }
        } catch {
          // ignore if unmounted
        }
      }, 50);

      return () => {
        view.destroy();
      };
    }, []);

    return (
      <div
        className="relative w-full min-h-[8in] cursor-text select-text"
        onClick={() => {
          if (viewRef.current && !viewRef.current.hasFocus()) {
            viewRef.current.focus();
          }
        }}
      >
        <div ref={editorMountRef} className="prosemirror-container outline-none select-text cursor-text" />

        {/* Floating Transliteration Candidate Popup (I18N-02, TM-03, TM-15) */}
        {translitState.isActive && translitState.candidates.length > 0 && (
          <TransliterationPopup
            isOpen={translitState.isActive}
            romanBuffer={translitState.romanBuffer}
            candidates={translitState.candidates}
            selectedIndex={translitState.selectedIndex}
            onSelectCandidate={applyTransliterationCandidate}
            coords={translitState.coords}
          />
        )}

        {/* Screenplay Autocomplete Popup (Character, Scene, Transition) */}
        {!isModalOpen && !translitState.isActive && suggestionState && (
          <SuggestionPopup
            isOpen={suggestionState.isOpen}
            type={suggestionState.type}
            items={suggestionState.items}
            selectedIndex={suggestionState.selectedIndex}
            onSelect={applySuggestion}
            onClose={() => {
              suggestionStateRef.current = null;
              setSuggestionState(null);
            }}
            coords={caretCoords}
          />
        )}

        {/* Right-click Context Menu with Color Submenu for selected text */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="ds-menu fixed z-50 select-none animate-in fade-in duration-100"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
              minWidth: '170px',
            }}
          >
            {/* Color Submenu Trigger */}
            <div
              className="relative"
              onMouseEnter={() => setColorSubmenuOpen(true)}
              onMouseLeave={() => setColorSubmenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setColorSubmenuOpen(!colorSubmenuOpen)}
                className="ds-row w-full flex items-center justify-between"
                style={{ height: 'var(--h-md)', fontSize: 'var(--text-xs)' }}
              >
                <div className="flex items-center gap-2">
                  <Palette size={13} style={{ color: 'var(--text-secondary)' }} />
                  <span>Color</span>
                </div>
                <ChevronRight size={12} style={{ color: 'var(--text-secondary)' }} />
              </button>

              {/* Color Palette Submenu */}
              {colorSubmenuOpen && (
                <div
                  className="ds-menu absolute z-50 animate-in fade-in duration-100"
                  style={{
                    left: contextMenu.x + 170 + 180 > window.innerWidth ? 'auto' : '100%',
                    right: contextMenu.x + 170 + 180 > window.innerWidth ? '100%' : 'auto',
                    top: 0,
                    marginLeft: contextMenu.x + 170 + 180 > window.innerWidth ? undefined : '4px',
                    marginRight: contextMenu.x + 170 + 180 > window.innerWidth ? '4px' : undefined,
                    width: '180px',
                    boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
                  }}
                >
                  <div
                    className="px-2 py-1 font-semibold uppercase tracking-wider"
                    style={{ fontSize: '10px', color: 'var(--text-secondary)' }}
                  >
                    Text Color
                  </div>
                  <div className="space-y-0.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => applyTextColor(c.hex)}
                        className="ds-row w-full flex items-center gap-2"
                        style={{ height: 'var(--h-md)', fontSize: 'var(--text-xs)' }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }}
                        />
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="ds-menu__sep" />

                  <button
                    type="button"
                    onClick={() => applyTextColor(null)}
                    className="ds-row w-full flex items-center gap-2"
                    style={{ height: 'var(--h-md)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
                  >
                    <Ban size={13} style={{ color: 'var(--text-secondary)' }} />
                    <span>Clear Color</span>
                  </button>
                </div>
              )}
            </div>

            <div className="ds-menu__sep" />

            {/* Standard Clipboard helpers */}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.selectedText);
                setContextMenu(null);
              }}
              className="ds-row w-full flex items-center gap-2"
              style={{ height: 'var(--h-md)', fontSize: 'var(--text-xs)' }}
            >
              <Copy size={13} style={{ color: 'var(--text-secondary)' }} />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.selectedText);
                const view = viewRef.current;
                if (view) {
                  view.dispatch(view.state.tr.delete(contextMenu.from, contextMenu.to));
                  view.focus();
                }
                setContextMenu(null);
              }}
              className="ds-row w-full flex items-center gap-2"
              style={{ height: 'var(--h-md)', fontSize: 'var(--text-xs)' }}
            >
              <Scissors size={13} style={{ color: 'var(--text-secondary)' }} />
              <span>Cut</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

ProseMirrorEditor.displayName = 'ProseMirrorEditor';
