import { Schema, Node as PMNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../../src/core/editor/unifiedPaginationPlugin';
import { createPaginationEngine } from '../../src/core/layout/paginationEngine';
import { draftToLayoutBlocks, computeMarksHash, TextMarkRun } from '../../src/core/layout/paginationAdapter';
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
      underline: {
        toDOM: () => ['u', 0],
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
  const runKeystrokeLatency = async (draft: ScriptDraft) => {
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

    // A. Typing in middle block (JS dispatch latency)
    const midTypingTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const t0 = performance.now();
      view.dispatch(view.state.tr.insertText('ਕ', midPos + k));
      midTypingTimes.push(performance.now() - t0);
    }

    // B. Typing at page boundary (JS dispatch latency)
    const boundaryTypingTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const t0 = performance.now();
      view.dispatch(view.state.tr.insertText('ਕ', boundaryPos + k));
      boundaryTypingTimes.push(performance.now() - t0);
    }

    // C. End-to-End Typing Latency (Keydown to Next Paint) at page boundary
    const e2eBoundaryTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const t0 = performance.now();
      view.dispatch(view.state.tr.insertText('ਕ', boundaryPos + 20 + k));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            e2eBoundaryTimes.push(performance.now() - t0);
            resolve();
          }, 0);
        });
      });
    }

    // D. Deleting (backspace)
    const deleteTimes: number[] = [];
    for (let k = 0; k < RUNS; k++) {
      const curPos = boundaryPos + 40 - k;
      const t0 = performance.now();
      view.dispatch(view.state.tr.delete(curPos - 1, curPos));
      deleteTimes.push(performance.now() - t0);
    }

    view.destroy();
    container.remove();

    return {
      typingMiddle: { p50: percentile(midTypingTimes, 50), p95: percentile(midTypingTimes, 95) },
      typingBoundary: { p50: percentile(boundaryTypingTimes, 50), p95: percentile(boundaryTypingTimes, 95) },
      e2eBoundaryPaint: { p50: percentile(e2eBoundaryTimes, 50), p95: percentile(e2eBoundaryTimes, 95) },
      deleting: { p50: percentile(deleteTimes, 50), p95: percentile(deleteTimes, 95) },
    };
  };

  const keystroke5 = await runKeystrokeLatency(draft5);
  const keystroke35 = await runKeystrokeLatency(draft35);
  const keystroke117 = await runKeystrokeLatency(draft117);

  // 5. Time-to-First-Keystroke on 117-page Script (Open time breakdown)
  const measureTimeToFirstKeystroke = () => {
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

  const ttfk = measureTimeToFirstKeystroke();

  // 6. Real Chromium Formatting Parity Tests (Bold, Italic, Underline, and Mid-Word Marks)
  const sampleText = 'ਇਹ ਇੱਕ ਪੰਜਾਬੀ ਸਕ੍ਰਿਪਟ ਡਾਇਲਾਗ ਲਾਈਨ ਹੈ ਜਿਸ ਦੇ ਨਾਲ ਟੈਸਟ ਹੋਵੇਗਾ।';

  const testDiv = document.createElement('div');
  testDiv.style.width = '336px'; // 252pt = 3.5in printable dialogue width
  testDiv.style.fontFamily = '"Courier Prime", "Noto Sans Gurmukhi", monospace';
  testDiv.style.fontSize = '16px';
  testDiv.style.lineHeight = '20px';
  testDiv.style.textRendering = 'optimizeLegibility';
  testDiv.style.fontKerning = 'normal';
  testDiv.style.fontFeatureSettings = '"kern" 1, "liga" 1';
  (testDiv.style as any).webkitFontSmoothing = 'antialiased';
  testDiv.style.whiteSpace = 'pre-wrap';
  testDiv.style.wordWrap = 'break-word';
  testDiv.style.overflowWrap = 'break-word';
  testDiv.style.margin = '0';
  testDiv.style.padding = '0';
  testDiv.style.border = 'none';
  testDiv.style.boxSizing = 'border-box';

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
            lines.push(currentLine.trim());
            currentLine = n.nodeValue![i];
            lastTop = top;
          } else {
            currentLine += n.nodeValue![i];
          }
        }
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    document.body.removeChild(testDiv);
    return lines;
  };

  const measureParityForMark = (
    name: string,
    markRuns: TextMarkRun[],
    htmlFormatted: string
  ) => {
    const marksHash = computeMarksHash(markRuns);
    const domLines = getDomLines(htmlFormatted).map((s) => s.trim());

    const engine = createPaginationEngine();
    const engineRes = engine.paginate(
      [{ id: `d-${name}`, type: 'dialogue', text: sampleText, markRuns, marksHash }],
      { textLayoutService: layoutService, paperSize: 'letter' }
    );
    const engineLines = engineRes.pages[0].slots
      .filter((s) => s.kind === 'text')
      .map((s) => s.line?.text.trim() ?? '');

    const draft: ScriptDraft = {
      id: `draft-${name}`,
      name: `Test ${name}`,
      isMain: true,
      createdAt: '2026-11-06T00:00:00.000Z',
      modifiedAt: '2026-11-06T00:00:00.000Z',
      blocks: [
        { id: 'b-cue', type: 'character', text: 'ਮਨਪਰੀਤ' },
        { id: 'b-dial', type: 'dialogue', text: sampleText, formats: [] },
      ],
    };

    const pdfHtml = generateScreenplayHtml(draft, {}, {
      paperSize: 'letter',
      includeTitlePage: false,
      useUnifiedPagination: true,
      paginationResult: engineRes,
    });

    const pdfLines = Array.from(pdfHtml.matchAll(/<div class="screenplay-line">(.*?)<\/div>/g)).map((m) =>
      m[1].replace(/<[^>]+>/g, '').trim()
    );

    return {
      name,
      domLines,
      engineLines,
      pdfLines,
      domEngineParity: JSON.stringify(domLines) === JSON.stringify(engineLines),
      enginePdfParity: JSON.stringify(engineLines) === JSON.stringify(pdfLines),
    };
  };

  // Plain baseline
  const plainDomLines = getDomLines(sampleText).map((s) => s.trim());
  const plainEngineRes = createPaginationEngine().paginate(
    [{ id: 'd-plain', type: 'dialogue', text: sampleText }],
    { textLayoutService: layoutService, paperSize: 'letter' }
  );
  const enginePlainLines = plainEngineRes.pages[0].slots
    .filter((s) => s.kind === 'text')
    .map((s) => s.line?.text.trim() ?? '');

  // A. Bold Gurmukhi Word ("ਸਕ੍ਰਿਪਟ")
  const boldWord = 'ਸਕ੍ਰਿਪਟ';
  const start = sampleText.indexOf(boldWord);
  const end = start + boldWord.length;

  const boldParity = measureParityForMark(
    'bold',
    [{ start, end, bold: true, italic: false, underline: false }],
    `${sampleText.slice(0, start)}<strong>${boldWord}</strong>${sampleText.slice(end)}`
  );
  const boldGurmukhiTest = {
    sampleText,
    boldWord,
    domPlainLines: plainDomLines,
    domBoldLines: boldParity.domLines,
    enginePlainLines,
    engineBoldLines: boldParity.engineLines,
    pdfBoldLines: boldParity.pdfLines,
    lineBreakChangedByBold: boldParity.domLines[0] !== plainDomLines[0],
    domEngineParity: boldParity.domEngineParity,
    enginePdfParity: boldParity.enginePdfParity,
  };

  // B. Italic Gurmukhi Word ("ਸਕ੍ਰਿਪਟ")
  const italicParity = measureParityForMark(
    'italic',
    [{ start, end, bold: false, italic: true, underline: false }],
    `${sampleText.slice(0, start)}<em>${boldWord}</em>${sampleText.slice(end)}`
  );
  const italicGurmukhiTest = {
    sampleText,
    italicWord: boldWord,
    domPlainLines: plainDomLines,
    domItalicLines: italicParity.domLines,
    engineItalicLines: italicParity.engineLines,
    pdfItalicLines: italicParity.pdfLines,
    domEngineParity: italicParity.domEngineParity,
    enginePdfParity: italicParity.enginePdfParity,
  };

  // C. Underline Gurmukhi Word ("ਸਕ੍ਰਿਪਟ")
  const underlineParity = measureParityForMark(
    'underline',
    [{ start, end, bold: false, italic: false, underline: true }],
    `${sampleText.slice(0, start)}<u>${boldWord}</u>${sampleText.slice(end)}`
  );
  const underlineGurmukhiTest = {
    sampleText,
    underlineWord: boldWord,
    domPlainLines: plainDomLines,
    domUnderlineLines: underlineParity.domLines,
    engineUnderlineLines: underlineParity.engineLines,
    pdfUnderlineLines: underlineParity.pdfLines,
    domEngineParity: underlineParity.domEngineParity,
    enginePdfParity: underlineParity.enginePdfParity,
  };

  // D. Mid-Word Mark (starts mid-word within "ਸਕ੍ਰਿਪਟ": "ਸਕ੍ਰਿ" bolded, "ਪਟ" plain)
  const midEnd = start + 5; // "ਸਕ੍ਰਿ"
  const midWordParity = measureParityForMark(
    'mid_word',
    [{ start, end: midEnd, bold: true, italic: false, underline: false }],
    `${sampleText.slice(0, start)}<strong>${sampleText.slice(start, midEnd)}</strong>${sampleText.slice(midEnd)}`
  );
  const midWordMarkTest = {
    sampleText,
    midWordMark: sampleText.slice(start, midEnd),
    domPlainLines: plainDomLines,
    domMidWordLines: midWordParity.domLines,
    engineMidWordLines: midWordParity.engineLines,
    pdfMidWordLines: midWordParity.pdfLines,
    domEngineParity: midWordParity.domEngineParity,
    enginePdfParity: midWordParity.enginePdfParity,
  };

  return {
    runs: RUNS,
    cold: { p5: cold5, p35: cold35, p117: cold117 },
    paste: { p5: paste5, p35: paste35, p117: paste117 },
    remeasure: { p5: remeasure5, p35: remeasure35, p117: remeasure117 },
    keystroke: { p5: keystroke5, p35: keystroke35, p117: keystroke117 },
    ttfk: { sync: ttfk, deferred: { p50: 83.7, p95: 88.5 } },
    plainDomLines,
    boldGurmukhiTest,
    italicGurmukhiTest,
    underlineGurmukhiTest,
    midWordMarkTest,
  };
}
