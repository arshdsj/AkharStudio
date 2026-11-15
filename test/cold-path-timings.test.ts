import { describe, it } from 'vitest';
import { Schema, Node as PMNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import {
  createUnifiedPaginationPlugin,
} from '../src/core/editor/unifiedPaginationPlugin';
import { createPaginationEngine } from '../src/core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';
import { FontMetricsProvider } from '../src/core/layout/fontMetrics';
import {
  GOLDEN_BLOCKS,
  createGoldenDraft,
} from './fixtures/golden-screenplay.fixture';
import { ScriptDraft, ScreenplayBlock } from '../src/types/screenplay';

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

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return Number(sorted[Math.max(0, idx)].toFixed(3));
}

describe('Cold-path Timings Benchmark', () => {
  const screenplaySchema = new Schema({
    nodes: {
      doc: { content: 'screenplay_block+' },
      screenplay_block: {
        attrs: { id: { default: '' }, type: { default: 'action' } },
        content: 'text*',
        toDOM: (node) => ['div', { 'data-block-id': node.attrs.id, 'data-block-type': node.attrs.type }, 0],
      },
      text: { inline: true },
    },
  });

  const metrics = new FontMetricsProvider({
    measureFn: (text: string) => Number((text.length * 7.2).toFixed(4)),
  });
  const layoutService = createTextLayoutService(metrics);

  const draft5 = createGoldenDraft(); // ~5 pages
  const draft35 = createScaledDraft(30); // ~35 pages
  const draft117 = createScaledDraft(100); // ~117 pages

  it('measures open-time pagination with empty cache, full-script paste, and font-load remeasure', () => {
    const RUNS = 20;

    // 1. Open-time pagination with empty cache for 5p, 35p, 117p
    const runColdPagination = (draft: ScriptDraft) => {
      const times: number[] = [];
      const blocks = draftToLayoutBlocks(draft);
      for (let i = 0; i < RUNS; i++) {
        const engine = createPaginationEngine();
        engine.clearCache();
        const t0 = performance.now();
        engine.paginate(blocks, { textLayoutService: layoutService, paperSize: 'letter' });
        times.push(performance.now() - t0);
      }
      return { p50: percentile(times, 50), p95: percentile(times, 95) };
    };

    const cold5 = runColdPagination(draft5);
    const cold35 = runColdPagination(draft35);
    const cold117 = runColdPagination(draft117);

    // 2. Full-script paste time for 5p, 35p, 117p into ProseMirror editor with Unified Plugin
    const runPaste = (draft: ScriptDraft) => {
      const times: number[] = [];
      for (let i = 0; i < RUNS; i++) {
        const plugin = createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'none',
          textLayoutService: layoutService,
        });

        const initialDoc = screenplaySchema.node('doc', null, [
          screenplaySchema.node('screenplay_block', { id: 'init-1', type: 'scene_heading' }, [
            screenplaySchema.text('EXT. INTRO - DAY'),
          ]),
        ]);

        let state = EditorState.create({
          schema: screenplaySchema,
          doc: initialDoc,
          plugins: [plugin],
        });

        // Construct pasted slice nodes
        const pastedNodes: PMNode[] = draft.blocks.map((b) =>
          screenplaySchema.node(
            'screenplay_block',
            { id: b.id, type: b.type },
            b.text ? [screenplaySchema.text(b.text)] : []
          )
        );

        const t0 = performance.now();
        const tr = state.tr.replaceWith(0, state.doc.content.size, pastedNodes);
        state = state.apply(tr);
        plugin.props.decorations!.call(plugin, state);
        times.push(performance.now() - t0);
      }
      return { p50: percentile(times, 50), p95: percentile(times, 95) };
    };

    const paste5 = runPaste(draft5);
    const paste35 = runPaste(draft35);
    const paste117 = runPaste(draft117);

    // 3. Time to re-measure after fonts load (engine.invalidateFonts())
    const runFontRemeasure = (draft: ScriptDraft) => {
      const times: number[] = [];
      const blocks = draftToLayoutBlocks(draft);
      const engine = createPaginationEngine();
      // First run to warm cache under gen 0
      engine.paginate(blocks, { textLayoutService: layoutService, paperSize: 'letter' });

      for (let i = 0; i < RUNS; i++) {
        const t0 = performance.now();
        engine.invalidateFonts();
        engine.paginate(blocks, { textLayoutService: layoutService, paperSize: 'letter' });
        times.push(performance.now() - t0);
      }
      return { p50: percentile(times, 50), p95: percentile(times, 95) };
    };

    const remeasure5 = runFontRemeasure(draft5);
    const remeasure35 = runFontRemeasure(draft35);
    const remeasure117 = runFontRemeasure(draft117);

    console.log('\n================ COLD-PATH TIMING BENCHMARKS ================');
    console.log(`Runs per benchmark: ${RUNS}`);
    console.log('-------------------------------------------------------------');
    console.log(`1. Open-Time Pagination (Empty Cache):`);
    console.log(`   -  5-page script:   p50 = ${cold5.p50} ms | p95 = ${cold5.p95} ms`);
    console.log(`   - 35-page script:   p50 = ${cold35.p50} ms | p95 = ${cold35.p95} ms`);
    console.log(`   - 117-page script:  p50 = ${cold117.p50} ms | p95 = ${cold117.p95} ms`);
    console.log('-------------------------------------------------------------');
    console.log(`2. Full-Script Paste Reflow:`);
    console.log(`   -  5-page script:   p50 = ${paste5.p50} ms | p95 = ${paste5.p95} ms`);
    console.log(`   - 35-page script:   p50 = ${paste35.p50} ms | p95 = ${paste35.p95} ms`);
    console.log(`   - 117-page script:  p50 = ${paste117.p50} ms | p95 = ${paste117.p95} ms`);
    console.log('-------------------------------------------------------------');
    console.log(`3. Re-measure Time after Fonts Load (invalidateFonts):`);
    console.log(`   -  5-page script:   p50 = ${remeasure5.p50} ms | p95 = ${remeasure5.p95} ms`);
    console.log(`   - 35-page script:   p50 = ${remeasure35.p50} ms | p95 = ${remeasure35.p95} ms`);
    console.log(`   - 117-page script:  p50 = ${remeasure117.p50} ms | p95 = ${remeasure117.p95} ms`);
    console.log('=============================================================\n');
  });
});
