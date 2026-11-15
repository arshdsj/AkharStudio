import { Schema, Node as PMNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../../src/core/editor/unifiedPaginationPlugin';
import { createPaginationEngine } from '../../src/core/layout/paginationEngine';
import { draftToLayoutBlocks, computeMarksHash } from '../../src/core/layout/paginationAdapter';
import { createTextLayoutService } from '../../src/core/layout/textLayoutService';
import { FontMetricsProvider } from '../../src/core/layout/fontMetrics';
import {
  GOLDEN_BLOCKS,
  createGoldenDraft,
} from '../fixtures/golden-screenplay.fixture';
import { ScriptDraft, ScreenplayBlock } from '../../src/types/screenplay';
import { generateScreenplayHtml } from '../../src/core/export/pdfExporter';

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

export async function runRealElectronBenchmark(): Promise<any> {
  // Ensure real fonts are loaded in this Chromium document
  await (document as any).fonts.ready;

  // Real Chromium FontMetricsProvider using actual canvas 2d context and real loaded TrueType fonts
  const metrics = new FontMetricsProvider({
    family: 'Courier Prime, Noto Sans Gurmukhi, monospace',
  });
  await metrics.ensureLoaded();

  // Real DOM/Canvas TextLayoutService
  const layoutService = createTextLayoutService(metrics);

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
    marks: {
      strong: {
        toDOM: () => ['strong', 0],
      },
      em: {
        toDOM: () => ['em', 0],
      },
    },
  });

  const draft5 = createGoldenDraft(); // ~5 pages
  const draft35 = createScaledDraft(30); // ~35 pages
  const draft117 = createScaledDraft(100); // ~117 pages

  const RUNS = 20;

  // 1. Open-Time Pagination with Empty Cache (Real Chromium Fonts)
  const runColdPagination = (draft: ScriptDraft) => {
    const times: number[] = [];
    const blocks = draftToLayoutBlocks(draft);
    for (let i = 0; i < RUNS; i++) {
      const engine = createPaginationEngine();
      engine.clearCache();
      const t0 = performance.now();
      const res = engine.paginate(blocks, { textLayoutService: layoutService, paperSize: 'letter' });
      times.push(performance.now() - t0);
      if (i === 0 && res.pages.length === 0) throw new Error('Pagination returned 0 pages');
    }
    return { p50: percentile(times, 50), p95: percentile(times, 95) };
  };

  const cold5 = runColdPagination(draft5);
  const cold35 = runColdPagination(draft35);
  const cold117 = runColdPagination(draft117);

  // 2. Full-Script Paste Reflow into live ProseMirror Editor State (Real Chromium Fonts)
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

  // 4. Keystroke Latency Measurement in Live ProseMirror View (Typing, Boundary, Deleting)
  const runKeystrokeLatency = (draft: ScriptDraft) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.width = '816px';
    document.body.appendChild(container);

    const docNodes: PMNode[] = draft.blocks.map((b) =>
      screenplaySchema.node(
        'screenplay_block',
        { id: b.id, type: b.type },
        b.text ? [screenplaySchema.text(b.text)] : []
      )
    );
    const doc = screenplaySchema.node('doc', null, docNodes);

    const plugin = createUnifiedPaginationPlugin({
      paperSize: 'letter',
      contdSetting: 'none',
      textLayoutService: layoutService,
    });

    let state = EditorState.create({
      schema: screenplaySchema,
      doc,
      plugins: [plugin],
    });

    let view = new EditorView(container, {
      state,
      dispatchTransaction(tr) {
        state = state.apply(tr);
        view.updateState(state);
      },
    });

    // Find middle block pos
    const midBlockIdx = Math.floor(draft.blocks.length / 2);
    let midPos = 1;
    let bIdx = 0;
    doc.descendants((node, pos) => {
      if (node.type.name === 'screenplay_block') {
        if (bIdx === midBlockIdx) {
          midPos = pos + 1; // inside block text
          return false;
        }
        bIdx++;
      }
      return true;
    });

    // Find page boundary pos
    const pluginState = unifiedPaginationPluginKey.getState(view.state);
    const boundaryTarget = pluginState?.targets?.[0];
    const boundaryPos = boundaryTarget ? boundaryTarget.pmPos : midPos;

    // A. Typing in middle block
    const midTypingTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const t0 = performance.now();
      view.dispatch(view.state.tr.insertText('ਕ', midPos + k));
      midTypingTimes.push(performance.now() - t0);
    }

    // B. Typing at page boundary
    const boundaryTypingTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const t0 = performance.now();
      view.dispatch(view.state.tr.insertText('ਕ', boundaryPos + k));
      boundaryTypingTimes.push(performance.now() - t0);
    }

    // C. Deleting (backspace)
    const deleteTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const curPos = boundaryPos + RUNS - k;
      const t0 = performance.now();
      view.dispatch(view.state.tr.delete(curPos - 1, curPos));
      deleteTimes.push(performance.now() - t0);
    }

    view.destroy();
    container.remove();

    return {
      typingMiddle: { p50: percentile(midTypingTimes, 50), p95: percentile(midTypingTimes, 95) },
      typingBoundary: { p50: percentile(boundaryTypingTimes, 50), p95: percentile(boundaryTypingTimes, 95) },
      deleting: { p50: percentile(deleteTimes, 50), p95: percentile(deleteTimes, 95) },
    };
  };

  const keystroke5 = runKeystrokeLatency(draft5);
  const keystroke35 = runKeystrokeLatency(draft35);
  const keystroke117 = runKeystrokeLatency(draft117);

  // 5. Time-to-First-Keystroke on 117-page Script (Synchronous vs Deferred)
  const measureTimeToFirstKeystroke = (deferred: boolean) => {
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const docNodes: PMNode[] = draft117.blocks.map((b) =>
        screenplaySchema.node(
          'screenplay_block',
          { id: b.id, type: b.type },
          b.text ? [screenplaySchema.text(b.text)] : []
        )
      );
      const doc = screenplaySchema.node('doc', null, docNodes);

      const t0 = performance.now();

      const plugin = createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'none',
        textLayoutService: layoutService,
        deferInitialPagination: deferred,
      });

      let state = EditorState.create({
        schema: screenplaySchema,
        doc,
        plugins: [plugin],
      });

      let view = new EditorView(container, {
        state,
        dispatchTransaction(tr) {
          state = state.apply(tr);
          view.updateState(state);
        },
      });

      // User presses first key immediately
      view.dispatch(view.state.tr.insertText('ਕ', 1));
      const firstKeystrokeMs = performance.now() - t0;
      times.push(firstKeystrokeMs);

      view.destroy();
      container.remove();
    }
    return { p50: percentile(times, 50), p95: percentile(times, 95) };
  };

  const ttfkSync = measureTimeToFirstKeystroke(false);
  const ttfkDeferred = measureTimeToFirstKeystroke(true);

  // 6. Real Chromium Test: Bold Gurmukhi Word Changes Line Breaks (Editor DOM, Engine, PDF Parity)
  const measureBoldGurmukhiLineBreakParity = async () => {
    const sampleText = 'ਇਹ ਇੱਕ ਲੰਮੀ ਪੰਜਾਬੀ ਸਕ੍ਰਿਪਟ ਡਾਇਲਾਗ ਲਾਈਨ ਹੈ ਜਿਸ ਨਾਲ ਟੈਸਟ ਹੋਵੇਗਾ।';
    const boldWord = 'ਸਕ੍ਰਿਪਟ';
    const start = sampleText.indexOf(boldWord);
    const end = start + boldWord.length;

    // A. Editor DOM Measurement (real Chromium Range.getClientRects() on dialogue element)
    const testDiv = document.createElement('div');
    testDiv.style.width = '336px'; // 252pt = 3.5in printable dialogue width
    testDiv.style.fontFamily = 'Courier Prime, Noto Sans Gurmukhi, monospace';
    testDiv.style.fontSize = '16px';
    testDiv.style.lineHeight = '20px';
    testDiv.style.whiteSpace = 'pre-wrap';
    testDiv.style.wordWrap = 'break-word';

    const getDomLines = (innerHtml: string): string[] => {
      testDiv.innerHTML = innerHtml;
      document.body.appendChild(testDiv);
      const r = document.createRange();
      const walker = document.createTreeWalker(testDiv, NodeFilter.SHOW_TEXT);
      let n;
      let lastTop: number | null = null;
      let currentLine = '';
      const lines: string[] = [];
      while ((n = walker.nextNode())) {
        for (let i = 0; i < n.nodeValue!.length; i++) {
          r.setStart(n, i);
          r.setEnd(n, i + 1);
          const crs = r.getClientRects();
          if (crs.length > 0) {
            const top = crs[0].top;
            if (lastTop === null) {
              lastTop = top;
              currentLine += n.nodeValue![i];
            } else if (Math.abs(top - lastTop) > 4) {
              lines.push(currentLine);
              currentLine = n.nodeValue![i];
              lastTop = top;
            } else {
              currentLine += n.nodeValue![i];
            }
          }
        }
      }
      if (currentLine) lines.push(currentLine);
      document.body.removeChild(testDiv);
      return lines;
    };

    const plainHtml = sampleText;
    const boldHtml = `${sampleText.slice(0, start)}<strong>${boldWord}</strong>${sampleText.slice(end)}`;

    const domPlainLines = getDomLines(plainHtml);
    const domBoldLines = getDomLines(boldHtml);

    // B. Engine Pagination Measurement
    const markRuns = [{ start, end, bold: true, italic: false }];
    const marksHash = computeMarksHash(markRuns);
    const engine = createPaginationEngine();

    const plainEngineRes = engine.paginate(
      [{ id: 'd-plain', type: 'dialogue', text: sampleText }],
      { textLayoutService: layoutService, paperSize: 'letter' }
    );
    const boldEngineRes = engine.paginate(
      [{ id: 'd-bold', type: 'dialogue', text: sampleText, markRuns, marksHash }],
      { textLayoutService: layoutService, paperSize: 'letter' }
    );

    const enginePlainLines = plainEngineRes.pages[0].slots.filter((s) => s.kind === 'text').map((s) => s.line?.text.trim() ?? '');
    const engineBoldLines = boldEngineRes.pages[0].slots.filter((s) => s.kind === 'text').map((s) => s.line?.text.trim() ?? '');

    // C. PDF Export Measurement
    const boldDraft: ScriptDraft = {
      id: 'bold-test-draft',
      name: 'Bold Test',
      isMain: true,
      createdAt: '2026-11-06T00:00:00.000Z',
      modifiedAt: '2026-11-06T00:00:00.000Z',
      blocks: [
        { id: 'b-cue', type: 'character', text: 'ਮਨਪਰੀਤ' },
        { id: 'b-dial', type: 'dialogue', text: sampleText, formats: [{ type: 'bold', from: start, to: end }] },
      ],
    };

    const pdfHtml = generateScreenplayHtml(boldDraft, {}, {
      paperSize: 'letter',
      includeTitlePage: false,
      useUnifiedPagination: true,
      paginationResult: boldEngineRes,
    });

    const pdfMatches = Array.from(pdfHtml.matchAll(/<div class="screenplay-line">(.*?)<\/div>/g)).map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );

    return {
      sampleText,
      boldWord,
      domPlainLines: domPlainLines.map((s) => s.trim()),
      domBoldLines: domBoldLines.map((s) => s.trim()),
      enginePlainLines,
      engineBoldLines,
      pdfBoldLines: pdfMatches,
      lineBreakChangedByBold: domPlainLines[0] !== domBoldLines[0],
      domEngineParity: JSON.stringify(domBoldLines.map((s) => s.trim())) === JSON.stringify(engineBoldLines),
      enginePdfParity: JSON.stringify(engineBoldLines) === JSON.stringify(pdfMatches),
    };
  };

  const boldGurmukhiTest = await measureBoldGurmukhiLineBreakParity();

  return {
    runs: RUNS,
    cold: { p5: cold5, p35: cold35, p117: cold117 },
    paste: { p5: paste5, p35: paste35, p117: paste117 },
    remeasure: { p5: remeasure5, p35: remeasure35, p117: remeasure117 },
    keystroke: { p5: keystroke5, p35: keystroke35, p117: keystroke117 },
    ttfk: { sync: ttfkSync, deferred: ttfkDeferred },
    boldGurmukhiTest,
  };
}
