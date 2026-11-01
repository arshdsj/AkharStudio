/**
 * transliterationPlugin.ts - ProseMirror Plugin for Roman-to-Gurmukhi Transliteration
 * Governing IDs: I18N-02, DEC-011, DEC-030, TM-03, TM-05, TM-14
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { GurmukhiTransliterator } from '../transliteration/engine';
import { DiagnosticRecorder, globalDiagnosticRecorder } from '../diagnostics/diagnosticRecorder';

export interface TransliterationState {
  isActive: boolean;
  romanBuffer: string;
  candidates: string[];
  selectedIndex: number;
  lastCommitted: { roman: string; gurmukhi: string; pos: number } | null;
  coords: { top: number; left: number } | null;
  isComposingIME: boolean; // Native OS IME composition flag (DEC-011)
  mode: 'pa' | 'en'; // Active input mode
  anchorPos: number | null; // Document position where uncommitted buffer starts
}

export const transliterationPluginKey = new PluginKey<TransliterationState>('transliterationPlugin');

/**
 * Commits a transliteration candidate into the ProseMirror editor view.
 * Unifies mouse-click selection with keyboard Space/Enter commit.
 */
export function commitTransliterationCandidate(
  view: EditorView,
  candidate: string,
  transliterator: GurmukhiTransliterator,
  recorder: DiagnosticRecorder = globalDiagnosticRecorder
) {
  const pluginState = transliterationPluginKey.getState(view.state);
  if (!pluginState || !pluginState.isActive) return;

  if (recorder && recorder.isRecording()) {
    recorder.recordSelection(pluginState.romanBuffer, candidate, pluginState.selectedIndex, 'click');
    recorder.recordCommit(pluginState.romanBuffer, candidate, pluginState.anchorPos ?? view.state.selection.from, 'click');
  }

  transliterator.recordSelection(candidate);

  const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;
  const tr = view.state.tr.insertText(candidate + ' ', anchor, anchor);
  const newPos = anchor + candidate.length + 1;

  const nextState: TransliterationState = {
    ...pluginState,
    isActive: false,
    romanBuffer: '',
    candidates: [],
    selectedIndex: 0,
    anchorPos: null,
    lastCommitted: {
      roman: pluginState.romanBuffer,
      gurmukhi: candidate,
      pos: newPos,
    },
  };

  tr.setMeta(transliterationPluginKey, nextState);
  view.dispatch(tr);
}

export function createTransliterationPlugin(
  transliterator: GurmukhiTransliterator,
  onStateChange: (state: TransliterationState) => void,
  getMode?: () => 'pa' | 'en',
  recorder: DiagnosticRecorder = globalDiagnosticRecorder,
  isVirtualKeyboardActive?: () => boolean
) {
  let pluginState: TransliterationState = {
    isActive: false,
    romanBuffer: '',
    candidates: [],
    selectedIndex: 0,
    lastCommitted: null,
    coords: null,
    isComposingIME: false,
    mode: 'pa',
    anchorPos: null,
  };

  const updateAndNotify = (newState: Partial<TransliterationState>, view?: EditorView) => {
    pluginState = { ...pluginState, ...newState };
    onStateChange(pluginState);
    if (view) {
      view.dispatch(view.state.tr.setMeta(transliterationPluginKey, pluginState));
    }
  };

  return new Plugin({
    key: transliterationPluginKey,

    state: {
      init(): TransliterationState {
        return pluginState;
      },
      apply(tr, value): TransliterationState {
        const meta = tr.getMeta(transliterationPluginKey);
        if (meta) {
          pluginState = { ...value, ...meta };
          onStateChange(pluginState);
          return pluginState;
        }
        return value;
      },
    },

    props: {
      decorations(state) {
        if (!pluginState.isActive || !pluginState.romanBuffer) {
          return DecorationSet.empty;
        }
        const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : state.selection.from;
        const selPos = Math.min(Math.max(0, anchor), state.doc.content.size);
        const widget = Decoration.widget(
          selPos,
          () => {
            const span = document.createElement('span');
            span.className = 'transliteration-inline-buffer';
            span.textContent = pluginState.romanBuffer;
            return span;
          },
          {
            side: -1, // Cursor renders AFTER the buffer, not before it
            key: `translit_${pluginState.romanBuffer}`, // Dynamic key ensures ProseMirror updates DOM
          }
        );
        return DecorationSet.create(state.doc, [widget]);
      },

      handleDOMEvents: {
        compositionstart: (_view) => {
          updateAndNotify({ isComposingIME: true, isActive: false, romanBuffer: '', candidates: [], anchorPos: null });
          return false;
        },
        compositionend: (_view) => {
          updateAndNotify({ isComposingIME: false });
          return false;
        },
      },

      handleClick(view: EditorView, _pos: number, _event: MouseEvent) {
        // If clicking elsewhere while an uncommitted buffer is active, commit it at anchor
        if (pluginState.isActive && pluginState.romanBuffer.length > 0) {
          const chosen = pluginState.candidates[pluginState.selectedIndex] || pluginState.romanBuffer;
          const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

          if (recorder && recorder.isRecording()) {
            recorder.recordSelection(pluginState.romanBuffer, chosen, pluginState.selectedIndex, 'click');
            recorder.recordCommit(pluginState.romanBuffer, chosen, anchor, 'click');
          }

          transliterator.recordSelection(chosen);

          const tr = view.state.tr.insertText(chosen + ' ', anchor, anchor);
          view.dispatch(tr);

          const newPos = anchor + chosen.length + 1;
          updateAndNotify({
            isActive: false,
            romanBuffer: '',
            candidates: [],
            selectedIndex: 0,
            anchorPos: null,
            lastCommitted: {
              roman: pluginState.romanBuffer,
              gurmukhi: chosen,
              pos: newPos,
            },
          }, view);
        }
        return false;
      },

      handleKeyDown(view: EditorView, event: KeyboardEvent) {
        // If native IME is active, English mode is on, or Virtual Keyboard mode is active, bypass transliteration
        const currentMode = getMode ? getMode() : pluginState.mode;
        const isVKActive = isVirtualKeyboardActive ? isVirtualKeyboardActive() : false;
        if (isVKActive) {
          if (pluginState.isActive) {
            updateAndNotify({ isActive: false, romanBuffer: '', candidates: [], anchorPos: null }, view);
          }
          return false;
        }
        if (pluginState.isComposingIME || currentMode === 'en') {
          return false;
        }

        // 1. If candidate popup is active (DEC-011, DEC-030)
        if (pluginState.isActive && pluginState.candidates.length > 0) {
          // Arrow Down: next candidate
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextIdx = (pluginState.selectedIndex + 1) % pluginState.candidates.length;
            if (recorder && recorder.isRecording()) {
              recorder.recordSelection(pluginState.romanBuffer, pluginState.candidates[nextIdx], nextIdx, 'arrow_nav');
            }
            updateAndNotify({ selectedIndex: nextIdx }, view);
            return true;
          }

          // Arrow Up: previous candidate
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prevIdx =
              (pluginState.selectedIndex - 1 + pluginState.candidates.length) %
              pluginState.candidates.length;
            if (recorder && recorder.isRecording()) {
              recorder.recordSelection(pluginState.romanBuffer, pluginState.candidates[prevIdx], prevIdx, 'arrow_nav');
            }
            updateAndNotify({ selectedIndex: prevIdx }, view);
            return true;
          }

          // Arrow Left / Right: commit candidate so cursor moves naturally without snapping
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            const chosen = pluginState.candidates[pluginState.selectedIndex] || pluginState.romanBuffer;
            const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

            if (recorder && recorder.isRecording()) {
              recorder.recordSelection(pluginState.romanBuffer, chosen, pluginState.selectedIndex, 'arrow_nav');
              recorder.recordCommit(pluginState.romanBuffer, chosen, anchor, 'arrow_nav');
            }

            transliterator.recordSelection(chosen);

            const tr = view.state.tr.insertText(chosen, anchor, anchor);
            view.dispatch(tr);

            const newPos = anchor + chosen.length;
            updateAndNotify({
              isActive: false,
              romanBuffer: '',
              candidates: [],
              selectedIndex: 0,
              anchorPos: null,
              lastCommitted: {
                roman: pluginState.romanBuffer,
                gurmukhi: chosen,
                pos: newPos,
              },
            }, view);
            return false; // Allow ProseMirror to handle the arrow navigation
          }

          // Space: commit candidate + space as one transaction (DEC-011)
          if (event.key === ' ') {
            event.preventDefault();
            const chosen = pluginState.candidates[pluginState.selectedIndex] || pluginState.romanBuffer;
            const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

            if (recorder && recorder.isRecording()) {
              recorder.recordSelection(pluginState.romanBuffer, chosen, pluginState.selectedIndex, 'space');
              recorder.recordCommit(pluginState.romanBuffer, chosen, anchor, 'space');
            }

            transliterator.recordSelection(chosen);

            const tr = view.state.tr.insertText(chosen + ' ', anchor, anchor);
            view.dispatch(tr);

            const newPos = anchor + chosen.length + 1;
            updateAndNotify({
              isActive: false,
              romanBuffer: '',
              candidates: [],
              selectedIndex: 0,
              anchorPos: null,
              lastCommitted: {
                roman: pluginState.romanBuffer,
                gurmukhi: chosen,
                pos: newPos,
              },
            }, view);
            return true;
          }

          // Enter: accept candidate only; no new block creation from this keypress (DEC-011)
          if (event.key === 'Enter') {
            event.preventDefault();
            const chosen = pluginState.candidates[pluginState.selectedIndex] || pluginState.romanBuffer;
            const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

            if (recorder && recorder.isRecording()) {
              recorder.recordSelection(pluginState.romanBuffer, chosen, pluginState.selectedIndex, 'enter');
              recorder.recordCommit(pluginState.romanBuffer, chosen, anchor, 'enter');
            }

            transliterator.recordSelection(chosen);

            const tr = view.state.tr.insertText(chosen, anchor, anchor);
            view.dispatch(tr);

            const newPos = anchor + chosen.length;
            updateAndNotify({
              isActive: false,
              romanBuffer: '',
              candidates: [],
              selectedIndex: 0,
              anchorPos: null,
              lastCommitted: {
                roman: pluginState.romanBuffer,
                gurmukhi: chosen,
                pos: newPos,
              },
            }, view);
            return true;
          }

          // Escape: dismiss popup; keep Roman buffer (DEC-011)
          if (event.key === 'Escape') {
            event.preventDefault();
            updateAndNotify({ isActive: false }, view);
            return true;
          }

          // Tab: dismiss popup and consume key (DEC-011)
          if (event.key === 'Tab') {
            event.preventDefault();
            updateAndNotify({ isActive: false }, view);
            return true;
          }

          // Digits 1-9: literal input (DEC-011, DEC-030)
          if (/^[0-9]$/.test(event.key)) {
            return false;
          }
        }

        // Active buffer with no candidates: Space or Enter commits literal Roman buffer
        if (pluginState.isActive && pluginState.romanBuffer.length > 0) {
          if (event.key === ' ') {
            event.preventDefault();
            const literal = pluginState.romanBuffer;
            const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

            if (recorder && recorder.isRecording()) {
              recorder.recordCommit(literal, literal, anchor, 'fallback_literal');
            }

            const tr = view.state.tr.insertText(literal + ' ', anchor, anchor);
            view.dispatch(tr);
            updateAndNotify({
              isActive: false,
              romanBuffer: '',
              candidates: [],
              selectedIndex: 0,
              anchorPos: null,
            }, view);
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const literal = pluginState.romanBuffer;
            const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

            if (recorder && recorder.isRecording()) {
              recorder.recordCommit(literal, literal, anchor, 'fallback_literal');
            }

            const tr = view.state.tr.insertText(literal, anchor, anchor);
            view.dispatch(tr);
            updateAndNotify({
              isActive: false,
              romanBuffer: '',
              candidates: [],
              selectedIndex: 0,
              anchorPos: null,
            }, view);
            return true;
          }
        }

        // Punctuation terminates active buffer and commits with punctuation
        if (
          pluginState.isActive &&
          pluginState.romanBuffer.length > 0 &&
          ['.', ',', '!', '?', ';', ':'].includes(event.key)
        ) {
          event.preventDefault();
          const chosen = pluginState.candidates[pluginState.selectedIndex] || pluginState.romanBuffer;
          const anchor = pluginState.anchorPos !== null ? pluginState.anchorPos : view.state.selection.from;

          if (recorder && recorder.isRecording()) {
            recorder.recordSelection(pluginState.romanBuffer, chosen, pluginState.selectedIndex, 'punctuation');
            recorder.recordCommit(pluginState.romanBuffer, chosen + event.key, anchor, 'punctuation');
          }

          transliterator.recordSelection(chosen);

          const tr = view.state.tr.insertText(chosen + event.key, anchor, anchor);
          view.dispatch(tr);

          const newPos = anchor + chosen.length + event.key.length;
          updateAndNotify({
            isActive: false,
            romanBuffer: '',
            candidates: [],
            selectedIndex: 0,
            anchorPos: null,
            lastCommitted: {
              roman: pluginState.romanBuffer,
              gurmukhi: chosen,
              pos: newPos,
            },
          }, view);
          return true;
        }

        // 2. Backspace handling: if uncommitted Roman buffer is active, delete last Roman character
        if (event.key === 'Backspace') {
          if (pluginState.isActive && pluginState.romanBuffer.length > 0) {
            event.preventDefault();
            const newBuf = pluginState.romanBuffer.slice(0, -1);
            if (recorder && recorder.isRecording()) {
              recorder.recordBackspace('buffer_backspace', newBuf);
            }
            if (newBuf.length === 0) {
              updateAndNotify({ isActive: false, romanBuffer: '', candidates: [], anchorPos: null }, view);
            } else {
              const detailed = transliterator.suggestWithDetails(newBuf, 5);
              const newCands = detailed.candidates;
              if (recorder && recorder.isRecording()) {
                recorder.recordSuggest(
                  newBuf,
                  newBuf.toLowerCase(),
                  detailed.candidates,
                  detailed.details,
                  detailed.rawCandidatesCount
                );
              }
              updateAndNotify({
                romanBuffer: newBuf,
                candidates: newCands,
                selectedIndex: 0,
              }, view);
            }
            return true;
          }
          // Once committed, text is ordinary editable Unicode; do not restore Roman buffer
          return false;
        }

        // 3. Capturing Roman phonetic input (a-z, A-Z, braces for tokens)
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          event.key.length === 1 &&
          /^[a-zA-Z{}_\-]$/.test(event.key)
        ) {
          event.preventDefault();
          const currentAnchor =
            pluginState.isActive && pluginState.anchorPos !== null
              ? pluginState.anchorPos
              : view.state.selection.from;
          const newBuffer = (pluginState.isActive ? pluginState.romanBuffer : '') + event.key;
          const detailed = transliterator.suggestWithDetails(newBuffer, 5);
          const candidates = detailed.candidates;

          if (recorder && recorder.isRecording()) {
            recorder.recordSuggest(
              newBuffer,
              newBuffer.toLowerCase(),
              detailed.candidates,
              detailed.details,
              detailed.rawCandidatesCount
            );
          }

          let coords: { top: number; left: number } | null = null;
          try {
            const pmCoords = view.coordsAtPos(currentAnchor, 1);
            if (pmCoords && (pmCoords.top > 0 || pmCoords.bottom > 0)) {
              coords = { top: pmCoords.bottom, left: pmCoords.left };
            }
          } catch {
            coords = null;
          }

          if (!coords && view.dom) {
            const rect = view.dom.getBoundingClientRect();
            coords = { top: rect.top + 28, left: rect.left + 40 };
          }

          updateAndNotify({
            isActive: true,
            romanBuffer: newBuffer,
            candidates,
            selectedIndex: 0,
            anchorPos: currentAnchor,
            coords,
          }, view);
          return true;
        }

        return false;
      },
    },
  });
}
