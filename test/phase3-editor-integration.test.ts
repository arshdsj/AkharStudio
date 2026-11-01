/**
 * phase3-editor-integration.test.ts - End-to-End Transliteration & Keyboard State Machine Tests
 * Governing IDs: I18N-02, DEC-011, DEC-030, TM-03, TM-05, TM-15
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history } from 'prosemirror-history';

import { screenplaySchema } from '../src/core/editor/schema';
import { createScreenplayKeymap } from '../src/core/editor/keymap';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  createTransliterationPlugin,
  TransliterationState,
} from '../src/core/editor/transliterationPlugin';
import { GurmukhiLexicon, UserDictionary } from '../src/core/transliteration/lexicon';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';
import { createDefaultProject } from '../src/core/model/ProjectModel';

describe('Phase 3: ProseMirror Transliteration Plugin Integration & Keyboard Contract (TM-03)', () => {
  let lexicon: GurmukhiLexicon;
  let transliterator: GurmukhiTransliterator;
  let view: EditorView;
  let container: HTMLDivElement;
  let pluginState: TransliterationState;

  beforeEach(() => {
    lexicon = new GurmukhiLexicon();
    // Seed core test fixtures
    lexicon.insert('ਕਿੱਥੇ', 45000);
    lexicon.insert('ਪੁੱਤ', 28000);
    lexicon.insert('ਪੰਜਾਬ', 1870000);
    lexicon.insert('ਮੁੰਡਾ', 17000);
    lexicon.insert('ਕੁੜੀ', 69000);
    lexicon.insert('ਜ਼ਿੰਦਗੀ', 145000);
    lexicon.insert('ਚ', 4920000);
    lexicon.insert('ਫੁੱਲ', 81333);
    lexicon.insert('ਚੱਲੇ', 13815);
    lexicon.insert('ਗੱਲ', 692548);
    lexicon.insert('ਮੈਂ', 494540);
    lexicon.insert('ਮੈਨ', 12077);
    lexicon.insert('ਤੁਸੀਂ', 973372);
    lexicon.insert('ਤੁਸੀ', 23441);

    transliterator = new GurmukhiTransliterator(lexicon, new UserDictionary());

    container = document.createElement('div');
    document.body.appendChild(container);

    const project = createDefaultProject();
    const doc = draftToProseMirrorDoc(project.drafts[0]);

    const translitPlugin = createTransliterationPlugin(transliterator, (state) => {
      pluginState = state;
    });

    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins: [history(), translitPlugin, createScreenplayKeymap()],
    });

    view = new EditorView(container, {
      state,
    });
  });

  // Helper to dispatch mock KeyboardEvent to view
  function dispatchKey(key: string) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    });
    // Give ProseMirror a chance to process
    view.someProp('handleKeyDown', (f) => f(view, event));
  }

  it('types Roman letters "kitthe", triggers candidate popup with "ਕਿੱਥੇ" at Rank 1', () => {
    for (const char of 'kitthe') {
      dispatchKey(char);
    }

    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('kitthe');
    expect(pluginState.candidates).toContain('ਕਿੱਥੇ');
    expect(pluginState.candidates[0]).toBe('ਕਿੱਥੇ');
  });

  it('DEC-011: Space commits candidate + space as one transaction', () => {
    for (const char of 'kitthe') {
      dispatchKey(char);
    }
    // Press Space
    dispatchKey(' ');

    expect(pluginState.isActive).toBe(false);
    expect(pluginState.romanBuffer).toBe('');
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ ');
  });

  it('DEC-011: Enter accepts candidate only without creating a new block', () => {
    for (const char of 'punjab') {
      dispatchKey(char);
    }
    expect(pluginState.candidates[0]).toBe('ਪੰਜਾਬ');

    // Press Enter with candidate popup active
    dispatchKey('Enter');

    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.childCount).toBe(1); // Did NOT create new block!
    expect(view.state.doc.child(0).textContent).toBe('ਪੰਜਾਬ');
  });

  it('DEC-011: Escape dismisses popup while retaining Roman buffer', () => {
    for (const char of 'munda') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);

    dispatchKey('Escape');
    expect(pluginState.isActive).toBe(false);
    expect(pluginState.romanBuffer).toBe('munda'); // Retains Roman buffer
  });

  it('Backspace on committed text deletes Gurmukhi Unicode components predictably and never restores Roman buffer', () => {
    for (const char of 'kudi') {
      dispatchKey(char);
    }
    // Space auto-commits 'ਕੁੜੀ '
    dispatchKey(' ');
    expect(view.state.doc.child(0).textContent).toBe('ਕੁੜੀ ');
    expect(pluginState.isActive).toBe(false);

    // 1st Backspace: deletes the trailing space -> 'ਕੁੜੀ'
    dispatchKey('Backspace');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕੁੜੀ');

    // 2nd Backspace: deletes the combining vowel 'ੀ' (U+0A40) -> 'ਕੁੜ'
    dispatchKey('Backspace');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕੁੜ');

    // 3rd Backspace: deletes 'ੜ' (U+0A5C) -> 'ਕੁ'
    dispatchKey('Backspace');
    expect(view.state.doc.child(0).textContent).toBe('ਕੁ');

    // 4th Backspace: deletes combining vowel 'ੁ' (U+0A41) -> 'ਕ'
    dispatchKey('Backspace');
    expect(view.state.doc.child(0).textContent).toBe('ਕ');

    // 5th Backspace: deletes 'ਕ' (U+0A15) -> ''
    dispatchKey('Backspace');
    expect(view.state.doc.child(0).textContent).toBe('');
  });

  it('specifically reproduces: JAILLA -> commits ਜੈੱਲਾਂ -> Backspace -> ਜੈੱਲਾ with exact code points', () => {
    // Insert 'ਜੈੱਲਾਂ' directly at document start with caret at end
    const jaillan = 'ਜੈੱਲਾਂ'; // [ਜ, ੈ, ੱ, ਲ, ਾ, ਂ]
    const tr = view.state.tr.insertText(jaillan, 1, 1);
    view.dispatch(tr);
    expect(view.state.doc.child(0).textContent).toBe('ਜੈੱਲਾਂ');

    // Verify initial code points of ਜੈੱਲਾਂ: 6 code units
    const initialUnits = [...view.state.doc.child(0).textContent].map((c) =>
      c.charCodeAt(0).toString(16).toUpperCase()
    );
    expect(initialUnits).toEqual(['A1C', 'A48', 'A71', 'A32', 'A3E', 'A02']);

    // Backspace: deletes the final combining mark ਂ (U+0A02, Bindi) -> leaves ਜੈੱਲਾ
    dispatchKey('Backspace');
    expect(view.state.doc.child(0).textContent).toBe('ਜੈੱਲਾ');

    // Verify exact code points of remaining text: 5 code units
    const afterUnits = [...view.state.doc.child(0).textContent].map((c) =>
      c.charCodeAt(0).toString(16).toUpperCase()
    );
    expect(afterUnits).toEqual(['A1C', 'A48', 'A71', 'A32', 'A3E']);
  });

  it('DEC-008: Explicit token {ADDAK} commits Gurmukhi gemination mark (ੱ)', () => {
    for (const char of '{ADDAK}') {
      dispatchKey(char);
    }
    expect(pluginState.candidates).toEqual(['\u0A71']);

    dispatchKey(' ');
    expect(view.state.doc.child(0).textContent).toBe('\u0A71 ');
  });

  it('English mode bypasses transliteration plugin', () => {
    let mode: 'pa' | 'en' = 'en';
    const enTranslitPlugin = createTransliterationPlugin(
      transliterator,
      (state) => {
        pluginState = state;
      },
      () => mode
    );

    const project = createDefaultProject();
    const doc = draftToProseMirrorDoc(project.drafts[0]);
    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins: [history(), enTranslitPlugin, createScreenplayKeymap()],
    });
    const enView = new EditorView(container, { state });

    const event = new KeyboardEvent('keydown', { key: 'h', bubbles: true, cancelable: true });
    const handled = enView.someProp('handleKeyDown', (f) => f(enView, event));
    expect(handled).toBeFalsy(); // Plugin does NOT intercept, allows native typing
  });

  it('Punctuation commits active transliteration buffer + punctuation', () => {
    for (const char of 'kitthe') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);

    dispatchKey('?');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ?');
  });

  it('types multiple words consecutively without cursor snapping or stuck buffers', () => {
    // 1. Type first word: "kitthe" + space -> "ਕਿੱਥੇ "
    for (const char of 'kitthe') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('kitthe');
    dispatchKey(' ');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ ');

    // 2. Type second word: "putt" + space -> "ਕਿੱਥੇ ਪੁੱਤ "
    for (const char of 'putt') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('putt');
    expect(pluginState.candidates[0]).toBe('ਪੁੱਤ');
    dispatchKey(' ');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ ਪੁੱਤ ');

    // 3. Type third word: "punjab" + space -> "ਕਿੱਥੇ ਪੁੱਤ ਪੰਜਾਬ "
    for (const char of 'punjab') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('punjab');
    expect(pluginState.candidates[0]).toBe('ਪੰਜਾਬ');
    dispatchKey(' ');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ ਪੁੱਤ ਪੰਜਾਬ ');
  });

  it('commits candidate when ArrowRight is pressed to prevent cursor snapping', () => {
    for (const char of 'kitthe') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);

    // Press ArrowRight to move cursor past the active word
    dispatchKey('ArrowRight');

    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ');
  });

  it('mouse click commits active buffer at anchor without teleporting text', () => {
    for (const char of 'kitthe') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);

    // Simulate mouse click elsewhere
    const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    view.someProp('handleClick', (f) => f(view, 0, mouseEvent));

    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਕਿੱਥੇ ');
  });

  it('types "full", "main", and "tusi", verifying Rank 1 suggestion and Space commit into document', () => {
    // 1. Type "full" and press Space
    for (const char of 'full') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.candidates[0]).toBe('ਫੁੱਲ');
    dispatchKey(' ');
    expect(view.state.doc.child(0).textContent).toBe('ਫੁੱਲ ');

    // 2. Type "main" and press Space
    for (const char of 'main') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.candidates[0]).toBe('ਮੈਂ');
    dispatchKey(' ');
    expect(view.state.doc.child(0).textContent).toBe('ਫੁੱਲ ਮੈਂ ');

    // 3. Type "tusi" and press Space
    for (const char of 'tusi') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.candidates[0]).toBe('ਤੁਸੀਂ');
    dispatchKey(' ');
    expect(view.state.doc.child(0).textContent).toBe('ਫੁੱਲ ਮੈਂ ਤੁਸੀਂ ');
  });

  it('Custom Dictionary Space-commit: types "jailla" and Space commits exact custom spelling "ਜੈੱਲਾ"', () => {
    // Add custom dictionary mapping jailla -> ਜੈੱਲਾ
    transliterator.getCustomDictionary().addEntry('ਜੈੱਲਾ', ['jailla']);

    for (const char of 'jailla') {
      dispatchKey(char);
    }
    expect(pluginState.isActive).toBe(true);
    // Exact custom match must be candidate 0
    expect(pluginState.candidates[0]).toBe('ਜੈੱਲਾ');

    // Space commits candidate 0
    dispatchKey(' ');
    expect(pluginState.isActive).toBe(false);
    expect(view.state.doc.child(0).textContent).toBe('ਜੈੱਲਾ ');
  });
});
