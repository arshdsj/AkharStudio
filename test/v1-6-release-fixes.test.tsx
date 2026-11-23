/**
 * v1-6-release-fixes.test.tsx
 * Automated test suite covering all 5 core fixes for Release v1.6:
 * 1. Transliteration recognition for "rasoi" and "rasoyi" -> "ਰਸੋਈ"
 * 2. Escape key dismissal while preserving typed English text (e.g. "OK")
 * 3. Text selection and replacement (mouse and keyboard)
 * 4. Header layout stability when switching logos (English <-> Gurmukhi)
 * 5. Removal of redundant "Local Database" indicator
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history } from 'prosemirror-history';

import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { screenplaySchema } from '../src/core/editor/schema';
import { createScreenplayKeymap } from '../src/core/editor/keymap';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import {
  createTransliterationPlugin,
  TransliterationState,
} from '../src/core/editor/transliterationPlugin';
import { HeaderRow1 } from '../src/renderer/components/HeaderRow1';
import { AkharStudioLogo } from '../src/renderer/components/AkharStudioLogo';

describe('Release v1.6: Bug Fixes & UX Improvements', () => {
  afterEach(() => {
    cleanup();
  });
  describe('Fix 1: Transliteration Recognition ("rasoi" & "rasoyi" -> "ਰਸੋਈ")', () => {
    it('recognises "rasoi" as Punjabi word "ਰਸੋਈ" at Rank 1', () => {
      const candidates = defaultTransliterator.suggest('rasoi', 5);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toBe('ਰਸੋਈ');
    });

    it('recognises alternative spelling "rasoyi" as Punjabi word "ਰਸੋਈ" at Rank 1', () => {
      const candidates = defaultTransliterator.suggest('rasoyi', 5);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0]).toBe('ਰਸੋਈ');
    });

    it('recognises common -oi and -oyi variants "koi", "koyi", "hoi", "hoyi"', () => {
      expect(defaultTransliterator.suggest('koi', 5)[0]).toBe('ਕੋਈ');
      expect(defaultTransliterator.suggest('koyi', 5)[0]).toBe('ਕੋਈ');
      expect(defaultTransliterator.suggest('hoi', 5)[0]).toBe('ਹੋਈ');
      expect(defaultTransliterator.suggest('hoyi', 5)[0]).toBe('ਹੋਈ');
    });
  });

  describe('Fix 2: Escape (Esc) Key Behaviour & English Word Preservation', () => {
    let view: EditorView;
    let container: HTMLDivElement;
    let pluginState: TransliterationState;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);

      const project = createDefaultProject();
      const doc = draftToProseMirrorDoc(project.drafts[0]);

      const translitPlugin = createTransliterationPlugin(defaultTransliterator, (state) => {
        pluginState = state;
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [history(), translitPlugin, createScreenplayKeymap()],
      });

      view = new EditorView(container, { state });
    });

    function dispatchKey(key: string) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      view.someProp('handleKeyDown', (f) => f(view, event));
    }

    it('pressing Esc dismisses the suggestion menu and preserves English text ("OK") in the document', () => {
      // Type "OK"
      dispatchKey('O');
      dispatchKey('K');

      expect(pluginState.isActive).toBe(true);
      expect(pluginState.romanBuffer).toBe('OK');
      expect(pluginState.candidates).toContain('OK');

      // Press Esc: menu is dismissed, but "OK" is NOT erased
      dispatchKey('Escape');

      expect(pluginState.isActive).toBe(false);
      // The English word "OK" remains in the document
      expect(view.state.doc.child(0).textContent).toBe('OK');
    });

    it('offers English candidate "OK" in suggestions list and commits "OK " on selection', () => {
      dispatchKey('O');
      dispatchKey('K');

      const okIdx = pluginState.candidates.indexOf('OK');
      expect(okIdx).toBeGreaterThan(0);

      // Select candidate
      for (let i = 0; i < okIdx; i++) {
        dispatchKey('ArrowDown');
      }
      expect(pluginState.selectedIndex).toBe(okIdx);

      // Space commits candidate
      dispatchKey(' ');
      expect(pluginState.isActive).toBe(false);
      expect(view.state.doc.child(0).textContent).toBe('OK ');
    });
  });

  describe('Fix 3: Text Selection and Replacement Behaviour', () => {
    let view: EditorView;
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);

      const project = createDefaultProject();
      const doc = draftToProseMirrorDoc(project.drafts[0]);

      const translitPlugin = createTransliterationPlugin(defaultTransliterator, () => {});

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [history(), translitPlugin, createScreenplayKeymap()],
      });

      view = new EditorView(container, { state });
    });

    function dispatchKey(key: string) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      view.someProp('handleKeyDown', (f) => f(view, event));
    }

    it('typing replaces selected text with keyboard selection (Shift+Arrows)', () => {
      // Type "punjab "
      for (const char of 'punjab') {
        dispatchKey(char);
      }
      dispatchKey(' ');
      expect(view.state.doc.child(0).textContent).toBe('ਪੰਜਾਬ ');

      // Select the word "ਪੰਜਾਬ " (pos 1 to 7)
      const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 7));
      view.dispatch(tr);
      expect(view.state.selection.empty).toBe(false);

      // Type "munda" and Space over selection
      for (const char of 'munda') {
        dispatchKey(char);
      }
      dispatchKey(' ');

      // Selected text "ਪੰਜਾਬ " is replaced by "ਮੁੰਡਾ ", NOT prepended!
      expect(view.state.doc.child(0).textContent).toBe('ਮੁੰਡਾ ');
    });

    it('typing replaces selected text with mouse selection', () => {
      // Set document with text "HELLO SCENE"
      const trInit = view.state.tr.insertText('HELLO SCENE', 1, 1);
      view.dispatch(trInit);
      expect(view.state.doc.child(0).textContent).toBe('HELLO SCENE');

      // Mouse drag selection over "SCENE" (pos 7 to 12)
      const trSel = view.state.tr.setSelection(TextSelection.create(view.state.doc, 7, 12));
      view.dispatch(trSel);
      expect(view.state.selection.empty).toBe(false);

      // Type "kudi" and Space
      for (const char of 'kudi') {
        dispatchKey(char);
      }
      dispatchKey(' ');

      expect(view.state.doc.child(0).textContent).toBe('HELLO ਕੁੜੀ ');
    });
  });

  describe('Fix 4: Header Layout Stability When Switching Logos', () => {
    it('maintains fixed width for both English and Gurmukhi logos (zero layout shift)', () => {
      const { container, rerender } = render(<AkharStudioLogo mode="en" size="md" />);
      const logoEl = container.firstChild as HTMLElement;
      expect(logoEl).toHaveClass('w-[160px]');
      expect(logoEl).toHaveClass('shrink-0');

      // Check prefix element
      const prefixEl = logoEl.querySelector('.akhar-logo-prefix');
      expect(prefixEl).toBeInTheDocument();
      expect(prefixEl).toHaveTextContent('Akhar');

      // Rerender in Gurmukhi mode
      rerender(<AkharStudioLogo mode="pa" size="md" />);
      const gurmukhiLogoEl = container.firstChild as HTMLElement;
      expect(gurmukhiLogoEl).toHaveClass('w-[160px]');
      expect(gurmukhiLogoEl).toHaveClass('shrink-0');

      const gurmukhiPrefixEl = gurmukhiLogoEl.querySelector('.akhar-logo-prefix');
      expect(gurmukhiPrefixEl).toBeInTheDocument();
      expect(gurmukhiPrefixEl).toHaveTextContent('ਅੱਖਰ');
    });

    it('header wraps logo in a dedicated fixed width container to lock adjacent menus in place', () => {
      const { container } = render(
        <HeaderRow1
          title="Test Script"
          onTitleChange={() => {}}
          saveStatus="clean"
          currentFilePath={null}
          onOpenLibrary={() => {}}
          onOpenSearch={() => {}}
          onRetrySave={() => {}}
        />
      );

      // Verify the logo wrapper has fixed width and shrink-0
      const logoWrapper = container.querySelector('.w-\\[160px\\].shrink-0');
      expect(logoWrapper).toBeInTheDocument();
    });
  });

  describe('Fix 5: Removal of Redundant "Local Database" Indicator', () => {
    it('does not render "Local Database" label in the header bar', () => {
      render(
        <HeaderRow1
          title="Test Script"
          onTitleChange={() => {}}
          saveStatus="clean"
          projectSource="database"
          currentFilePath={null}
          onOpenLibrary={() => {}}
          onOpenSearch={() => {}}
          onRetrySave={() => {}}
        />
      );

      // Verify "Local Database" text is NOT present in the interface
      expect(screen.queryByText('Local Database')).toBeNull();

      // Verify mini diagnostic tool was removed from header
      expect(screen.queryByLabelText('Start Recording Diagnostics')).toBeNull();
      expect(screen.queryByLabelText('Stop Recording Diagnostics')).toBeNull();
      expect(screen.queryByLabelText('Open Diagnostic Console')).toBeNull();
      expect(screen.queryByLabelText('Diagnostic Options')).toBeNull();
    });
  });
});
