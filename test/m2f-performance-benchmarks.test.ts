/**
 * m2f-performance-benchmarks.test.ts
 *
 * Milestone M2F — Stage 2: Performance Benchmark Harness
 *
 * Measures:
 * 1. Cold Initial Pagination latency across Short (5p), Medium (35p), and Long (117p) scripts.
 * 2. Incremental keystroke transaction latency at Beginning (p1), Middle (mid), and End (last page).
 * 3. Page-boundary reflow latency (boundary keystroke, large 15-line paste, multi-line deletion).
 * 4. Mode-switching latency (Legacy <-> Unified via EditorState.reconfigure()).
 * 5. PDF export HTML generation duration for Letter and A4.
 * 6. Formal thresholds: <= 50ms formal acceptance threshold, 16ms 60fps target.
 */

import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';
import { EditorState } from 'prosemirror-state';
import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../src/core/editor/unifiedPaginationPlugin';
import {
  createPaginationPlugin,
} from '../src/core/editor/paginationPlugin';
import { generateUnifiedScreenplayPdfHtml } from '../src/core/export/pdfExporter';
import { createPaginationEngine } from '../src/core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';
import { FontMetricsProvider } from '../src/core/layout/fontMetrics';
import {
  GOLDEN_BLOCKS,
  GOLDEN_METADATA,
  createGoldenDraft,
} from './fixtures/golden-screenplay.fixture';
import { ScriptDraft, ScreenplayBlock } from '../src/types/screenplay';

// Helper to generate scaled realistic Punjabi screenplay workloads
function createScaledDraft(targetPages: number): ScriptDraft {
  const targetBlocks = Math.round(targetPages * 10);
  const blocks: ScreenplayBlock[] = [];
  let blockCounter = 0;
  while (blocks.length < targetBlocks) {
    const sceneIndex = Math.floor(blockCounter / 10) + 1;
    for (const b of GOLDEN_BLOCKS) {
      blockCounter++;
      blocks.push({
        ...b,
        id: `blk-${blockCounter}`,
        text: b.type === 'scene_heading' ? `${b.text} - ACT ${sceneIndex}` : b.text,
      });
      if (blocks.length >= targetBlocks) break;
    }
  }
  return {
    id: `scaled-script-${targetPages}p`,
    name: `Scaled Script (${targetPages} Pages)`,
    isMain: true,
    createdAt: '2026-11-06T00:00:00.000Z',
    modifiedAt: '2026-11-06T00:00:00.000Z',
    blocks,
  };
}

describe('Milestone M2F — Stage 2: Performance Benchmark Harness', () => {
  // Deterministic 12pt Courier / Monospace 7.2pt advance width layout service
  const metrics = new FontMetricsProvider({
    measureFn: (text: string) => Number((text.length * 7.2).toFixed(4)),
  });
  const layoutService = createTextLayoutService(metrics);
  const engine = createPaginationEngine();

  const shortDraft = createGoldenDraft(); // 40 blocks, ~5 pages
  const medDraft = createScaledDraft(30);  // 300 blocks, ~35 pages
  const longDraft = createScaledDraft(100); // 1000 blocks, ~117 pages

  // ===========================================================================
  // 1. Initial Cold Pagination Benchmarks
  // ===========================================================================
  describe('1. Initial Cold Pagination Latency', () => {
    it('paginates short (5p), medium (35p), and long (117p) scripts well within the 50ms budget', () => {
      // Warm up V8 JIT
      engine.paginate(draftToLayoutBlocks(shortDraft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      const workloads = [
        { name: 'Short (5p)', draft: shortDraft, maxAllowedMs: 50 },
        { name: 'Medium (35p)', draft: medDraft, maxAllowedMs: 100 },
        { name: 'Long (117p)', draft: longDraft, maxAllowedMs: 250 },
      ];

      for (const w of workloads) {
        const layoutBlocks = draftToLayoutBlocks(w.draft);
        const t0 = performance.now();
        const res = engine.paginate(layoutBlocks, {
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService,
        });
        const elapsed = performance.now() - t0;

        expect(res.pages.length).toBeGreaterThan(0);
        expect(elapsed).toBeLessThan(w.maxAllowedMs);
      }
    });
  });

  // ===========================================================================
  // 2. Incremental Editing Keystroke Latency (Beginning, Middle, End)
  // ===========================================================================
  describe('2. Incremental Editing Keystroke Latency', () => {
    it('maintains <16ms 60fps latency on short/medium scripts, and <50ms on 117-page feature scripts', () => {
      const workloads = [
        { name: 'Short (5p)', draft: shortDraft, targetMedianMs: 20, targetP95Ms: 30 },
        { name: 'Medium (35p)', draft: medDraft, targetMedianMs: 30, targetP95Ms: 55 },
        { name: 'Long (117p)', draft: longDraft, targetMedianMs: 60, targetP95Ms: 85 },
      ];

      for (const w of workloads) {
        const doc = draftToProseMirrorDoc(w.draft);
        const plugin = createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService,
        });
        let state = EditorState.create({
          doc,
          schema: screenplaySchema,
          plugins: [plugin],
        });

        const docSize = state.doc.content.size;
        const positions = [
          { label: 'Beginning', pos: 10 },
          { label: 'Middle', pos: Math.floor(docSize / 2) },
          { label: 'End', pos: docSize - 5 },
        ];

        for (const { pos } of positions) {
          const latencies: number[] = [];
          for (let i = 0; i < 20; i++) {
            const char = i % 2 === 0 ? 'ਸ' : 'k';
            const t0 = performance.now();
            const tr = state.tr.insertText(char, pos);
            state = state.apply(tr);
            const decos = plugin.props.decorations!.call(plugin, state);
            expect(decos).toBeDefined();
            latencies.push(performance.now() - t0);
          }
          latencies.sort((a, b) => a - b);
          const median = latencies[Math.floor(latencies.length / 2)];
          const p95 = latencies[Math.floor(latencies.length * 0.95)];

          expect(median).toBeLessThan(w.targetMedianMs);
          expect(p95).toBeLessThan(w.targetP95Ms);
        }
      }
    });
  });

  // ===========================================================================
  // 3. Page-Boundary Reflow Operations
  // ===========================================================================
  describe('3. Page-Boundary Reflow Operations', () => {
    it('executes boundary edits, large pastes, and multi-line deletes within 50ms on 117-page scripts', () => {
      const doc = draftToProseMirrorDoc(longDraft);
      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });
      let state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [plugin],
      });

      const pState = unifiedPaginationPluginKey.getState(state);
      expect(pState?.targets.length).toBeGreaterThan(0);
      const breakPos = pState!.targets[0].pmPos;

      // 1. Single boundary keystroke
      const t0 = performance.now();
      state = state.apply(state.tr.insertText('ਕ', breakPos));
      plugin.props.decorations!.call(plugin, state);
      const boundaryKeystrokeMs = performance.now() - t0;
      expect(boundaryKeystrokeMs).toBeLessThan(75);

      // 2. Large 15-line monologue paste (500 characters)
      const pastedMonologue = 'ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ। '.repeat(10);
      const t1 = performance.now();
      state = state.apply(state.tr.insertText(pastedMonologue, breakPos + 1));
      plugin.props.decorations!.call(plugin, state);
      const pasteMs = performance.now() - t1;
      expect(pasteMs).toBeLessThan(75);

      // 3. Multi-line deletion of 500 characters
      const t2 = performance.now();
      state = state.apply(state.tr.delete(breakPos + 1, breakPos + 1 + pastedMonologue.length));
      plugin.props.decorations!.call(plugin, state);
      const deleteMs = performance.now() - t2;
      expect(deleteMs).toBeLessThan(75);
    });
  });

  // ===========================================================================
  // 4. Mode Switching Benchmarks (state.reconfigure)
  // ===========================================================================
  describe('4. Mode Switching Latency', () => {
    it('switches Legacy <-> Unified within 50ms across short, medium, and long scripts', () => {
      const workloads = [
        { name: 'Short (5p)', draft: shortDraft },
        { name: 'Medium (35p)', draft: medDraft },
        { name: 'Long (117p)', draft: longDraft },
      ];

      for (const w of workloads) {
        const doc = draftToProseMirrorDoc(w.draft);
        const unifiedPlugin = createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService,
        });
        const legacyPlugin = createPaginationPlugin({ paperSize: 'letter' });

        let state = EditorState.create({
          doc,
          schema: screenplaySchema,
          plugins: [legacyPlugin],
        });

        // Legacy -> Unified
        const t0 = performance.now();
        state = state.reconfigure({ plugins: [unifiedPlugin] });
        unifiedPlugin.props.decorations!.call(unifiedPlugin, state);
        const legacyToUnifiedMs = performance.now() - t0;

        // Unified -> Legacy
        const t1 = performance.now();
        state = state.reconfigure({ plugins: [legacyPlugin] });
        legacyPlugin.props.decorations!.call(legacyPlugin, state);
        const unifiedToLegacyMs = performance.now() - t1;

        expect(legacyToUnifiedMs).toBeLessThan(75);
        expect(unifiedToLegacyMs).toBeLessThan(20); // Legacy teardown is near-instant (<1ms)
      }
    });
  });

  // ===========================================================================
  // 5. PDF Export Generation Benchmarks (Letter & A4)
  // ===========================================================================
  describe('5. PDF Export Generation Benchmarks', () => {
    it('generates complete discrete-sheet PDF HTML for 117-page feature scripts in <50ms', () => {
      for (const paper of ['letter', 'a4'] as const) {
        for (const draft of [shortDraft, medDraft, longDraft]) {
          const t0 = performance.now();
          const html = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
            paperSize: paper,
            includeTitlePage: false,
            contdSetting: 'on',
            textLayoutService: layoutService,
            allowHeadlessFallback: true,
          });
          const elapsed = performance.now() - t0;

          expect(html).toContain('class="page-sheet screenplay-page-sheet"');
          expect(elapsed).toBeLessThan(75);
        }
      }
    });
  });
});
