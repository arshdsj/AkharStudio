/**
 * writing-experience-and-ui.test.tsx
 * @vitest-environment jsdom
 *
 * Automated verification for:
 * - Shift + Space behaviour (DEC-011, Phase 10)
 * - Suggestion popup dynamic positioning & boundary awareness (Phase 8)
 * - Virtual keyboard layout adjustment & transitions (Phase 9)
 */

import '@testing-library/jest-dom/vitest';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history } from 'prosemirror-history';

import { screenplaySchema } from '../src/core/editor/schema';
import { createScreenplayKeymap } from '../src/core/editor/keymap';
import {
  createTransliterationPlugin,
  TransliterationState,
} from '../src/core/editor/transliterationPlugin';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { TransliterationPopup } from '../src/renderer/components/TransliterationPopup';
import { SuggestionPopup } from '../src/renderer/components/SuggestionPopup';
import { ScreenplayCanvas } from '../src/renderer/components/ScreenplayCanvas';
import { VirtualGurmukhiKeyboard } from '../src/renderer/components/VirtualGurmukhiKeyboard';
import { FloatingToolbar } from '../src/renderer/components/FloatingToolbar';
import { StatusChip } from '../src/renderer/components/StatusChip';
import { createDefaultProject } from '../src/core/model/ProjectModel';

describe('Shift + Space Behaviour & Writing Experience (Phase 10)', () => {
  let view: EditorView;
  let container: HTMLDivElement;
  let pluginState: TransliterationState;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const doc = screenplaySchema.node('doc', null, [
      screenplaySchema.node('screenplay_block', { type: 'action' }, []),
    ]);

    const translitPlugin = createTransliterationPlugin(
      defaultTransliterator,
      (state) => {
        pluginState = state;
      },
      () => 'pa'
    );

    const state = EditorState.create({
      doc,
      schema: screenplaySchema,
      plugins: [history(), translitPlugin, createScreenplayKeymap()],
    });

    view = new EditorView(container, { state });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  function dispatchKey(key: string, shiftKey: boolean = false) {
    const event = new KeyboardEvent('keydown', {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    view.someProp('handleKeyDown', (f) => f(view, event));
  }

  function typeString(str: string) {
    for (const char of str) {
      dispatchKey(char);
    }
  }

  it('Shift + Space: commits Roman/English word unchanged without transliteration', () => {
    typeString('hello');
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('hello');

    // Press Shift + Space
    dispatchKey(' ', true);

    // English word must remain unchanged with space
    expect(view.state.doc.textContent).toBe('hello ');
    expect(pluginState.isActive).toBe(false);
    expect(pluginState.romanBuffer).toBe('');
  });

  it('Normal Space without Shift continues to transliterate normally', () => {
    typeString('punjab');
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.candidates).toContain('ਪੰਜਾਬ');

    // Press normal Space
    dispatchKey(' ', false);

    expect(view.state.doc.textContent).toBe('ਪੰਜਾਬ ');
    expect(pluginState.isActive).toBe(false);
  });

  it('Subsequent typing continues normally after Shift + Space', () => {
    // 1. Type English word with Shift + Space
    typeString('action');
    dispatchKey(' ', true);
    expect(view.state.doc.textContent).toBe('action ');

    // 2. Subsequent typing starts clean and transliterates
    typeString('munda');
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.romanBuffer).toBe('munda');

    dispatchKey(' ', false);
    expect(view.state.doc.textContent).toBe('action ਮੁੰਡਾ ');
  });

  it('Shift + Space dismisses suggestion popup cleanly', () => {
    typeString('phone');
    expect(pluginState.isActive).toBe(true);
    expect(pluginState.candidates.length).toBeGreaterThan(0);

    dispatchKey(' ', true);
    expect(pluginState.isActive).toBe(false);
    expect(pluginState.candidates).toEqual([]);
    expect(view.state.doc.textContent).toBe('phone ');
  });
});

describe('Suggestion Popup Viewport Positioning (Phase 8)', () => {
  beforeEach(() => {
    // Set standard viewport dimensions
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('positions popup below cursor when ample space exists below', () => {
    // Cursor at top: 150px
    const { getByRole } = render(
      <TransliterationPopup
        isOpen={true}
        romanBuffer="test"
        candidates={['ਟੈਸਟ', 'ਤਸਤ']}
        selectedIndex={0}
        onSelectCandidate={vi.fn()}
        coords={{ top: 150, bottom: 174, left: 300, right: 300 }}
        isVirtualKeyboardOpen={false}
      />
    );

    const popup = getByRole('listbox');
    expect(popup).toBeInTheDocument();
    // Below cursor: top should be cursorBottom (174) + 8 = 182px
    expect(popup.style.top).toBe('182px');
  });

  it('positions popup above cursor when insufficient space exists below', () => {
    // Cursor at top: 730px, bottom: 754px in an 800px window
    // Space below: 800 - 754 - 8 = 38px (insufficient for ~200px popup)
    const { getByRole } = render(
      <TransliterationPopup
        isOpen={true}
        romanBuffer="test"
        candidates={['ਟੈਸਟ', 'ਤਸਤ']}
        selectedIndex={0}
        onSelectCandidate={vi.fn()}
        coords={{ top: 730, bottom: 754, left: 300, right: 300 }}
        isVirtualKeyboardOpen={false}
      />
    );

    const popup = getByRole('listbox');
    const topValue = parseInt(popup.style.top, 10);
    // Must be positioned above cursor (top < 730)
    expect(topValue).toBeLessThan(730);
    expect(topValue).toBeGreaterThanOrEqual(8);
  });

  it('accounts for virtual keyboard height when positioning popup', () => {
    // Cursor at top: 480px, bottom: 504px.
    // In an 800px window without keyboard, 504px has 296px below (would place below).
    // BUT with virtual keyboard (height ~290px), visibleBottom = 800 - 290 = 510px.
    // Available below cursor is 510 - 504 - 8 = -2px! Popup MUST flip above cursor.
    const { getByRole } = render(
      <TransliterationPopup
        isOpen={true}
        romanBuffer="test"
        candidates={['ਟੈਸਟ', 'ਤਸਤ']}
        selectedIndex={0}
        onSelectCandidate={vi.fn()}
        coords={{ top: 480, bottom: 504, left: 300, right: 300 }}
        isVirtualKeyboardOpen={true}
      />
    );

    const popup = getByRole('listbox');
    const topValue = parseInt(popup.style.top, 10);
    // Must be flipped above cursor
    expect(topValue).toBeLessThan(480);
  });

  it('clamps popup within horizontal viewport boundaries', () => {
    // Cursor near right edge: left 1180px in 1200px wide window
    const { getByRole } = render(
      <TransliterationPopup
        isOpen={true}
        romanBuffer="test"
        candidates={['ਟੈਸਟ']}
        selectedIndex={0}
        onSelectCandidate={vi.fn()}
        coords={{ top: 200, bottom: 224, left: 1180, right: 1180 }}
        isVirtualKeyboardOpen={false}
      />
    );

    const popup = getByRole('listbox');
    const leftValue = parseInt(popup.style.left, 10);
    // Popup width is 288px. In 1200px window, left must not exceed 1200 - 288 - 16 = 896px
    expect(leftValue + 288).toBeLessThanOrEqual(1200);
    expect(leftValue).toBeGreaterThanOrEqual(16);
  });

  it('SuggestionPopup also dynamically flips above cursor when space below is tight', () => {
    render(
      <SuggestionPopup
        isOpen={true}
        type="character"
        items={[{ id: '1', label: 'ਅਮਨ', value: 'ਅਮਨ' }]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onClose={vi.fn()}
        coords={{ top: 720, bottom: 744, left: 400, right: 400 }}
        isVirtualKeyboardOpen={false}
      />
    );

    const popup = document.body.querySelector('.w-64') as HTMLElement;
    expect(popup).toBeInTheDocument();
    const topValue = parseInt(popup.style.top, 10);
    expect(topValue).toBeLessThan(720);
  });
});

describe('Virtual Keyboard Viewport & Layout Behaviour (Phase 9 & Critical Fix)', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('VirtualGurmukhiKeyboard: renders accessible card with smooth slide animation tokens', () => {
    const handleMeasured = vi.fn();
    const { getByRole, rerender } = render(
      <VirtualGurmukhiKeyboard
        isOpen={false}
        onClose={vi.fn()}
        onInsertOutput={vi.fn()}
        onBackspace={vi.fn()}
        onMeasuredHeight={handleMeasured}
      />
    );

    const keyboard = getByRole('region', { hidden: true });
    expect(keyboard).toBeInTheDocument();
    expect(keyboard.getAttribute('aria-hidden')).toBe('true');
    expect(keyboard.style.transform).toBe('translateY(100%)');
    expect(keyboard.style.opacity).toBe('0');
    expect(keyboard.style.pointerEvents).toBe('none');

    // Open keyboard
    rerender(
      <VirtualGurmukhiKeyboard
        isOpen={true}
        onClose={vi.fn()}
        onInsertOutput={vi.fn()}
        onBackspace={vi.fn()}
        onMeasuredHeight={handleMeasured}
      />
    );

    expect(keyboard.getAttribute('aria-hidden')).toBe('false');
    expect(keyboard.style.transform).toBe('translateY(0)');
    expect(keyboard.style.opacity).toBe('1');
    expect(keyboard.style.pointerEvents).toBe('auto');
    expect(keyboard.style.transition).toContain('var(--dur-slow)');
  });

  it('ScreenplayCanvas: retains stable document padding without hardcoded 320px jumps', () => {
    const project = createDefaultProject();

    const { container, rerender } = render(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={false}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    const scroller = container.querySelector('.flex-1.overflow-y-auto') as HTMLElement;
    expect(scroller).toBeInTheDocument();
    expect(scroller.style.paddingBottom).toBe('3rem');

    // When keyboard opens, document padding remains clean and stable
    rerender(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={true}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    expect(scroller.style.paddingBottom).toBe('3rem');
  });

  it('Scenario A: scrolls editor to keep active cursor visible when typing near the bottom', () => {
    const project = createDefaultProject();

    const { container, rerender } = render(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={false}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    const scroller = container.querySelector('.flex-1.overflow-y-auto') as HTMLElement;
    // Mock getBoundingClientRect for canvas (800px bottom)
    scroller.getBoundingClientRect = () => ({
      top: 80,
      bottom: 800,
      left: 0,
      right: 1200,
      width: 1200,
      height: 720,
      x: 0,
      y: 80,
      toJSON: () => {},
    });

    const scrollBySpy = vi.fn();
    scroller.scrollBy = scrollBySpy;

    // Mock window selection near the bottom (y = 750px)
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 730,
        bottom: 754,
        left: 300,
        right: 320,
        width: 20,
        height: 24,
      }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => mockRange,
    } as any);

    // Open keyboard
    rerender(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={true}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    // Must have scrolled to bring cursor above keyboard comfortably
    expect(scrollBySpy).toHaveBeenCalled();
    const scrollArg = scrollBySpy.mock.calls[0][0];
    expect(scrollArg.top).toBeGreaterThan(0);
    expect(scrollArg.behavior).toBe('smooth');
  });

  it('Scenario B & C: does not unnecessarily scroll when cursor is near top or middle', () => {
    const project = createDefaultProject();

    const { container, rerender } = render(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={false}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    const scroller = container.querySelector('.flex-1.overflow-y-auto') as HTMLElement;
    scroller.getBoundingClientRect = () => ({
      top: 80,
      bottom: 800,
      left: 0,
      right: 1200,
      width: 1200,
      height: 720,
      x: 0,
      y: 80,
      toJSON: () => {},
    });

    const scrollBySpy = vi.fn();
    scroller.scrollBy = scrollBySpy;

    // Cursor near top (y = 200px)
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 180,
        bottom: 204,
        left: 300,
        right: 320,
        width: 20,
        height: 24,
      }),
    };
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => mockRange,
    } as any);

    // Open keyboard
    rerender(
      <ScreenplayCanvas
        draft={project.drafts[0]}
        metadata={project.metadata}
        onMetadataChange={vi.fn()}
        onDraftChange={vi.fn()}
        contdSetting="off"
        inputMode="pa"
        isVirtualKeyboardOpen={true}
        keyboardHeight={280}
        paperSize="letter"
        zoom={100}
        onFocusTitle={vi.fn()}
        onFocusBlock={vi.fn()}
        onTriggerContdPrompt={vi.fn()}
      />
    );

    // Zero scroll needed
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it('FloatingToolbar and StatusChip glide smoothly above virtual keyboard dock', () => {
    // 1. FloatingToolbar
    const { container: ftContainer, rerender: ftRerender } = render(
      <FloatingToolbar
        activeBlock={null}
        isTitleEditing={false}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onApplyFormat={vi.fn()}
        onToggleCase={vi.fn()}
        onCopy={vi.fn()}
        onSelectBlockType={vi.fn()}
        isKeyboardOpen={false}
        keyboardHeight={296}
      />
    );

    const pillEl = ftContainer.querySelector('.undo-redo-pill') as HTMLElement;
    expect(pillEl.style.bottom).toBe('22px');

    // Open keyboard
    ftRerender(
      <FloatingToolbar
        activeBlock={null}
        isTitleEditing={false}
        canUndo={false}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onApplyFormat={vi.fn()}
        onToggleCase={vi.fn()}
        onCopy={vi.fn()}
        onSelectBlockType={vi.fn()}
        isKeyboardOpen={true}
        keyboardHeight={296}
      />
    );

    // Undo/Redo pill stays pinned at bottom: 22px above virtual keyboard dock (no double-offset bug)
    expect(pillEl.style.bottom).toBe('22px');
    expect(pillEl.style.transition).toContain('var(--dur-slow)');

    // 2. StatusChip
    const { container: scContainer, rerender: scRerender } = render(
      <StatusChip
        stats={{ wordCount: 120, pageCount: 1, characterCount: 500, sceneCount: 1 }}
        currentPage={1}
        showWordCount={true}
        onOpenHelp={vi.fn()}
        isKeyboardOpen={false}
        keyboardHeight={296}
      />
    );

    const scEl = scContainer.querySelector('.fixed.right-6') as HTMLElement;
    expect(scEl.style.bottom).toBe('1.5rem');

    scRerender(
      <StatusChip
        stats={{ wordCount: 120, pageCount: 1, characterCount: 500, sceneCount: 1 }}
        currentPage={1}
        showWordCount={true}
        onOpenHelp={vi.fn()}
        isKeyboardOpen={true}
        keyboardHeight={296}
      />
    );

    expect(scEl.style.bottom).toBe('308px');
    expect(scEl.style.transition).toContain('var(--dur-slow)');
  });
});
