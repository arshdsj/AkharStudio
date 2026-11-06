/**
 * m2f-benchmark-runner.cjs
 *
 * Milestone M2F — Stage 2: Performance Benchmark Runner in Real Electron Runtime
 *
 * Measures pagination and editing performance in actual Chromium with real Canvas font metrics:
 * 1. Cold initial pagination (Letter & A4, Short/Medium/Long).
 * 2. Incremental keystroke latency (Beginning, Middle, End; median/p95/max).
 * 3. Page-boundary reflow operations (boundary edit, 15-line paste, multi-line delete).
 * 4. Mode-switching latency (Legacy <-> Unified via state.reconfigure()).
 * 5. PDF HTML export generation duration (Letter & A4).
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

// 1. Build bundle from m2f-benchmark-entry.ts
const entryPath = path.resolve(__dirname, 'm2f-benchmark-entry.ts');
const bundlePath = path.resolve(__dirname, 'dist-m2f-benchmark.cjs');
esbuild.buildSync({
  entryPoints: [entryPath],
  bundle: true,
  format: 'cjs',
  outfile: bundlePath,
  platform: 'node',
  external: [
    'electron',
    'prosemirror-state',
    'prosemirror-view',
    'prosemirror-model',
    'prosemirror-history',
    '@cantoo/pdf-lib',
  ],
});

const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
const gurmukhiFontBase64 = fs.existsSync(fontPath) ? fs.readFileSync(fontPath).toString('base64') : '';
const courierPath = path.resolve(process.cwd(), 'public/fonts/CourierPrime.ttf');
const courierFontBase64 = fs.existsSync(courierPath) ? fs.readFileSync(courierPath).toString('base64') : '';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const tempHtmlPath = path.resolve(__dirname, 'm2f-benchmark-temp.html');
  const htmlContent = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      @font-face {
        font-family: 'Courier Prime';
        src: url(data:font/truetype;charset=utf-8;base64,${courierFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${gurmukhiFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
  </html>`;
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  await win.loadFile(tempHtmlPath);

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      await document.fonts.ready;
      const bench = require('${bundlePath.replace(/\\\\/g, '/')}');

      const fontProvider = bench.getGurmukhiFontMetricsProvider();
      const layoutService = bench.createTextLayoutService(fontProvider);
      const engine = bench.createPaginationEngine();

      const shortDraft = bench.createGoldenDraft(); // ~5 pages
      const medDraft = bench.createScaledDraft(30);   // ~35 pages
      const longDraft = bench.createScaledDraft(100);  // ~117 pages

      const stats = {};

      // -----------------------------------------------------------------------
      // 1. Initial Cold Pagination Latency (Letter and A4)
      // -----------------------------------------------------------------------
      stats.initialColdPagination = {};
      for (const paper of ['letter', 'a4']) {
        stats.initialColdPagination[paper] = {};
        for (const [key, draft] of [['short', shortDraft], ['medium', medDraft], ['long', longDraft]]) {
          const layoutBlocks = bench.draftToLayoutBlocks(draft);
          const t0 = performance.now();
          const res = engine.paginate(layoutBlocks, {
            paperSize: paper,
            contdSetting: 'on',
            textLayoutService: layoutService,
          });
          const elapsed = performance.now() - t0;
          stats.initialColdPagination[paper][key] = {
            durationMs: Number(elapsed.toFixed(2)),
            pageCount: res.pages.length,
            blockCount: layoutBlocks.length,
          };
        }
      }

      // -----------------------------------------------------------------------
      // 2. Incremental Editing Keystroke Latency
      // -----------------------------------------------------------------------
      stats.incrementalKeystroke = {};
      const workloads = [
        ['short', shortDraft],
        ['medium', medDraft],
        ['long', longDraft],
      ];

      for (const [key, draft] of workloads) {
        const doc = bench.draftToProseMirrorDoc(draft);
        const plugin = bench.createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService,
        });
        let state = bench.EditorState.create({
          doc,
          schema: bench.screenplaySchema,
          plugins: [plugin],
        });

        const docSize = state.doc.content.size;
        const positions = [
          ['beginning', 10],
          ['middle', Math.floor(docSize / 2)],
          ['end', docSize - 5],
        ];

        stats.incrementalKeystroke[key] = {};

        for (const [posLabel, pos] of positions) {
          const latencies = [];
          for (let i = 0; i < 20; i++) {
            const char = i % 2 === 0 ? 'ਸ' : 'k';
            const t0 = performance.now();
            const tr = state.tr.insertText(char, pos);
            state = state.apply(tr);
            plugin.props.decorations(state);
            latencies.push(performance.now() - t0);
          }
          latencies.sort((a, b) => a - b);
          const median = latencies[Math.floor(latencies.length / 2)];
          const p95 = latencies[Math.floor(latencies.length * 0.95)];
          const min = latencies[0];
          const max = latencies[latencies.length - 1];

          stats.incrementalKeystroke[key][posLabel] = {
            medianMs: Number(median.toFixed(2)),
            p95Ms: Number(p95.toFixed(2)),
            minMs: Number(min.toFixed(2)),
            maxMs: Number(max.toFixed(2)),
          };
        }
      }

      // -----------------------------------------------------------------------
      // 3. Page-Boundary Reflow Operations (117-Page Feature Script)
      // -----------------------------------------------------------------------
      const longDoc = bench.draftToProseMirrorDoc(longDraft);
      const boundaryPlugin = bench.createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });
      let boundaryState = bench.EditorState.create({
        doc: longDoc,
        schema: bench.screenplaySchema,
        plugins: [boundaryPlugin],
      });

      const pState = bench.unifiedPaginationPluginKey.getState(boundaryState);
      const breakPos = pState && pState.targets.length > 0 ? pState.targets[0].pmPos : 50;

      // 3a. Single boundary keystroke
      const t0Boundary = performance.now();
      boundaryState = boundaryState.apply(boundaryState.tr.insertText('ਕ', breakPos));
      boundaryPlugin.props.decorations(boundaryState);
      const boundaryKeystrokeMs = performance.now() - t0Boundary;

      // 3b. 15-line monologue paste (500 chars)
      const monologue = 'ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ। '.repeat(10);
      const t1Paste = performance.now();
      boundaryState = boundaryState.apply(boundaryState.tr.insertText(monologue, breakPos + 1));
      boundaryPlugin.props.decorations(boundaryState);
      const monologuePasteMs = performance.now() - t1Paste;

      // 3c. Multi-line deletion (500 chars)
      const t2Delete = performance.now();
      boundaryState = boundaryState.apply(boundaryState.tr.delete(breakPos + 1, breakPos + 1 + monologue.length));
      boundaryPlugin.props.decorations(boundaryState);
      const multilineDeleteMs = performance.now() - t2Delete;

      stats.pageBoundaryReflow = {
        singleKeystrokeMs: Number(boundaryKeystrokeMs.toFixed(2)),
        monologuePaste15LinesMs: Number(monologuePasteMs.toFixed(2)),
        multilineDeleteMs: Number(multilineDeleteMs.toFixed(2)),
      };

      // -----------------------------------------------------------------------
      // 4. Mode Switching Latency (state.reconfigure)
      // -----------------------------------------------------------------------
      stats.modeSwitching = {};
      for (const [key, draft] of [['short', shortDraft], ['medium', medDraft], ['long', longDraft]]) {
        const doc = bench.draftToProseMirrorDoc(draft);
        const unified = bench.createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService,
        });
        const legacy = bench.createPaginationPlugin({ paperSize: 'letter' });

        let state = bench.EditorState.create({
          doc,
          schema: bench.screenplaySchema,
          plugins: [legacy],
        });

        // Legacy -> Unified
        const t0Switch = performance.now();
        state = state.reconfigure({ plugins: [unified] });
        unified.props.decorations(state);
        const legToUniMs = performance.now() - t0Switch;

        // Unified -> Legacy
        const t1Switch = performance.now();
        state = state.reconfigure({ plugins: [legacy] });
        legacy.props.decorations(state);
        const uniToLegMs = performance.now() - t1Switch;

        stats.modeSwitching[key] = {
          legacyToUnifiedMs: Number(legToUniMs.toFixed(2)),
          unifiedToLegacyMs: Number(uniToLegMs.toFixed(2)),
        };
      }

      // -----------------------------------------------------------------------
      // 5. PDF HTML Export Duration
      // -----------------------------------------------------------------------
      stats.pdfExport = {};
      for (const paper of ['letter', 'a4']) {
        stats.pdfExport[paper] = {};
        for (const [key, draft] of [['short', shortDraft], ['medium', medDraft], ['long', longDraft]]) {
          const t0Pdf = performance.now();
          const html = bench.generateUnifiedScreenplayPdfHtml(draft, bench.GOLDEN_METADATA, {
            paperSize: paper,
            includeTitlePage: false,
            contdSetting: 'on',
            textLayoutService: layoutService,
            allowHeadlessFallback: false,
          });
          const pdfElapsed = performance.now() - t0Pdf;
          stats.pdfExport[paper][key] = {
            durationMs: Number(pdfElapsed.toFixed(2)),
            htmlSizeBytes: html.length,
          };
        }
      }

      return stats;
    })()
  `);

  console.log('M2F_BENCHMARK_RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  console.log('END_M2F_BENCHMARK_RESULTS');

  // Clean up temp file
  try { fs.unlinkSync(tempHtmlPath); } catch {}

  app.quit();
});
