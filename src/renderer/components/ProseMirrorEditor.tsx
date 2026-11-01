/**
 * ProseMirrorEditor.tsx - ProseMirror Screenplay Editor Component with Transliteration
 * Governing IDs: MODEL-01, MODEL-03, EDIT-01..05, AC-01..04, CONT-01, CONT-02, I18N-02, DEC-011, DEC-030
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { EditorState, Transaction, Selection, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { history } from 'prosemirror-history';

import { screenplaySchema } from '../../core/editor/schema';
import { createScreenplayKeymap } from '../../core/editor/keymap';
import { handleScreenplayBackspace } from '../../core/editor/commands';
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
import {
  createVirtualKeyboardPlugin,
  insertVirtualKeyOutput,
} from '../../core/editor/virtualKeyboardPlugin';
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
  insertKeyOutput: (output: KeyOutput) => void;
  backspace: () => void;
  getSelectedBlocks: () => ScreenplayBlock[] | null;
}

interface ProseMirrorEditorProps {
  draft: ScriptDraft;
  onDraftChange: (updatedDraft: ScriptDraft) => void;
  contdSetting: ContdSetting;
  inputMode: 'pa' | 'en';
  isVirtualKeyboardOpen?: boolean;
  onToggleVirtualKeyboard?: () => void;
  onShiftChange?: (isShift: boolean) => void;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
  onTriggerContdPrompt: (characterName: string) => void;
  onActiveBlockChange: (block: ScreenplayBlock | null) => void;
  highlightCharacters?: HighlightCharactersSetting;
  isModalOpen?: boolean;
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
      isModalOpen = false,
    },
    ref
  ) => {
    const editorMountRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    // Keep active refs for callbacks to avoid stale closures in ProseMirror
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const onDraftChangeRef = useRef(onDraftChange);
    onDraftChangeRef.current = onDraftChange;

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

    // Screenplay Autocomplete state (Character, Scene, Transition)
    const [suggestionState, setSuggestionState] = useState<SuggestionState | null>(null);
    const suggestionStateRef = useRef<SuggestionState | null>(null);
    const [caretCoords, setCaretCoords] = useState<{ top: number; left: number } | null>(null);

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
    }));

    const highlightSettingRef = useRef(highlightCharacters);
    highlightSettingRef.current = highlightCharacters;

    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.dispatch(viewRef.current.state.tr.setMeta('characterHighlightUpdated', true));
      }
    }, [highlightCharacters]);

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
      const translitPlugin = createTransliterationPlugin(
        defaultTransliterator,
        (newState) => {
          setTranslitState(newState);
        },
        () => inputModeRef.current,
        undefined,
        () => isVirtualKeyboardOpenRef.current
      );

      const vkPlugin = createVirtualKeyboardPlugin({
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

      // Presentation-layer character highlight plugin (Requirement 5)
      const characterHighlightPlugin = new Plugin({
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

      const state = EditorState.create({
        doc: initialDoc,
        schema: screenplaySchema,
        plugins: [history(), translitPlugin, vkPlugin, characterHighlightPlugin, createScreenplayKeymap()],
      });

      const view = new EditorView(editorMountRef.current, {
        state,
        dispatchTransaction(tr: Transaction) {
          const newState = view.state.apply(tr);
          view.updateState(newState);

          if (tr.docChanged) {
            const updatedDraft = proseMirrorDocToDraft(newState.doc, draftRef.current);
            onDraftChangeRef.current(updatedDraft);

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
            });
          }

          // Screenplay element autocomplete (suppressed while transliterating or when modal is open)
          const isTransliterating =
            translitPlugin.getState(newState)?.isActive || false;
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
