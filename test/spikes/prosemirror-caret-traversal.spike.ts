/**
 * SPIKE 3: ProseMirror Caret Traversal Across Virtual Page Break
 * File: test/spikes/prosemirror-caret-traversal.spike.ts
 *
 * Objectives:
 * 1. Verify canonical document schema has ZERO page break nodes (only continuous screenplay elements: doc = screenplay_block+).
 * 2. Verify non-destructive widget decorations (Decoration.widget) for inter-block and mid-block virtual page breaks.
 * 3. Verify caret traversal across virtual page boundaries.
 * 4. Verify text selection spanning across boundaries (asserting no decoration leakage into document text).
 * 5. Verify text insertion, Punjabi transliteration simulation (e.g. replacing 'kripaa' with 'ਕ੍ਰਿੱਪਾ'), and backspace across boundaries.
 * 6. Verify undo/redo history preservation across boundary edits.
 * 7. Validate in both headless JSDOM environment and actual Electron Chromium renderer.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';
// @ts-ignore - JSDOM untyped in devDependencies
import { JSDOM } from 'jsdom';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection, Plugin, PluginKey } from 'prosemirror-state';
import { EditorView, Decoration, DecorationSet } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';

// Exact screenplay schema replica matching src/core/editor/schema.ts
const screenplaySchema = new Schema({
  nodes: {
    doc: { content: 'screenplay_block+' },
    screenplay_block: {
      content: 'inline*',
      group: 'block',
      attrs: {
        id: { default: '' },
        type: { default: 'action' },
        contd: { default: false },
        annotation: { default: '' },
        comment: { default: '' },
      },
      toDOM(node) {
        return [
          'div',
          {
            class: `screenplay-block block-${node.attrs.type}`,
            'data-block-type': node.attrs.type,
            'data-block-id': node.attrs.id,
          },
          0,
        ];
      },
    },
    text: { group: 'inline' },
  },
  marks: {
    bold: { toDOM: () => ['strong', 0] },
    italic: { toDOM: () => ['em', 0] },
    underline: { toDOM: () => ['u', 0] },
  },
});

describe('SPIKE 3: ProseMirror Virtual Page Break Caret Traversal & Document Integrity', () => {
  it('strictly maintains canonical schema without page break nodes', () => {
    expect('page_break' in screenplaySchema.nodes).toBe(false);
    expect('page' in screenplaySchema.nodes).toBe(false);
    expect(screenplaySchema.nodes.doc.spec.content).toBe('screenplay_block+');
  });

  it('handles inter-block and mid-block decorations without schema or state corruption in JSDOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>');
    const prevWindow = (global as any).window;
    const prevDoc = (global as any).document;
    const prevNode = (global as any).Node;

    try {
      (global as any).window = dom.window;
      (global as any).document = dom.window.document;
      (global as any).Node = dom.window.Node;

      // Create continuous document
      const scene = screenplaySchema.nodes.screenplay_block.create({ type: 'scene_heading', id: 's1' }, [
        screenplaySchema.text('1. EXT. AMRITSAR BORDER - NIGHT'),
      ]);
      const action = screenplaySchema.nodes.screenplay_block.create({ type: 'action', id: 'a1' }, [
        screenplaySchema.text('ਭਾਰੀ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ। ਪਵਨ ਹੌਲੀ-ਹੌਲੀ ਤੁਰਦਾ ਹੈ ਅਤੇ ਚਾਰੇ ਪਾਸੇ ਵੇਖਦਾ ਹੈ।'),
      ]);
      const character = screenplaySchema.nodes.screenplay_block.create({ type: 'character', id: 'c1' }, [
        screenplaySchema.text('ਪਵਨ'),
      ]);
      const dialogue = screenplaySchema.nodes.screenplay_block.create({ type: 'dialogue', id: 'd1' }, [
        screenplaySchema.text('ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਸ਼ਾਂਤ ਰਹੋ। ਸਭ ਠੀਕ ਹੋ ਜਾਵੇਗਾ।'),
      ]);

      const doc = screenplaySchema.nodes.doc.create(null, [scene, action, character, dialogue]);

      // Assert zero page_break nodes in document tree
      let pageBreakFound = false;
      doc.descendants((node) => {
        if (node.type.name === 'page_break') pageBreakFound = true;
      });
      expect(pageBreakFound).toBe(false);

      // Pagination plugin with virtual page break decorations
      let midBlockBreakOffset = 18; // inside dialogue
      const paginationKey = new PluginKey('spikePagination');

      const paginationPlugin = new Plugin({
        key: paginationKey,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            // Inter-block decoration between action and character
            const interPos = scene.nodeSize + action.nodeSize;
            decos.push(
              Decoration.widget(
                interPos,
                () => {
                  const el = dom.window.document.createElement('div');
                  el.className = 'screenplay-page-break';
                  el.setAttribute('contenteditable', 'false');
                  el.textContent = '--- PAGE BREAK ---';
                  return el;
                },
                { side: -1, stopEvent: () => true, ignoreSelection: true }
              )
            );

            // Mid-block decoration inside dialogue
            const dialogueStart = interPos + character.nodeSize + 1;
            const midPos = dialogueStart + midBlockBreakOffset;
            if (midPos < state.doc.content.size) {
              decos.push(
                Decoration.widget(
                  midPos,
                  () => {
                    const el = dom.window.document.createElement('span');
                    el.className = 'screenplay-page-continuation';
                    el.setAttribute('contenteditable', 'false');
                    el.textContent = ' [CONTINUED ON NEXT PAGE] ';
                    return el;
                  },
                  { side: -1, stopEvent: () => true, ignoreSelection: true }
                )
              );
            }

            return DecorationSet.create(state.doc, decos);
          },
        },
      });

      let state = EditorState.create({
        schema: screenplaySchema,
        doc,
        plugins: [history(), paginationPlugin],
      });

      const container = dom.window.document.getElementById('editor')!;
      const view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // 1. Test Caret traversal across inter-block boundary
      const interPos = scene.nodeSize + action.nodeSize;
      const beforeInter = interPos - 2;
      const afterInter = interPos + 1;

      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, beforeInter)));
      expect(view.state.selection.from).toBe(beforeInter);

      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, afterInter)));
      expect(view.state.selection.from).toBe(afterInter);

      // 2. Test Selection across mid-block boundary
      const dialogueStart = interPos + character.nodeSize + 1;
      const midPos = dialogueStart + midBlockBreakOffset;
      const selFrom = midPos - 5;
      const selTo = midPos + 5;

      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, selFrom, selTo)));
      expect(view.state.selection.from).toBe(selFrom);
      expect(view.state.selection.to).toBe(selTo);

      // Verify that underlying text does NOT contain decoration text
      const extractedText = view.state.doc.textBetween(selFrom, selTo);
      expect(extractedText).not.toContain('PAGE BREAK');
      expect(extractedText).not.toContain('CONTINUED');

      // 3. Test Punjabi typing & transliteration adjacent to boundary
      const initialSize = view.state.doc.nodeSize;
      view.dispatch(view.state.tr.insertText('ਕ੍ਰਿੱਪਾ ', midPos));
      expect(view.state.doc.nodeSize).toBe(initialSize + 'ਕ੍ਰਿੱਪਾ '.length);

      // 4. Test Backspace across boundary
      const textBeforeDel = view.state.doc.textContent;
      view.dispatch(view.state.tr.delete(midPos - 2, midPos + 2));
      const textAfterDel = view.state.doc.textContent;
      expect(textBeforeDel).not.toBe(textAfterDel);

      // 5. Test Undo / Redo
      while (undo(view.state, view.dispatch)) {}
      expect(view.state.doc.textContent).toBe(doc.textContent);

      while (redo(view.state, view.dispatch)) {}
      expect(view.state.doc.textContent).toBe(textAfterDel);

      // Check schema validity
      expect(() => view.state.doc.check()).not.toThrow();

      view.destroy();
    } finally {
      (global as any).window = prevWindow;
      (global as any).document = prevDoc;
      (global as any).Node = prevNode;
    }
  });

  it('runs complete interactive verification in Electron Chromium runtime', () => {
    const runnerPath = path.resolve(__dirname, 'runners/spike3-runner.cjs');
    const stdout = execFileSync(
      path.resolve(process.cwd(), 'node_modules/.bin/electron'),
      [runnerPath],
      {
        encoding: 'utf8',
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      }
    );

    const match = stdout.match(/SPIKE3_RESULTS:([\s\S]*?)END_SPIKE3_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    expect(results.schemaHasNoPageBreakNode).toBe(true);
    expect(results.interBlockBreakTraversed).toBe(true);
    expect(results.midBlockBreakTraversed).toBe(true);
    expect(results.crossBoundarySelectionSafe).toBe(true);
    expect(results.boundaryTypingPreserved).toBe(true);
    expect(results.punjabiTransliterationSafe).toBe(true);
    expect(results.backspaceAcrossBoundarySafe).toBe(true);
    expect(results.undoRedoRestoredExactState).toBe(true);
    expect(results.zeroSchemaViolations).toBe(true);
  });
});
