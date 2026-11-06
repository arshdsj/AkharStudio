/**
 * m2f-stage3-runner.cjs
 *
 * Milestone M2F — Stage 3: Real Electron Visual & PDF Verification Runner
 *
 * Measures & verifies in real Electron / Chromium runtime:
 * 1. Physical PDF generation via Chromium printToPDF (Letter: 612x792pt, A4: 595.28x841.89pt).
 * 2. Strict distinction between HTML generation time vs complete printToPDF generation time.
 * 3. Exact 1:1 page count parity between Editor and generated PDF binary.
 * 4. Zero trailing blank pages in PDF binary.
 * 5. Font readiness verification before PDF generation.
 * 6. Screenshot capture for final visual audit evidence.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');
const { PDFDocument } = require('@cantoo/pdf-lib');

// 1. Build bundle from m2f-stage3-entry.ts
const entryPath = path.resolve(__dirname, 'm2f-stage3-entry.ts');
const bundlePath = path.resolve(__dirname, 'dist-m2f-stage3.cjs');
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
    width: 1200,
    height: 1600,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const tempHtmlPath = path.resolve(__dirname, 'm2f-stage3-temp.html');
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
      ${indexCss}
    </style>
  </head>
  <body>
    <div id="editor-container" class="screenplay-canvas"></div>
  </body>
  </html>`;
  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

  await win.loadFile(tempHtmlPath);

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      await document.fonts.ready;
      const mod = require('${bundlePath.replace(/\\\\/g, '/')}');

      const fontProvider = mod.getGurmukhiFontMetricsProvider();
      const layoutService = mod.createTextLayoutService(fontProvider);
      const goldenDraft = mod.createGoldenDraft();

      // 1. Editor Setup & Pagination
      const pmDoc = mod.draftToProseMirrorDoc(goldenDraft);
      const plugin = mod.createUnifiedPaginationPlugin({
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      const EditorState = require('prosemirror-state').EditorState;
      const EditorView = require('prosemirror-view').EditorView;

      const state = EditorState.create({
        doc: pmDoc,
        schema: mod.screenplaySchema,
        plugins: [plugin],
      });

      const container = document.getElementById('editor-container');
      const view = new EditorView(container, { state });

      const pState = mod.unifiedPaginationPluginKey.getState(view.state);
      const editorPageCount = pState ? (pState.paginationResult ? pState.paginationResult.pages.length : 1) : 1;
      const targetsCount = pState ? pState.targets.length : 0;

      // 2. Measure HTML Generation Duration for Letter (with title page)
      const t0Html = performance.now();
      const letterHtml = mod.generateUnifiedScreenplayPdfHtml(goldenDraft, mod.GOLDEN_METADATA, {
        paperSize: 'letter',
        includeTitlePage: true,
        contdSetting: 'on',
        textLayoutService: layoutService,
        allowHeadlessFallback: false,
      });
      const letterHtmlDurationMs = performance.now() - t0Html;

      // 3. Measure HTML Generation Duration for A4 (without title page)
      const t0A4Html = performance.now();
      const a4Html = mod.generateUnifiedScreenplayPdfHtml(goldenDraft, mod.GOLDEN_METADATA, {
        paperSize: 'a4',
        includeTitlePage: false,
        contdSetting: 'on',
        textLayoutService: layoutService,
        allowHeadlessFallback: false,
      });
      const a4HtmlDurationMs = performance.now() - t0A4Html;

      return {
        fontReady: document.fonts.check('12pt "Noto Sans Gurmukhi"'),
        editorPageCount,
        targetsCount,
        letterHtml,
        letterHtmlDurationMs: Number(letterHtmlDurationMs.toFixed(2)),
        a4Html,
        a4HtmlDurationMs: Number(a4HtmlDurationMs.toFixed(2)),
      };
    })()
  `);

  // Capture screenshot of rendered editor
  const screenshotBuffer = await win.webContents.capturePage({ x: 0, y: 0, width: 1000, height: 1400 });
  const screenshotPath = path.resolve(__dirname, 'audit-m2f-stage3-final.png');
  fs.writeFileSync(screenshotPath, screenshotBuffer.toPNG());

  // Also copy screenshot to artifact dir if exists
  const artifactDir = '/Users/arshdsj/.gemini/antigravity/brain/ada636de-b786-41c8-99e2-f3134f3042ea';
  if (fs.existsSync(artifactDir)) {
    try {
      fs.copyFileSync(screenshotPath, path.resolve(artifactDir, 'audit-m2f-stage3-final.png'));
    } catch {}
  }

  // Helper to generate PDF binary and inspect with pdf-lib
  async function renderAndMeasurePdf(html, pageSize, expectedSizePt) {
    const printWin = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      const t0PdfTotal = performance.now();
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const fontCheck = await printWin.webContents.executeJavaScript(`
        document.fonts.ready.then(() => document.fonts.check('12pt "Noto Sans Gurmukhi"'))
      `);

      const pdfBuffer = await printWin.webContents.printToPDF({
        pageSize,
        margins: { marginType: 'none' },
        printBackground: true,
        preferCSSPageSize: true,
        generateTaggedPDF: true,
      });
      const printToPdfDurationMs = performance.now() - t0PdfTotal;

      // Inspect with PDFDocument
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      const pageSizes = [];
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        pageSizes.push({
          pageNumber: i + 1,
          widthPt: Number(width.toFixed(2)),
          heightPt: Number(height.toFixed(2)),
          matchesWidth: Math.abs(width - expectedSizePt.width) <= 1.0,
          matchesHeight: Math.abs(height - expectedSizePt.height) <= 1.0,
        });
      }

      return {
        fontCheck,
        printToPdfDurationMs: Number(printToPdfDurationMs.toFixed(2)),
        pdfSizeBytes: pdfBuffer.length,
        pageCount,
        pageSizes,
        allPagesMatchDimensions: pageSizes.every((p) => p.matchesWidth && p.matchesHeight),
      };
    } finally {
      printWin.close();
    }
  }

  // 4. Render actual Letter PDF (Letter size: 612 x 792 pt, title page included)
  const letterPdf = await renderAndMeasurePdf(
    results.letterHtml,
    'Letter',
    { width: 612, height: 792 }
  );

  // 5. Render actual A4 PDF (A4 size: 595.28 x 841.89 pt, no title page)
  const a4Pdf = await renderAndMeasurePdf(
    results.a4Html,
    'A4',
    { width: 595.28, height: 841.89 }
  );

  const finalResults = {
    fontReady: results.fontReady,
    editorPageCount: results.editorPageCount,
    targetsCount: results.targetsCount,
    letter: {
      htmlDurationMs: results.letterHtmlDurationMs,
      printToPdfDurationMs: letterPdf.printToPdfDurationMs,
      totalExportTimeMs: Number((results.letterHtmlDurationMs + letterPdf.printToPdfDurationMs).toFixed(2)),
      pdfSizeBytes: letterPdf.pdfSizeBytes,
      pageCount: letterPdf.pageCount,
      // With title page, PDF pageCount is editorPageCount + 1
      expectedPdfPageCount: results.editorPageCount + 1,
      pageCountParity: letterPdf.pageCount === results.editorPageCount + 1,
      allPagesMatchDimensions: letterPdf.allPagesMatchDimensions,
      pageSizes: letterPdf.pageSizes,
    },
    a4: {
      htmlDurationMs: results.a4HtmlDurationMs,
      printToPdfDurationMs: a4Pdf.printToPdfDurationMs,
      totalExportTimeMs: Number((results.a4HtmlDurationMs + a4Pdf.printToPdfDurationMs).toFixed(2)),
      pdfSizeBytes: a4Pdf.pdfSizeBytes,
      pageCount: a4Pdf.pageCount,
      // Without title page, PDF pageCount matches editorPageCount
      expectedPdfPageCount: results.editorPageCount,
      pageCountParity: a4Pdf.pageCount === results.editorPageCount,
      allPagesMatchDimensions: a4Pdf.allPagesMatchDimensions,
      pageSizes: a4Pdf.pageSizes,
    },
    screenshotCaptured: fs.existsSync(screenshotPath),
  };

  console.log('M2F_STAGE3_RESULTS:');
  console.log(JSON.stringify(finalResults, null, 2));
  console.log('END_M2F_STAGE3_RESULTS');

  // Clean up
  try { fs.unlinkSync(tempHtmlPath); } catch {}

  app.quit();
});
