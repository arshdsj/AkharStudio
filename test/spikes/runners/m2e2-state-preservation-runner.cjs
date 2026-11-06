/**
 * m2e2-state-preservation-runner.cjs - Real Electron Workflow & State Preservation Runner
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2E.2
 *
 * Runs in real Electron runtime to verify:
 * 1. Type text in mounted ProseMirror editor.
 * 2. Switch mode: Legacy -> Unified via state.reconfigure.
 * 3. Undo transaction in reconfigured state.
 * 4. Redo transaction in reconfigured state.
 * 5. Type Punjabi text using transliteration.
 * 6. Switch mode: Unified -> Legacy via state.reconfigure.
 * 7. Real PDF export via Chromium printToPDF with embedded fonts.
 * 8. Real PNG visual screenshot capture.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { PDFDocument } = require('@cantoo/pdf-lib');

// 1. Build bundle from m2e2-state-preservation-entry.ts
const entryPath = path.resolve(__dirname, 'm2e2-state-preservation-entry.ts');
const bundlePath = path.resolve(__dirname, 'dist-m2e2-editor.cjs');
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
const indexCssPath = path.resolve(process.cwd(), 'src/renderer/index.css');
const indexCss = fs.existsSync(indexCssPath) ? fs.readFileSync(indexCssPath, 'utf8') : '';

function buildEditorHtml() {
  return `<!DOCTYPE html>
<html lang="pa-Guru">
<head>
  <meta charset="UTF-8">
  <title>M2E.2 State Preservation Audit</title>
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
      font-weight: 100 900;
      font-style: normal;
    }

    ${indexCss}

    body {
      margin: 0;
      padding: 40px;
      background: #09090b;
      color: #000000;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    #editor-container {
      width: 1000px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .screenplay-paper {
      width: 8.5in;
      min-height: 11in;
      background: #ffffff;
      padding: 1.0in 1.0in 1.0in 1.5in;
      box-sizing: border-box;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      position: relative;
    }

    .ProseMirror {
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 12pt;
      line-height: 18pt;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
    }
  </style>
</head>
<body>
  <div id="editor-container">
    <div id="paper-sheet" class="screenplay-paper paper-letter">
      <div id="editor-mount"></div>
    </div>
  </div>

  <script>
    const { EditorState, TextSelection } = require('prosemirror-state');
    const { EditorView } = require('prosemirror-view');
    const { history, undo, redo, closeHistory } = require('prosemirror-history');
    const {
      screenplaySchema,
      draftToProseMirrorDoc,
      proseMirrorDocToDraft,
      createUnifiedPaginationPlugin,
      unifiedPaginationPluginKey,
      createPaginationPlugin,
      paginationPluginKey,
      createTextLayoutService,
      getGurmukhiFontMetricsProvider,
      generateScreenplayHtml,
      defaultTransliterator,
      createTransliterationPlugin,
      transliterationPluginKey,
      commitTransliterationCandidate,
    } = require('${bundlePath.replace(/\\/g, '/')}');

    window.runStatePreservationWorkflow = async function() {
      try {
        await document.fonts.ready;
        const fontReady = document.fonts.check('12pt "Noto Sans Gurmukhi"');

        const metricsProvider = getGurmukhiFontMetricsProvider();
        const layoutService = createTextLayoutService(metricsProvider);

        // Sample screenplay draft
        const actionBlocks = Array.from({ length: 16 }, (_, i) => ({
          id: 'act-' + i,
          type: 'action',
          text: 'ਦ੍ਰਿਸ਼ ਲਾਈਨ ' + (i + 1) + ' ਪਵਿੱਤਰ ਦਰਬਾਰ ਸਾਹਿਬ ਦੇ ਚੌਗਿਰਦੇ ਕ੍ਰਿੱਪਾ ਅਤੇ ਸੰਪੂਰਨ ਸ਼ਾਂਤੀ ਹੈ।'
        }));
        const charBlock = { id: 'char-1', type: 'character', text: 'ਪਵਨ (PAWAN)' };
        const dialBlock = {
          id: 'dial-1',
          type: 'dialogue',
          text: 'ਪਹਿਲਾ ਵਾਕ ਪਹਿਲੇ ਪੰਨੇ ਤੇ ਫਿੱਟ ਆਉਂਦਾ ਹੈ।\\nਦੂਜਾ ਵਾਕ ਵੀ ਪਹਿਲੇ ਪੰਨੇ ਤੇ ਰਹਿੰਦਾ ਹੈ।'
        };

        const initialDraft = {
          id: 'd_m2e2_real',
          name: 'M2E.2 State Preservation Draft',
          isMain: true,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          blocks: [...actionBlocks, charBlock, dialBlock]
        };

        const doc = draftToProseMirrorDoc(initialDraft);
        const historyPlugin = history();
        const translitPlugin = createTransliterationPlugin(
          defaultTransliterator,
          () => {},
          () => 'pa'
        );
        const legacyPlugin = createPaginationPlugin({ paperSize: 'letter' });

        let state = EditorState.create({
          doc,
          schema: screenplaySchema,
          plugins: [historyPlugin, translitPlugin, legacyPlugin]
        });

        const mount = document.getElementById('editor-mount');
        const view = new EditorView(mount, {
          state,
          dispatchTransaction(tr) {
            state = state.apply(tr);
            view.updateState(state);
          }
        });

        const results = {
          fontReady,
          initialMode: 'legacy',
          textInserted: false,
          modeSwitchedToUnified: false,
          undoWorkedInUnified: false,
          redoWorkedInUnified: false,
          punjabiTransliterationCommitted: false,
          modeSwitchedBackToLegacy: false,
          historyPreservedAcrossAllSwitches: false,
          pdfGeneratedSuccessfully: false,
          pdfPageCount: 0,
        };

        // STEP 1: Type text
        const initialText = view.state.doc.textContent;
        const insertPos = 15;
        view.dispatch(view.state.tr.insertText(' [ADDED TEXT STEP 1]', insertPos));
        results.textInserted = view.state.doc.textContent.includes('[ADDED TEXT STEP 1]');

        // STEP 2: Switch modes: Legacy -> Unified via state.reconfigure
        const unifiedPlugin = createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
          textLayoutService: layoutService
        });

        state = view.state.reconfigure({
          plugins: [historyPlugin, translitPlugin, unifiedPlugin]
        });
        view.updateState(state);

        results.modeSwitchedToUnified =
          Boolean(unifiedPaginationPluginKey.getState(view.state)) &&
          paginationPluginKey.getState(view.state) === undefined;

        // STEP 3: Undo in reconfigured Unified mode
        undo(view.state, view.dispatch);
        results.undoWorkedInUnified = !view.state.doc.textContent.includes('[ADDED TEXT STEP 1]');

        // STEP 4: Redo in reconfigured Unified mode
        redo(view.state, view.dispatch);
        results.redoWorkedInUnified = view.state.doc.textContent.includes('[ADDED TEXT STEP 1]');

        // STEP 5: Type Punjabi using transliteration
        const dialPos = view.state.doc.content.size - 2;
        // Activate transliteration composition for 'kisaan'
        view.dispatch(view.state.tr.setMeta(transliterationPluginKey, {
          isActive: true,
          romanBuffer: 'kisaan',
          candidates: ['ਕਿਸਾਨ', 'ਕਿਸਾਨਾਂ', 'ਕਿਸਾਨੀ'],
          selectedIndex: 0,
          anchorPos: dialPos,
        }));
        // Commit candidate 'ਕਿਸਾਨ'
        commitTransliterationCandidate(view, 'ਕਿਸਾਨ', defaultTransliterator);
        results.punjabiTransliterationCommitted = view.state.doc.textContent.includes('ਕਿਸਾਨ');

        // STEP 6: Switch mode again: Unified -> Legacy via state.reconfigure
        const legacyPlugin2 = createPaginationPlugin({ paperSize: 'letter' });
        state = view.state.reconfigure({
          plugins: [historyPlugin, translitPlugin, legacyPlugin2]
        });
        view.updateState(state);

        results.modeSwitchedBackToLegacy =
          Boolean(paginationPluginKey.getState(view.state)) &&
          unifiedPaginationPluginKey.getState(view.state) === undefined;

        // Verify history stacks remain intact: undo Punjabi word, then undo text step 1
        undo(view.state, view.dispatch);
        const undoneTranslit = !view.state.doc.textContent.includes('ਕਿਸਾਨ');
        undo(view.state, view.dispatch);
        const undoneStep1 = !view.state.doc.textContent.includes('[ADDED TEXT STEP 1]');
        results.historyPreservedAcrossAllSwitches = undoneTranslit && undoneStep1;

        // Restore edits via redo for final PDF export
        redo(view.state, view.dispatch);
        redo(view.state, view.dispatch);

        // Export PDF HTML
        const currentDraft = proseMirrorDocToDraft(view.state.doc, initialDraft);
        const exportHtml = generateScreenplayHtml(currentDraft, { title: 'M2E.2 Real Electron' }, {
          paperSize: 'letter',
          includeTitlePage: false,
          useUnifiedPagination: false,
          courierFontBase64: '${courierFontBase64}',
          gurmukhiFontBase64: '${gurmukhiFontBase64}',
        });

        window.__m2e2_export_html = exportHtml;
        return results;
      } catch (e) {
        console.error('INNER_M2E2_ERROR:', e && e.stack ? e.stack : String(e));
        throw e;
      }
    };
  </script>
</body>
</html>`;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 2400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.webContents.on('console-message', (_event, _level, message) => {
    console.log('[RENDERER CONSOLE]', message);
  });

  try {
    const editorHtml = buildEditorHtml();
    const tempHtmlPath = path.resolve(__dirname, 'm2e2-editor-temp.html');
    fs.writeFileSync(tempHtmlPath, editorHtml, 'utf8');

    await win.loadFile(tempHtmlPath);

    const results = await win.webContents.executeJavaScript(`window.runStatePreservationWorkflow()`);

    // Capture visual screenshot of the editor workflow
    const spikesDir = path.resolve(process.cwd(), 'test/spikes');
    if (!fs.existsSync(spikesDir)) {
      fs.mkdirSync(spikesDir, { recursive: true });
    }

    const editorRect = await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
          setTimeout(() => {
            const r = document.getElementById('paper-sheet').getBoundingClientRect();
            resolve({ x: Math.round(r.x), y: Math.max(0, Math.round(r.y)), width: Math.round(r.width), height: 1100 });
          }, 150);
        });
      })
    `);
    const editorImg = await win.webContents.capturePage(editorRect);
    fs.writeFileSync(path.join(spikesDir, 'audit-m2e2-editor-workflow.png'), editorImg.toPNG());

    // Render PDF in a dedicated print window
    const exportHtml = await win.webContents.executeJavaScript(`window.__m2e2_export_html`);
    const printWin = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1400,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const tempPdfHtml = path.resolve(__dirname, 'm2e2-pdf-temp.html');
    fs.writeFileSync(tempPdfHtml, exportHtml, 'utf8');
    await printWin.loadFile(tempPdfHtml);
    await printWin.webContents.executeJavaScript(`document.fonts.ready`);

    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { marginType: 'none' },
    });

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    results.pdfPageCount = pdfDoc.getPageCount();
    results.pdfGeneratedSuccessfully = results.pdfPageCount > 0;

    printWin.destroy();
    win.destroy();

    console.log('M2E2_WORKFLOW_RESULTS:' + JSON.stringify(results) + 'END_M2E2_WORKFLOW_RESULTS');
    app.exit(0);
  } catch (err) {
    console.error('M2E2_WORKFLOW_ERROR:' + String(err) + '\n' + (err.stack || ''));
    win.destroy();
    app.exit(1);
  }
});
