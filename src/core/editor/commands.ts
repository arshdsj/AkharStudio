/**
 * commands.ts - Screenplay Block Editing Commands & Transitions
 * Governing IDs: MODEL-03, EDIT-01, EDIT-02, EDIT-03, EDIT-05, T-02, T-03
 */

import { Command, EditorState, Transaction, Selection } from 'prosemirror-state';
import { screenplaySchema } from './schema';
import { ScreenplayBlockType } from '../../types/screenplay';
import { generateId } from '../model/ProjectModel';

/**
 * Screenplay following-type map for Enter transitions (EDIT-02)
 */
export const SCREENPLAY_ENTER_TRANSITIONS: Record<ScreenplayBlockType, ScreenplayBlockType> = {
  scene_heading: 'action',
  action: 'action',
  character: 'dialogue',
  parenthetical: 'dialogue',
  dialogue: 'character',
  transition: 'scene_heading',
  shot: 'action',
};

/**
 * Convert block at current selection to a specific screenplay element type (EDIT-05, T-02)
 */
export function setBlockType(type: ScreenplayBlockType): Command {
  return (state: EditorState, dispatch?: (tr: Transaction) => void): boolean => {
    const { $from } = state.selection;
    const blockPos = $from.before(1);
    const node = state.doc.nodeAt(blockPos);

    if (!node || node.type !== screenplaySchema.nodes.screenplay_block) {
      return false;
    }

    if (node.attrs.type === type) {
      return true; // Already this type
    }

    if (dispatch) {
      const tr = state.tr.setNodeMarkup(blockPos, undefined, {
        ...node.attrs,
        type,
      });
      dispatch(tr);
    }
    return true;
  };
}

/**
 * Screenplay Enter Key Command (EDIT-02, T-03)
 */
export const handleScreenplayEnter: Command = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean => {
  const { $from, $to } = state.selection;

  // Find current screenplay block
  const blockIndex = $from.index(0);
  const currentBlock = state.doc.child(blockIndex);
  const blockStart = $from.start(1);
  const blockEnd = $from.end(1);
  const currentType = currentBlock.attrs.type as ScreenplayBlockType;

  // Empty Dialogue -> convert to Action on Enter (standard script convention)
  if (currentType === 'dialogue' && currentBlock.textContent.trim().length === 0) {
    return setBlockType('action')(state, dispatch);
  }

  // Next element type according to screenplay transition rule (EDIT-02)
  const nextType = SCREENPLAY_ENTER_TRANSITIONS[currentType] || 'action';

  if (!dispatch) return true;

  const tr = state.tr;

  // If selection is collapsed at the very end of the block
  if ($from.pos === $to.pos && $from.pos === blockEnd) {
    const newBlock = screenplaySchema.nodes.screenplay_block.create({
      id: generateId(),
      type: nextType,
      contd: false,
    });

    const insertPos = $from.after(1);
    tr.insert(insertPos, newBlock);
    // Set caret inside the newly created block
    tr.setSelection(Selection.near(tr.doc.resolve(insertPos + 1)));
    dispatch(tr.scrollIntoView());
    return true;
  }

  // If selection splits text inside the block
  const textBefore = currentBlock.textBetween(0, $from.pos - blockStart);
  const textAfter = currentBlock.textBetween($to.pos - blockStart, currentBlock.content.size);

  const block1 = screenplaySchema.nodes.screenplay_block.create(
    {
      ...currentBlock.attrs,
    },
    textBefore ? screenplaySchema.text(textBefore) : undefined
  );

  const block2 = screenplaySchema.nodes.screenplay_block.create(
    {
      id: generateId(),
      type: nextType,
      contd: false,
    },
    textAfter ? screenplaySchema.text(textAfter) : undefined
  );

  const replaceStart = $from.before(1);
  const replaceEnd = $from.after(1);

  tr.replaceWith(replaceStart, replaceEnd, [block1, block2]);
  const newCaretPos = replaceStart + block1.nodeSize + 1;
  tr.setSelection(Selection.near(tr.doc.resolve(newCaretPos)));
  dispatch(tr.scrollIntoView());
  return true;
};

/**
 * Screenplay Tab Key Command (EDIT-03, EDIT-04)
 * On empty Action block, Tab cycles element type to Character -> Parenthetical -> Dialogue -> etc.
 */
export const handleScreenplayTab: Command = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean => {
  const { $from } = state.selection;
  const currentBlock = state.doc.child($from.index(0));
  const currentType = currentBlock.attrs.type as ScreenplayBlockType;
  const isBlockEmpty = currentBlock.textContent.trim().length === 0;

  if (!isBlockEmpty) {
    // If not empty, do not cycle types
    return false;
  }

  // Tab cycle sequence: Action -> Character -> Parenthetical -> Dialogue -> Scene Heading -> Transition -> Shot -> Action
  const tabCycleOrder: ScreenplayBlockType[] = [
    'action',
    'character',
    'parenthetical',
    'dialogue',
    'scene_heading',
    'transition',
    'shot',
  ];

  const currentIndex = tabCycleOrder.indexOf(currentType);
  const nextType = tabCycleOrder[(currentIndex + 1) % tabCycleOrder.length];

  return setBlockType(nextType)(state, dispatch);
};

/**
 * Screenplay Backspace Key Command (EDIT-05, T-03)
 * Handles:
 * 1. Non-collapsed selection -> deletes selection
 * 2. Caret at start of block -> merges with previous block or converts empty block
 * 3. Caret within text -> deletes preceding Unicode code point / combining character predictably
 */
export const handleScreenplayBackspace: Command = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void
): boolean => {
  const { $from, $to } = state.selection;

  // 1. Non-collapsed selection: delete selection
  if ($from.pos !== $to.pos) {
    if (dispatch) {
      dispatch(state.tr.deleteSelection().scrollIntoView());
    }
    return true;
  }

  const blockStart = $from.start(1);

  // 2. Caret at the very beginning of a block: block merge / empty block deletion
  if ($from.pos === blockStart) {
    const blockIndex = $from.index(0);
    const currentBlock = state.doc.child(blockIndex);
    const currentType = currentBlock.attrs.type as ScreenplayBlockType;

    // If first block in document
    if (blockIndex === 0) {
      // If empty and not action, convert to action
      if (currentBlock.textContent.length === 0 && currentType !== 'action') {
        return setBlockType('action')(state, dispatch);
      }
      return false;
    }

    if (!dispatch) return true;

    const prevBlockPos = $from.before(1) - 1;

    // If current block is completely empty, delete it and put caret at end of previous block
    if (currentBlock.textContent.length === 0) {
      const tr = state.tr.delete($from.before(1), $from.after(1));
      const targetPos = Math.min(prevBlockPos, tr.doc.content.size);
      tr.setSelection(Selection.near(tr.doc.resolve(targetPos)));
      dispatch(tr.scrollIntoView());
      return true;
    }

    // If current block has text, merge text into previous block
    const prevEnd = prevBlockPos;
    const currentText = currentBlock.textContent;
    const tr = state.tr;

    // Insert text into previous block and delete current block
    if (currentText) {
      tr.insertText(currentText, prevEnd);
    }
    const currentStartInTr = tr.mapping.map($from.before(1));
    const currentEndInTr = tr.mapping.map($from.after(1));
    tr.delete(currentStartInTr, currentEndInTr);
    tr.setSelection(Selection.near(tr.doc.resolve(prevEnd)));
    dispatch(tr.scrollIntoView());
    return true;
  }

  // 3. Caret within text: delete the preceding Unicode code point / combining character
  if (!dispatch) return true;

  // Determine step size (handle surrogate pairs if any)
  const textBefore = $from.parent.textBetween(0, $from.parentOffset);
  let step = 1;
  if (textBefore.length >= 2) {
    const lastCode = textBefore.charCodeAt(textBefore.length - 1);
    const prevCode = textBefore.charCodeAt(textBefore.length - 2);
    if (lastCode >= 0xdc00 && lastCode <= 0xdfff && prevCode >= 0xd800 && prevCode <= 0xdbff) {
      step = 2;
    }
  }

  const deleteFrom = Math.max(blockStart, $from.pos - step);
  const tr = state.tr.delete(deleteFrom, $from.pos);
  dispatch(tr.scrollIntoView());
  return true;
};
