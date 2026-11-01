/**
 * virtualKeyboardPlugin.ts - ProseMirror Plugin for Offline Gurmukhi Virtual Keyboard
 *
 * Implements direct physical keyboard input mapping to Gurmukhi Unicode characters
 * based on the authoritative reference layout.
 *
 * Features:
 * - Direct Gurmukhi character insertion bypassing Roman transliteration
 * - Context-aware vowel insertion (independent vs combining vowel signs)
 * - Safe handling of existing combining marks (no invalid stacking)
 * - Complete preservation of editor shortcuts (Cmd/Ctrl+C, Cmd/Ctrl+V, Cmd/Ctrl+Z, etc.)
 * - Natural editor navigation (Backspace, Enter, Space, arrow keys)
 * - Immediate physical Shift state synchronization (supporting Left and Right Shift)
 * - Stale Shift state prevention on window/editor blur
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  KEY_CODE_MAP,
  KeyOutput,
  resolveContextualInput,
} from './gurmukhiKeyboardMappings';

export const virtualKeyboardPluginKey = new PluginKey('virtualKeyboardPlugin');

export interface VirtualKeyboardPluginOptions {
  isVirtualKeyboardActive: () => boolean;
  onShiftChange?: (isShift: boolean) => void;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
  onDeactivate?: () => void;
}

/**
 * Inserts a KeyOutput (string or ContextualVowel) into the ProseMirror view
 * using the editor's transaction mechanism and contextual vowel logic.
 */
export function insertVirtualKeyOutput(view: EditorView, output: KeyOutput) {
  const { state, dispatch } = view;
  const { from, to } = state.selection;
  const $from = state.doc.resolve(from);
  const textBeforeCaret = $from.parent.textBetween(0, $from.parentOffset, undefined, ' ');

  const { textToInsert, replaceLength } = resolveContextualInput(output, textBeforeCaret);
  if (!textToInsert) return;

  const insertPos = Math.max(0, from - (replaceLength || 0));
  const tr = state.tr;
  tr.insertText(textToInsert, insertPos, to);

  dispatch(tr.scrollIntoView());
  view.focus();
}

export function createVirtualKeyboardPlugin(options: VirtualKeyboardPluginOptions): Plugin {
  return new Plugin({
    key: virtualKeyboardPluginKey,
    props: {
      handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
        if (!options.isVirtualKeyboardActive()) {
          return false;
        }

        // 1. Never intercept macOS Command shortcuts (Cmd+C, Cmd+V, Cmd+A, Cmd+Z, Cmd+S, etc.)
        if (event.metaKey) {
          return false;
        }

        // 2. Track modifier key state changes immediately
        if (event.key === 'Shift' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
          options.onShiftChange?.(true);
          return false;
        }

        if (
          event.key === 'Control' ||
          event.key === 'Alt' ||
          event.code.startsWith('Control') ||
          event.code.startsWith('Alt')
        ) {
          options.onAltOrCtrlChange?.(true);
          return false;
        }

        // 3. Handle Escape: deactivates virtual keyboard mode
        if (event.key === 'Escape' || event.code === 'Escape') {
          event.preventDefault();
          options.onDeactivate?.();
          return true;
        }

        // 4. Six additional Gurmukhi characters via EITHER Ctrl OR Alt/Option:
        // Ctrl+S / Alt+S -> ਸ਼
        // Ctrl+G / Alt+G -> ਗ਼
        // Ctrl+J / Alt+J -> ਜ਼
        // Ctrl+K / Alt+K -> ਖ਼
        // Ctrl+L / Alt+L -> ਲ਼
        // Ctrl+P / Alt+P -> ਫ਼
        const isAltOrCtrl = event.altKey || event.ctrlKey;
        if (isAltOrCtrl) {
          const keyDef = KEY_CODE_MAP.get(event.code);
          if (keyDef && keyDef.alt) {
            event.preventDefault();
            insertVirtualKeyOutput(view, keyDef.alt);
            return true;
          }
          // Preserve all other platform / editor Ctrl & Alt combinations (Ctrl+C, Ctrl+V, etc.)
          return false;
        }

        // 5. Editor navigation and block structural commands: pass through to ProseMirror
        // (Backspace, Enter, Tab, Arrow keys, Home, End, PageUp, PageDown, Delete)
        if (
          event.key === 'Backspace' ||
          event.key === 'Enter' ||
          event.key === 'Tab' ||
          event.key === 'Delete' ||
          event.key.startsWith('Arrow') ||
          event.key === 'Home' ||
          event.key === 'End' ||
          event.key === 'PageUp' ||
          event.key === 'PageDown'
        ) {
          return false;
        }

        // 6. Space: insert a plain space directly (bypassing transliteration candidate commit)
        if (event.key === ' ' || event.code === 'Space') {
          event.preventDefault();
          const { state, dispatch } = view;
          const { from, to } = state.selection;
          const tr = state.tr.insertText(' ', from, to);
          dispatch(tr.scrollIntoView());
          return true;
        }

        // 7. Look up physical key code in the authoritative Gurmukhi keyboard mapping
        const keyDef = KEY_CODE_MAP.get(event.code);
        if (!keyDef || keyDef.isSpecial) {
          return false;
        }

        const output = event.shiftKey ? keyDef.shift : keyDef.normal;
        if (!output) {
          return false;
        }

        event.preventDefault();
        insertVirtualKeyOutput(view, output);
        return true;
      },
      handleDOMEvents: {
        keyup(_view: EditorView, event: KeyboardEvent): boolean {
          if (event.key === 'Shift' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
            options.onShiftChange?.(event.shiftKey);
          }
          if (
            event.key === 'Control' ||
            event.key === 'Alt' ||
            event.code.startsWith('Control') ||
            event.code.startsWith('Alt')
          ) {
            options.onAltOrCtrlChange?.(event.ctrlKey || event.altKey);
          }
          return false;
        },
        blur(_view: EditorView): boolean {
          // Prevent stale modifier state when editor loses focus
          options.onShiftChange?.(false);
          options.onAltOrCtrlChange?.(false);
          return false;
        },
      },
    },
  });
}
