/**
 * virtual-keyboard-integration.test.ts
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo, closeHistory } from 'prosemirror-history';
import { screenplaySchema } from '../src/core/editor/schema';
import { createVirtualKeyboardPlugin } from '../src/core/editor/virtualKeyboardPlugin';
import { createTransliterationPlugin } from '../src/core/editor/transliterationPlugin';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';

function createTestEditor(
  initialText: string = '',
  isVKActive: () => boolean,
  onShiftChange?: (s: boolean) => void,
  onAltOrCtrlChange?: (a: boolean) => void
) {
  const doc = screenplaySchema.node('doc', null, [
    screenplaySchema.node('screenplay_block', { type: 'action' }, initialText ? [screenplaySchema.text(initialText)] : []),
  ]);

  let translitState: any = null;

  const translitPlugin = createTransliterationPlugin(
    defaultTransliterator,
    (state) => {
      translitState = state;
    },
    () => 'pa',
    undefined,
    isVKActive
  );

  const vkPlugin = createVirtualKeyboardPlugin({
    isVirtualKeyboardActive: isVKActive,
    onShiftChange,
    onAltOrCtrlChange,
  });

  const state = EditorState.create({
    doc,
    schema: screenplaySchema,
    plugins: [history(), translitPlugin, vkPlugin],
  });

  const container = document.createElement('div');
  const view = new EditorView(container, {
    state,
  });

  return { view, getTranslitState: () => translitState };
}

function dispatchKey(view: EditorView, key: string, code: string, shiftKey: boolean = false, extra: any = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    code,
    shiftKey,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  // Trigger ProseMirror handleKeyDown
  const handled = view.someProp('handleKeyDown', (f) => f(view, event));
  return { handled, event };
}

describe('Virtual Keyboard Editor Integration & Verification', () => {
  it('Shift + E in an empty editor -> ਏ', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Caret at pos 1 (start of block)
    const { handled } = dispatchKey(view, 'E', 'KeyE', true);
    expect(handled).toBe(true);
    expect(view.state.doc.textContent).toBe('ਏ');
  });

  it('ਬ followed by Shift + E -> ਬੇ', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Type 'b' -> 'ਬ'
    dispatchKey(view, 'b', 'KeyB', false);
    expect(view.state.doc.textContent).toBe('ਬ');

    // Type Shift + E -> 'ਬੇ'
    const { handled } = dispatchKey(view, 'E', 'KeyE', true);
    expect(handled).toBe(true);
    expect(view.state.doc.textContent).toBe('ਬੇ');
  });

  it('ਬ followed by Space and Shift + E -> ਬ ਏ', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Type 'b' -> 'ਬ'
    dispatchKey(view, 'b', 'KeyB', false);
    expect(view.state.doc.textContent).toBe('ਬ');

    // Type Space -> 'ਬ '
    dispatchKey(view, ' ', 'Space', false);
    expect(view.state.doc.textContent).toBe('ਬ ');

    // Type Shift + E -> 'ਬ ਏ'
    dispatchKey(view, 'E', 'KeyE', true);
    expect(view.state.doc.textContent).toBe('ਬ ਏ');
  });

  it('inserts vowel at an existing cursor position inside text (ਸਬਤ -> ਸਬੇਤ)', () => {
    let vkActive = true;
    const { view } = createTestEditor('ਸਬਤ', () => vkActive);

    // Set cursor between 'ਬ' and 'ਤ' (pos 3)
    // In doc: action node starts at 0, content at 1. 'ਸ' is 1..2, 'ਬ' is 2..3, 'ਤ' is 3..4.
    const tr = view.state.tr.setSelection(
      (view.state.selection.constructor as any).near(view.state.doc.resolve(3))
    );
    view.dispatch(tr);
    expect(view.state.selection.from).toBe(3);

    // Type Shift + E
    dispatchKey(view, 'E', 'KeyE', true);
    expect(view.state.doc.textContent).toBe('ਸਬੇਤ');
  });

  it('verifies Normal and Shift mappings across keyboard rows', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Row 1: Digit1 (੧), Shift+Digit1 (!)
    dispatchKey(view, '1', 'Digit1', false);
    expect(view.state.doc.textContent).toBe('੧');
    dispatchKey(view, '!', 'Digit1', true);
    expect(view.state.doc.textContent).toBe('੧!');

    // Row 2: KeyR (ਰ), KeyT (ਤ), KeyP (ਪ)
    dispatchKey(view, 'r', 'KeyR', false);
    dispatchKey(view, 't', 'KeyT', false);
    dispatchKey(view, 'p', 'KeyP', false);
    expect(view.state.doc.textContent).toBe('੧!ਰਤਪ');

    // Row 3: KeyS (ਸ), KeyG (ਗ), KeyK (ਕ)
    dispatchKey(view, 's', 'KeyS', false);
    dispatchKey(view, 'g', 'KeyG', false);
    dispatchKey(view, 'k', 'KeyK', false);
    expect(view.state.doc.textContent).toBe('੧!ਰਤਪਸਗਕ');

    // Row 4: KeyZ (ਡ), KeyC (ਚ), KeyV (ਵ), KeyB (ਬ), KeyN (ਨ), KeyM (ਮ)
    dispatchKey(view, 'z', 'KeyZ', false);
    dispatchKey(view, 'c', 'KeyC', false);
    dispatchKey(view, 'v', 'KeyV', false);
    expect(view.state.doc.textContent).toBe('੧!ਰਤਪਸਗਕਡਚਵ');

    // Shift row 4: Shift+M (ੴ)
    dispatchKey(view, 'M', 'KeyM', true);
    expect(view.state.doc.textContent).toBe('੧!ਰਤਪਸਗਕਡਚਵੴ');
  });

  it('bypasses Roman transliteration while virtual keyboard is active', () => {
    let vkActive = true;
    const { view, getTranslitState } = createTestEditor('', () => vkActive);

    // Type 'k'
    dispatchKey(view, 'k', 'KeyK', false);
    expect(view.state.doc.textContent).toBe('ਕ');

    // Transliteration plugin state should NOT be active
    const tState = getTranslitState();
    expect(tState?.isActive || false).toBe(false);
    expect(tState?.romanBuffer || '').toBe('');
  });

  it('restores Roman transliteration when virtual keyboard is deactivated', () => {
    let vkActive = true;
    const { view, getTranslitState } = createTestEditor('', () => vkActive);

    // Active: types direct Gurmukhi
    dispatchKey(view, 'k', 'KeyK', false);
    expect(view.state.doc.textContent).toBe('ਕ');

    // Deactivate virtual keyboard
    vkActive = false;

    // Type 'a'
    dispatchKey(view, 'a', 'KeyA', false);
    // Transliteration plugin captures 'a' into roman buffer
    const tState = getTranslitState();
    expect(tState?.isActive).toBe(true);
    expect(tState?.romanBuffer).toBe('a');
  });

  it('supports backspace and undo/redo after combining vowel insertion', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Type 'b' -> 'ਬ'
    dispatchKey(view, 'b', 'KeyB', false);
    expect(view.state.doc.textContent).toBe('ਬ');

    // Close history group so subsequent vowel insertion is an independent history step
    view.dispatch(closeHistory(view.state.tr));

    // Type Shift+E -> 'ਬੇ'
    dispatchKey(view, 'E', 'KeyE', true);
    expect(view.state.doc.textContent).toBe('ਬੇ');

    // Undo -> 'ਬ'
    undo(view.state, view.dispatch);
    expect(view.state.doc.textContent).toBe('ਬ');

    // Redo -> 'ਬੇ'
    redo(view.state, view.dispatch);
    expect(view.state.doc.textContent).toBe('ਬੇ');

    // Backspace deletes combining mark 'ੇ', leaving 'ਬ'
    view.dispatch(view.state.tr.delete(view.state.selection.from - 1, view.state.selection.from));
    expect(view.state.doc.textContent).toBe('ਬ');
  });

  it('inserts the six additional Gurmukhi characters via EITHER Ctrl OR Alt/Option', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // 1. Ctrl+S and Alt+S -> ਸ਼
    dispatchKey(view, 's', 'KeyS', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਸ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 's', 'KeyS', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਸ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    // 2. Ctrl+G and Alt+G -> ਗ਼
    dispatchKey(view, 'g', 'KeyG', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਗ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 'g', 'KeyG', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਗ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    // 3. Ctrl+J and Alt+J -> ਜ਼
    dispatchKey(view, 'j', 'KeyJ', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਜ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 'j', 'KeyJ', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਜ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    // 4. Ctrl+K and Alt+K -> ਖ਼
    dispatchKey(view, 'k', 'KeyK', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਖ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 'k', 'KeyK', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਖ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    // 5. Ctrl+L and Alt+L -> ਲ਼
    dispatchKey(view, 'l', 'KeyL', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਲ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 'l', 'KeyL', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਲ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    // 6. Ctrl+P and Alt+P -> ਫ਼
    dispatchKey(view, 'p', 'KeyP', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਫ਼');
    view.dispatch(view.state.tr.delete(1, view.state.doc.content.size - 1));

    dispatchKey(view, 'p', 'KeyP', false, { altKey: true });
    expect(view.state.doc.textContent).toBe('ਫ਼');
  });

  it('handles contextual vowels after additional Gurmukhi characters (Ctrl+S -> ਸ਼ + Shift+E -> ਸ਼ੇ)', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // Ctrl+S -> ਸ਼
    dispatchKey(view, 's', 'KeyS', false, { ctrlKey: true });
    expect(view.state.doc.textContent).toBe('ਸ਼');

    // Shift+E -> ਸ਼ੇ
    dispatchKey(view, 'E', 'KeyE', true);
    expect(view.state.doc.textContent).toBe('ਸ਼ੇ');
  });

  it('preserves platform and application shortcuts without hijacking', () => {
    let vkActive = true;
    const { view } = createTestEditor('Text', () => vkActive);

    // macOS Command shortcuts must NEVER be intercepted
    expect(Boolean(dispatchKey(view, 's', 'KeyS', false, { metaKey: true }).handled)).toBe(false); // Cmd+S
    expect(Boolean(dispatchKey(view, 'a', 'KeyA', false, { metaKey: true }).handled)).toBe(false); // Cmd+A
    expect(Boolean(dispatchKey(view, 'c', 'KeyC', false, { metaKey: true }).handled)).toBe(false); // Cmd+C
    expect(Boolean(dispatchKey(view, 'v', 'KeyV', false, { metaKey: true }).handled)).toBe(false); // Cmd+V
    expect(Boolean(dispatchKey(view, 'z', 'KeyZ', false, { metaKey: true }).handled)).toBe(false); // Cmd+Z
    expect(Boolean(dispatchKey(view, 'o', 'KeyO', false, { metaKey: true }).handled)).toBe(false); // Cmd+O

    // Standard Ctrl shortcuts that are not in the 6 Punjabi mappings must pass through
    expect(Boolean(dispatchKey(view, 'c', 'KeyC', false, { ctrlKey: true }).handled)).toBe(false); // Ctrl+C
    expect(Boolean(dispatchKey(view, 'v', 'KeyV', false, { ctrlKey: true }).handled)).toBe(false); // Ctrl+V
    expect(Boolean(dispatchKey(view, 'z', 'KeyZ', false, { ctrlKey: true }).handled)).toBe(false); // Ctrl+Z
    expect(Boolean(dispatchKey(view, 'a', 'KeyA', false, { ctrlKey: true }).handled)).toBe(false); // Ctrl+A
    expect(Boolean(dispatchKey(view, 'o', 'KeyO', false, { ctrlKey: true }).handled)).toBe(false); // Ctrl+O

    // Alt combinations that are not in the 6 Punjabi mappings must pass through
    expect(Boolean(dispatchKey(view, 'a', 'KeyA', false, { altKey: true }).handled)).toBe(false);
    expect(Boolean(dispatchKey(view, 'Tab', 'Tab', false, { altKey: true }).handled)).toBe(false);
  });

  it('tracks physical Shift keydown and keyup accurately', () => {
    let vkActive = true;
    const shiftChanges: boolean[] = [];
    const { view } = createTestEditor('', () => vkActive, (s) => shiftChanges.push(s));

    // Shift keydown
    dispatchKey(view, 'Shift', 'ShiftLeft', true);
    expect(shiftChanges).toContain(true);

    // Shift keyup
    const keyUpEvent = new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft' });
    view.someProp('handleDOMEvents', (handlers) => handlers?.keyup?.(view, keyUpEvent));
    expect(shiftChanges).toContain(false);
  });

  it('appends ਉ after ਪਾ to produce ਪਾਉ and successfully types ਪਾਉਂਦਾ without unintended character replacement', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // 1. KeyP -> 'ਪ'
    dispatchKey(view, 'p', 'KeyP', false);
    expect(view.state.doc.textContent).toBe('ਪ');

    // 2. Shift+KeyA -> 'ਪਾ'
    dispatchKey(view, 'A', 'KeyA', true);
    expect(view.state.doc.textContent).toBe('ਪਾ');

    // 3. KeyU (u) -> appends 'ਉ' to produce 'ਪਾਉ' (must NOT replace 'ਪਾ' with 'ਪੁ')
    dispatchKey(view, 'u', 'KeyU', false);
    expect(view.state.doc.textContent).toBe('ਪਾਉ');

    // 4. Shift+KeyF -> Bindi (ਂ) -> 'ਪਾਉਂ'
    dispatchKey(view, 'F', 'KeyF', true);
    expect(view.state.doc.textContent).toBe('ਪਾਉਂ');

    // 5. KeyD -> 'ਦ' -> 'ਪਾਉਂਦ'
    dispatchKey(view, 'd', 'KeyD', false);
    expect(view.state.doc.textContent).toBe('ਪਾਉਂਦ');

    // 6. Shift+KeyA -> 'ਾ' -> 'ਪਾਉਂਦਾ'
    dispatchKey(view, 'A', 'KeyA', true);
    expect(view.state.doc.textContent).toBe('ਪਾਉਂਦਾ');
  });

  it('correctly builds diphthongs like ਹੋਏ and ਕੋਈ without vowel replacement', () => {
    let vkActive = true;
    const { view } = createTestEditor('', () => vkActive);

    // 'h' (ਹ) + 'o' (ੋ) -> 'ਹੋ'
    dispatchKey(view, 'h', 'KeyH', false);
    dispatchKey(view, 'o', 'KeyO', false);
    expect(view.state.doc.textContent).toBe('ਹੋ');

    // Shift+KeyE (e) -> appends 'ਏ' -> 'ਹੋਏ' (must not replace ੋ with ੇ)
    dispatchKey(view, 'E', 'KeyE', true);
    expect(view.state.doc.textContent).toBe('ਹੋਏ');

    // Space
    dispatchKey(view, ' ', 'Space', false);

    // 'k' (ਕ) + 'o' (ੋ) -> 'ਕੋ'
    dispatchKey(view, 'k', 'KeyK', false);
    dispatchKey(view, 'o', 'KeyO', false);
    expect(view.state.doc.textContent).toBe('ਹੋਏ ਕੋ');

    // Shift+KeyI -> appends 'ਈ' -> 'ਕੋਈ'
    dispatchKey(view, 'I', 'KeyI', true);
    expect(view.state.doc.textContent).toBe('ਹੋਏ ਕੋਈ');
  });

  it('tracks physical Ctrl / Alt keydown, keyup, and focus loss accurately', () => {
    let vkActive = true;
    const altCtrlChanges: boolean[] = [];
    const { view } = createTestEditor('', () => vkActive, undefined, (a) => altCtrlChanges.push(a));

    // Ctrl keydown
    dispatchKey(view, 'Control', 'ControlLeft', false, { ctrlKey: true });
    expect(altCtrlChanges).toContain(true);

    // Ctrl keyup
    const keyUpEvent = new KeyboardEvent('keyup', { key: 'Control', code: 'ControlLeft', ctrlKey: false, altKey: false });
    view.someProp('handleDOMEvents', (handlers) => handlers?.keyup?.(view, keyUpEvent));
    expect(altCtrlChanges).toContain(false);

    // Focus loss (blur) resets modifier state
    altCtrlChanges.length = 0;
    view.someProp('handleDOMEvents', (handlers) => handlers?.blur?.(view, new FocusEvent('blur')));
    expect(altCtrlChanges).toContain(false);
  });
});
