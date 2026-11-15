import { describe, it } from 'vitest';
import { performance } from 'perf_hooks';
import { EditorState } from 'prosemirror-state';
import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import { createUnifiedPaginationPlugin } from '../src/core/editor/unifiedPaginationPlugin';
import { generateUnifiedScreenplayPdfHtml } from '../src/core/export/pdfExporter';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';
import { FontMetricsProvider } from '../src/core/layout/fontMetrics';
import { GOLDEN_BLOCKS, GOLDEN_METADATA, createGoldenDraft } from './fixtures/golden-screenplay.fixture';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
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

describe('Standalone Performance Measurement Audit', () => {
  it('measures p50 and p95 for typing, paste reflow, PDF export, and transliteration', () => {
    const metrics = new FontMetricsProvider({
      measureFn: (text: string) => Number((text.length * 7.2).toFixed(4)),
    });
    const layoutService = createTextLayoutService(metrics);

    const shortDraft = createGoldenDraft();
    const medDraft = createScaledDraft(30);
    const longDraft = createScaledDraft(100);

    console.log(`\n======================================================`);
    console.log(` STANDALONE BENCHMARK EXECUTION`);
    console.log(`======================================================\n`);

    // 1. Typing latency
    console.log('--- 1. Typing Latency (Incremental Keystroke) ---');
    const workloads = [
      { name: 'Short (5p)', draft: shortDraft },
      { name: 'Medium (35p)', draft: medDraft },
      { name: 'Long (117p)', draft: longDraft },
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

      const allLatencies: number[] = [];
      for (const { pos } of positions) {
        for (let i = 0; i < 20; i++) {
          const char = i % 2 === 0 ? 'ਸ' : 'k';
          const t0 = performance.now();
          const tr = state.tr.insertText(char, pos);
          state = state.apply(tr);
          plugin.props.decorations!.call(plugin, state);
          allLatencies.push(performance.now() - t0);
        }
      }
      allLatencies.sort((a, b) => a - b);
      const p50 = allLatencies[Math.floor(allLatencies.length * 0.50)];
      const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)];
      console.log(`  ${w.name.padEnd(16)}: p50 = ${p50.toFixed(2).padStart(6)} ms | p95 = ${p95.toFixed(2).padStart(6)} ms (n=${allLatencies.length})`);
    }

    // 2. Paste Reflow
    console.log('\n--- 2. Page-Boundary Reflow (117p Feature Script) ---');
    {
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

      plugin.props.decorations!.call(plugin, state);
      const breakPos = Math.floor(state.doc.content.size / 2);

      // Keystroke at boundary
      const t0 = performance.now();
      state = state.apply(state.tr.insertText('ਕ', breakPos));
      plugin.props.decorations!.call(plugin, state);
      const boundaryMs = performance.now() - t0;

      // Paste 500 characters (15-line monologue)
      const pastedMonologue = 'ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ। '.repeat(10);
      const t1 = performance.now();
      state = state.apply(state.tr.insertText(pastedMonologue, breakPos + 1));
      plugin.props.decorations!.call(plugin, state);
      const pasteMs = performance.now() - t1;

      // Delete 500 characters
      const t2 = performance.now();
      state = state.apply(state.tr.delete(breakPos + 1, breakPos + 1 + pastedMonologue.length));
      plugin.props.decorations!.call(plugin, state);
      const deleteMs = performance.now() - t2;

      console.log(`  Boundary Keystroke: ${boundaryMs.toFixed(2)} ms`);
      console.log(`  Paste 500 chars   : ${pasteMs.toFixed(2)} ms`);
      console.log(`  Delete 500 chars  : ${deleteMs.toFixed(2)} ms`);
    }

    // 3. PDF Export Generation
    console.log('\n--- 3. PDF Export HTML Generation (Letter) ---');
    for (const w of workloads) {
      const times: number[] = [];
      for (let r = 0; r < 5; r++) {
        const t0 = performance.now();
        generateUnifiedScreenplayPdfHtml(w.draft, GOLDEN_METADATA, {
          paperSize: 'letter',
          includeTitlePage: false,
          contdSetting: 'on',
          textLayoutService: layoutService,
          allowHeadlessFallback: true,
        });
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.50)];
      const p95 = times[Math.floor(times.length * 0.95)];
      console.log(`  ${w.name.padEnd(16)}: p50 = ${p50.toFixed(2).padStart(6)} ms | p95 = ${p95.toFixed(2).padStart(6)} ms`);
    }

    // 4. Transliteration Suggestions
    console.log('\n--- 4. Transliteration Suggestion Latency ---');
    {
      const transEngine = defaultTransliterator;
      const testWords = ['reha', 'vadiya', 'vadhiya', 'keha', 'rehe', 'rehi', 'kiddan', 'tusi', 'mera', 'tere'];
      const times: number[] = [];
      for (let i = 0; i < 200; i++) {
        const word = testWords[i % testWords.length];
        const t0 = performance.now();
        transEngine.suggest(word, 5);
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.50)];
      const p95 = times[Math.floor(times.length * 0.95)];
      console.log(`  Query Latency     : p50 = ${p50.toFixed(4)} ms | p95 = ${p95.toFixed(4)} ms`);
    }
    console.log(`\n======================================================\n`);
  });
});
