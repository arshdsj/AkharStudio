/**
 * keymap.ts - ProseMirror Keymap Bindings for Punjabi Screenplay Editor
 * Governing IDs: EDIT-02, EDIT-03, EDIT-05, TOOL-02, T-02, T-03
 */

import { keymap } from 'prosemirror-keymap';
import { undo, redo } from 'prosemirror-history';
import { toggleMark } from 'prosemirror-commands';
import { screenplaySchema } from './schema';
import {
  handleScreenplayEnter,
  handleScreenplayTab,
  handleScreenplayBackspace,
  setBlockType,
} from './commands';

export function createScreenplayKeymap() {
  const bindings: { [key: string]: any } = {
    // Screenplay flow transitions
    Enter: handleScreenplayEnter,
    Tab: handleScreenplayTab,
    Backspace: handleScreenplayBackspace,

    // Block type conversion shortcuts (EDIT-05, T-02)
    'Mod-1': setBlockType('scene_heading'),
    'Mod-2': setBlockType('action'),
    'Mod-3': setBlockType('character'),
    'Mod-4': setBlockType('parenthetical'),
    'Mod-5': setBlockType('dialogue'),
    'Mod-6': setBlockType('transition'),
    'Mod-7': setBlockType('shot'),
    // Mod+8 is reserved and inert per EDIT-05, T-02
    'Mod-8': () => true,

    // Undo / Redo (TOOL-02, EDIT-05)
    'Mod-z': undo,
    'Mod-Shift-z': redo,
    'Ctrl-y': redo, // Windows alias

    // Inline formatting marks (TOOL-02)
    'Mod-b': toggleMark(screenplaySchema.marks.bold),
    'Mod-i': toggleMark(screenplaySchema.marks.italic),
    'Mod-u': toggleMark(screenplaySchema.marks.underline),
  };

  return keymap(bindings);
}
