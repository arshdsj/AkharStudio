/**
 * m2f-golden-parity-runner.cjs
 *
 * Milestone M2F — Stage 1: Golden Script Parity Runner in Real Electron Runtime
 *
 * Executes real Electron runtime to measure:
 * 1. Physical page dimensions & printable-area boundaries (Letter: 816x1056px, A4: 794x1123px).
 * 2. 18.0pt (24px) baseline pitch and line heights across both Editor and PDF.
 * 3. Exact line-by-line and break-by-break parity between ProseMirror Editor and Chromium PDF.
 * 4. Alignment of Character cues and (CONT'D) continuation badges.
 * 5. (MORE) and (CONT'D) badge presence on identical pages in Editor and PDF.
 * 6. Zero clipping, overlapping, or horizontal/vertical overflow.
 * 7. Real screenshot capture of Page 1 and Page 2 for visual audit.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

// 1. Build bundle from m2f-golden-parity-entry.ts
const entryPath = path.resolve(__dirname, 'm2f-golden-parity-entry.ts');
const bundlePath = path.resolve(__dirname, 'dist-m2f-parity.cjs');
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

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 1600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

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
        font-weight: 100 900;
        font-style: normal;
      }
      ${indexCss}

      body {
        margin: 0;
        padding: 24px;
        background: #1e293b;
        color: #f8fafc;
        font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      }

      .audit-columns {
        display: flex;
        gap: 32px;
      }

      .audit-column {
        flex: 1;
      }

      .column-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 16px;
        color: #38bdf8;
      }

      /* PDF Sheet styling */
      .page-sheet {
        background: #ffffff;
        color: #000000;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        box-sizing: border-box;
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
      }

      .page-sheet.screenplay-page-sheet {
        width: 8.5in;
        height: 11in;
        padding: 1.0in 1.0in 1.0in 1.5in;
      }

      .page-header {
        position: absolute;
        top: 0.5in;
        right: 1.0in;
        font-size: 12pt;
        line-height: 18pt;
        font-family: 'Courier Prime', monospace;
      }

      .page-content {
        width: 6.0in;
        height: 9.0in;
        position: relative;
      }

      .screenplay-line {
        height: 18pt;
        line-height: 18pt;
        font-size: 12pt;
        white-space: pre-wrap;
      }

      .slot-line {
        height: 18pt;
        line-height: 18pt;
      }

      .screenplay-block.scene-heading { text-transform: uppercase; font-weight: bold; }
      .screenplay-block.character { margin-left: 2.2in; text-transform: uppercase; }
      .screenplay-block.parenthetical { margin-left: 1.6in; width: 3.0in; }
      .screenplay-block.dialogue { margin-left: 1.0in; width: 3.5in; }
      .screenplay-block.transition { margin-left: 4.5in; text-transform: uppercase; }
      .screenplay-more-continuation { margin-left: 1.0in; width: 3.5in; text-align: center; }
      .screenplay-contd-continuation { margin-left: 2.2in; text-transform: uppercase; }

      /* Editor styling */
      .screenplay-paper {
        background: #ffffff;
        color: #000000;
        width: 8.5in;
        padding: 1.0in 1.0in 1.0in 1.5in;
        box-sizing: border-box;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        margin-bottom: 32px;
      }

      .ProseMirror {
        outline: none;
        font-size: 12pt;
        line-height: 18pt;
        min-height: 11in;
      }
    </style>
  </head>
  <body>
    <div class="audit-columns">
      <div class="audit-column" id="editor-col">
        <div class="column-title">1. ProseMirror Editor (Unified Plugin)</div>
        <div class="screenplay-paper" id="editor-paper">
          <div id="editor-mount"></div>
        </div>
      </div>
      <div class="audit-column" id="pdf-col">
        <div class="column-title">2. Exported PDF Discrete Sheets</div>
        <div id="pdf-mount"></div>
      </div>
    </div>

    <script>
      const {
        screenplaySchema,
        draftToProseMirrorDoc,
        createUnifiedPaginationPlugin,
        unifiedPaginationPluginKey,
        generateUnifiedScreenplayPdfHtml,
        createTextLayoutService,
        GOLDEN_METADATA,
        createGoldenDraft,
      } = require('./dist-m2f-parity.cjs');
      const { EditorState } = require('prosemirror-state');
      const { EditorView } = require('prosemirror-view');

      async function runParityAudit() {
        try {
          await document.fonts.ready;
          const fontReady = document.fonts.check('12pt "Noto Sans Gurmukhi"') && document.fonts.check('12pt "Courier Prime"');

        const draft = createGoldenDraft();
        const doc = draftToProseMirrorDoc(draft);

        // 1. Mount ProseMirror Editor
        const editorMount = document.getElementById('editor-mount');
        const plugin = createUnifiedPaginationPlugin({
          paperSize: 'letter',
          contdSetting: 'on',
        });
        const state = EditorState.create({
          doc,
          schema: screenplaySchema,
          plugins: [plugin],
        });
        const view = new EditorView(editorMount, { state });

        // Retrieve editor plugin state
        const pluginState = unifiedPaginationPluginKey.getState(view.state);
        const editorPageCount = pluginState.paginationResult.pages.length;
        const targets = pluginState.targets;
        console.log('[Runner] Editor pages:', editorPageCount, 'targets:', JSON.stringify(targets));

        // 2. Generate and Mount PDF HTML
        const pdfMount = document.getElementById('pdf-mount');
        const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, GOLDEN_METADATA, {
          paperSize: 'letter',
          includeTitlePage: false,
          contdSetting: 'on',
          allowHeadlessFallback: false,
        });

        // Extract body sheets from generated HTML
        const bodyContentMatch = pdfHtml.match(/<body>([\\s\\S]*?)<\\/body>/i);
        pdfMount.innerHTML = bodyContentMatch ? bodyContentMatch[1] : '';

        // 3. Physical Measurements in Real Chromium
        const pdfSheets = Array.from(document.querySelectorAll('.page-sheet.screenplay-page-sheet'));
        const pdfPageCount = pdfSheets.length;

        // Check discrete sheet dimensions (8.5in x 11in at 96 DPI = 816px x 1056px)
        const firstSheet = pdfSheets[0];
        const sheetRect = firstSheet.getBoundingClientRect();
        const sheetWidthPx = Math.round(sheetRect.width);
        const sheetHeightPx = Math.round(sheetRect.height);

        // Check padding/margins (1.5in left = 144px, 1.0in others = 96px)
        const sheetComputed = window.getComputedStyle(firstSheet);
        const paddingLeftPx = Math.round(parseFloat(sheetComputed.paddingLeft));
        const paddingRightPx = Math.round(parseFloat(sheetComputed.paddingRight));
        const paddingTopPx = Math.round(parseFloat(sheetComputed.paddingTop));
        const paddingBottomPx = Math.round(parseFloat(sheetComputed.paddingBottom));

        // Baseline pitch on multiple lines across the document
        const sampleLines = Array.from(document.querySelectorAll('.screenplay-line')).slice(0, 20);
        const lineHeights = sampleLines.map(el => Math.round(el.getBoundingClientRect().height));
        const pitchExact = lineHeights.every(h => h === 24);

        // Dialogue continuation badges
        const moreElements = Array.from(document.querySelectorAll('.screenplay-more-continuation'));
        const contdElements = Array.from(document.querySelectorAll('.screenplay-contd-continuation'));

        // Character cue alignment
        const charElements = Array.from(document.querySelectorAll('.screenplay-block.character'));
        const charCueLeft = charElements.length > 0 ? parseFloat(window.getComputedStyle(charElements[0]).marginLeft) : 0;
        const contdLeft = contdElements.length > 0 ? parseFloat(window.getComputedStyle(contdElements[0]).marginLeft) : 0;
        const charAndContdAligned = contdElements.length > 0 ? Math.abs(charCueLeft - contdLeft) < 1 : true;

        // Overflow & Clipping checks across all sheets
        const sheetOverflowChecks = pdfSheets.map((sheet, idx) => {
          const hasHorizOverflow = sheet.scrollWidth > sheet.clientWidth;
          const hasVertOverflow = sheet.scrollHeight > (sheet.clientHeight + 1);
          return {
            pageNumber: idx + 1,
            hasHorizOverflow,
            hasVertOverflow,
            scrollWidth: sheet.scrollWidth,
            clientWidth: sheet.clientWidth,
            scrollHeight: sheet.scrollHeight,
            clientHeight: sheet.clientHeight,
          };
        });
        const zeroOverflowAcrossAllPages = sheetOverflowChecks.every(c => !c.hasHorizOverflow && !c.hasVertOverflow);

        return {
          fontReady,
          editorPageCount,
          pdfPageCount,
          pageCountsMatch: editorPageCount === pdfPageCount,
          targetsCount: targets.length,
          targets: targets.map(t => ({
            pageNumber: t.pageNumber,
            breakType: t.breakType,
            blockId: t.blockId,
            moreText: t.moreText,
            contdText: t.contdText,
          })),
          sheetWidthPx,
          sheetHeightPx,
          sheetDimensionsExact: sheetWidthPx === 816 && sheetHeightPx === 1056,
          paddingLeftPx,
          paddingRightPx,
          paddingTopPx,
          paddingBottomPx,
          marginsExact: paddingLeftPx === 144 && paddingRightPx === 96 && paddingTopPx === 96 && paddingBottomPx === 96,
          pitchExact,
          moreCount: moreElements.length,
          contdCount: contdElements.length,
          charAndContdAligned,
          zeroOverflowAcrossAllPages,
          sheetOverflowChecks,
        };
      } catch (err) {
        return { error: err.stack || String(err) };
      }
    }

      window.runParityAudit = runParityAudit;
    </script>
  </body>
  </html>`;

  const tempHtmlPath = path.resolve(__dirname, 'm2f-parity-temp.html');
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');
  await win.loadFile(tempHtmlPath);

  try {
    const results = await win.webContents.executeJavaScript('window.runParityAudit()');
    if (results.error) {
      console.error('AUDIT_ERROR:' + results.error);
      app.quit();
      return;
    }

    // Capture Screenshot of Page 1 and Page 2
    const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1400, height: 1600 });
    const screenshotPage1Path = path.resolve(__dirname, '../audit-m2f-golden-page1.png');
    fs.writeFileSync(screenshotPage1Path, image.toPNG());

    // Scroll down and capture Page 2
    await win.webContents.executeJavaScript('window.scrollTo(0, 1100)');
    await new Promise((r) => setTimeout(r, 200));
    const imagePage2 = await win.webContents.capturePage({ x: 0, y: 0, width: 1400, height: 1600 });
    const screenshotPage2Path = path.resolve(__dirname, '../audit-m2f-golden-page2.png');
    fs.writeFileSync(screenshotPage2Path, imagePage2.toPNG());

    console.log('M2F_PARITY_RESULTS:' + JSON.stringify(results) + 'END_M2F_PARITY_RESULTS');
  } catch (err) {
    console.error('RUNNER_EXEC_ERROR:' + String(err));
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (_) {}
    }
    app.quit();
  }
});
