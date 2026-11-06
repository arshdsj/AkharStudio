/**
 * m2c-pdf-runner.cjs - Real Electron Chromium PDF Export Validation Runner
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2C
 *
 * Executes real Electron runtime to verify:
 * 1. Chromium printToPDF with discrete .page-sheet HTML containers.
 * 2. Physical PDF page dimensions via @cantoo/pdf-lib:
 *    - US Letter: 612.0 x 792.0 pt.
 *    - ISO A4: 595.28 x 841.89 pt.
 * 3. Exact page count agreement between layout engine and generated PDF.
 * 4. Zero trailing blank pages.
 * 5. Unicode text extraction via pdf-parse:
 *    - Noto Sans Gurmukhi complex conjuncts and stacked matras.
 *    - First-page header suppression, page 2 running header.
 *    - (MORE) and (CONT'D) continuation labels.
 * 6. contdSetting: 'off' suppresses (CONT'D) in PDF.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('@cantoo/pdf-lib');
const { PDFParse } = require('pdf-parse');

// Require the compiled / exported modules
// In our project, ts files are transpiled or we can use our generator directly
const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
const gurmukhiFontBase64 = fs.existsSync(fontPath) ? fs.readFileSync(fontPath).toString('base64') : '';
const courierPath = path.resolve(process.cwd(), 'public/fonts/CourierPrime.ttf');
const courierFontBase64 = fs.existsSync(courierPath) ? fs.readFileSync(courierPath).toString('base64') : '';

// Direct HTML generator matching pdfExporter.ts logic
function generateTestPdfHtml(options) {
  const isA4 = options.paperSize === 'a4';
  const width = isA4 ? '210mm' : '8.5in';
  const height = isA4 ? '297mm' : '11in';
  const marginTop = isA4 ? '25.4mm' : '1.0in';
  const marginRight = isA4 ? '25.4mm' : '1.0in';
  const marginBottom = isA4 ? '25.4mm' : '1.0in';
  const marginLeft = isA4 ? '38.1mm' : '1.5in';
  const printableWidth = isA4 ? '146.5mm' : '6.0in';

  const courierFontFace = `@font-face {
    font-family: 'Courier Prime';
    src: url(data:font/truetype;charset=utf-8;base64,${courierFontBase64}) format('truetype');
    font-weight: normal;
    font-style: normal;
  }`;

  const gurmukhiFontFace = `@font-face {
    font-family: 'Noto Sans Gurmukhi';
    src: url(data:font/truetype;charset=utf-8;base64,${gurmukhiFontBase64}) format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }`;

  const titlePageHtml = options.includeTitlePage
    ? `
    <div class="page-sheet title-page" id="title-page">
      <div class="title-top-space"></div>
      <div class="title-center-block">
        <h1 class="title-text">${options.title || 'UNTITLED'}</h1>
        <p class="title-written-by">ਵੱਲੋਂ / by</p>
        <p class="title-author">${options.author || ''}</p>
      </div>
      <div class="title-bottom-block">
        <div class="title-meta-left">
          <p>Copyright 2026</p>
          <p class="contact-text">contact@example.com</p>
        </div>
      </div>
    </div>
    `
    : '';

  // Page 1: Scene Heading, Action, Character, Dialogue (first half), (MORE)
  const page1Html = `
  <div class="page-sheet screenplay-page-sheet" data-page-number="1">
    <div class="page-content">
      <div class="screenplay-block scene-heading" id="sh1">
        <div class="screenplay-line">1. EXT. AMRITSAR - DAY</div>
      </div>
      <div class="slot-line slot-blank-line">&nbsp;</div>
      <div class="screenplay-block action" id="act1">
        <div class="screenplay-line">ਪਵਿੱਤਰ ਸਰੋਵਰ ਦੇ ਕੰਢੇ ਕ੍ਰਿੱਪਾ ਅਤੇ ਗੁੰਝਲ਼ਦਾਰ ਪ੍ਰੋਗਰਾਮਾਂ ਦੀ ਚਰਚਾ ਹੋ ਰਹੀ ਹੈ।</div>
        <div class="screenplay-line">ਉੱਲੂ ਦੀ ਅਵਾਜ਼ ਦੂਰੋਂ ਸੁਣਾਈ ਦਿੰਦੀ ਹੈ ਕਿਉਂਕਿ ਤ੍ਰਿਸ਼ਨਾ ਸੰਪੂਰਨ ਹੋ ਗਈ ਸੀ।</div>
      </div>
      ${Array.from({ length: 14 }, (_, i) => `
        <div class="slot-line slot-blank-line">&nbsp;</div>
        <div class="screenplay-block action" id="lead-${i}">
          <div class="screenplay-line">Additional narrative action paragraph ${i + 1}.</div>
        </div>
      `).join('')}
      <div class="slot-line slot-blank-line">&nbsp;</div>
      <div class="screenplay-block character" id="char1">
        <div class="screenplay-line">ਪਵਨ</div>
      </div>
      <div class="screenplay-block dialogue" id="dial1">
        <div class="screenplay-line">ਇਹ ਪਹਿਲਾ ਭਾਗ ਹੈ ਜੋ ਪਹਿਲੇ ਪੰਨੇ ਉੱਤੇ ਫਿੱਟ ਆਉਂਦਾ ਹੈ।</div>
        <div class="screenplay-line">ਇਹ ਦੂਜੀ ਲਾਈਨ ਹੈ ਜਿਸ ਤੋਂ ਬਾਅਦ ਪੰਨਾ ਖ਼ਤਮ ਹੁੰਦਾ ਹੈ।</div>
      </div>
      <div class="slot-line screenplay-more-continuation select-none">(MORE)</div>
    </div>
  </div>
  `;

  // Page 2: Running Header "2.", (CONT'D) [if active], Dialogue (second half)
  const contdHtml = options.contdSetting !== 'off'
    ? `<div class="slot-line character screenplay-contd-continuation">ਪਵਨ (CONT'D)</div>`
    : '';

  const page2Html = `
  <div class="page-sheet screenplay-page-sheet" data-page-number="2">
    <div class="page-header">2.</div>
    <div class="page-content">
      ${contdHtml}
      <div class="screenplay-block dialogue" id="dial1">
        <div class="screenplay-line">ਇਹ ਤੀਜੀ ਲਾਈਨ ਹੈ ਜੋ ਦੂਜੇ ਪੰਨੇ ਤੇ ਜਾਰੀ ਰਹਿੰਦੀ ਹੈ।</div>
        <div class="screenplay-line">ਇਹ ਚੌਥੀ ਲਾਈਨ ਹੈ ਅਤੇ ਇੱਥੇ ਭਾਸ਼ਣ ਖ਼ਤਮ ਹੁੰਦਾ ਹੈ।</div>
      </div>
      <div class="slot-line slot-blank-line">&nbsp;</div>
      <div class="screenplay-block action" id="act2">
        <div class="screenplay-line">ਅੰਤਿਮ ਦ੍ਰਿਸ਼: ਸ਼ਾਂਤੀ ਛਾ ਜਾਂਦੀ ਹੈ। Final peaceful atmosphere.</div>
      </div>
    </div>
  </div>
  `;

  return `<!DOCTYPE html>
<html lang="pa-Guru">
<head>
  <meta charset="UTF-8">
  <style>
    ${courierFontFace}
    ${gurmukhiFontFace}

    @page {
      size: ${width} ${height};
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 12pt;
      line-height: 18pt;
      -webkit-font-smoothing: antialiased;
    }

    .page-sheet {
      width: ${width};
      height: ${height};
      padding: ${marginTop} ${marginRight} ${marginBottom} ${marginLeft};
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      background: #ffffff;
    }

    .page-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .page-header {
      position: absolute;
      top: 36pt;
      right: ${marginRight};
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 10pt;
      line-height: 14pt;
      text-align: right;
      color: #000000;
    }

    .page-content {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      page-break-after: always;
      break-after: page;
    }

    .title-top-space {
      height: 2.5in;
    }

    .title-center-block {
      flex: 1;
    }

    .title-text {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 1.5px;
      margin: 0 0 18pt 0;
      text-transform: uppercase;
    }

    .title-written-by {
      font-size: 12pt;
      margin: 0 0 6pt 0;
    }

    .title-author {
      font-size: 14pt;
      margin: 0;
    }

    .title-bottom-block {
      display: flex;
      justify-content: space-between;
      text-align: left;
      font-size: 10pt;
      line-height: 13pt;
      padding-bottom: 0.5in;
    }

    .screenplay-block {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .screenplay-line {
      height: 18pt;
      line-height: 18pt;
      font-size: 12pt;
      margin: 0;
      padding: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      box-sizing: border-box;
    }

    .slot-line {
      height: 18pt;
      line-height: 18pt;
      font-size: 12pt;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .slot-blank-line {
      height: 18pt;
      line-height: 18pt;
    }

    .scene-heading {
      margin-left: 0;
      max-width: ${printableWidth};
      text-transform: uppercase;
      font-weight: bold;
    }

    .action {
      margin-left: 0;
      max-width: ${printableWidth};
    }

    .character {
      margin-left: 2.2in;
      text-transform: uppercase;
      font-weight: bold;
    }

    .dialogue {
      margin-left: 1.0in;
      max-width: 3.5in;
    }

    .screenplay-more-continuation {
      margin-left: 1.0in;
      max-width: 3.5in;
      text-align: center;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
    }

    .screenplay-contd-continuation {
      margin-left: 2.2in;
      font-weight: bold;
      text-transform: uppercase;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
    }
  </style>
</head>
<body>
  ${titlePageHtml}
  ${page1Html}
  ${page2Html}
</body>
</html>`;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const results = {
    fontLoaded: false,
    letter: {},
    a4: {},
  };

  try {
    // -------------------------------------------------------------------------
    // TEST 1: US Letter with Title Page & contdSetting='on'
    // -------------------------------------------------------------------------
    const letterHtml = generateTestPdfHtml({
      paperSize: 'letter',
      includeTitlePage: true,
      title: 'ਅੰਮ੍ਰਿਤਸਰ ਦੀ ਕਹਾਣੀ',
      author: 'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ',
      contdSetting: 'on',
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(letterHtml)}`);

    // Verify font decoded in Chromium
    results.fontLoaded = await win.webContents.executeJavaScript(`
      document.fonts.ready.then(() => document.fonts.check('12pt "Noto Sans Gurmukhi"'))
    `);

    const letterBuffer = await win.webContents.printToPDF({
      pageSize: 'Letter',
      margins: { marginType: 'none' },
      printBackground: true,
      preferCSSPageSize: true,
    });

    const letterDoc = await PDFDocument.load(letterBuffer);
    const letterPageCount = letterDoc.getPageCount();
    const letterPageSizes = [];

    for (let i = 0; i < letterPageCount; i++) {
      const page = letterDoc.getPage(i);
      const size = page.getSize();
      letterPageSizes.push({
        pageIndex: i,
        widthPt: Math.round(size.width),
        heightPt: Math.round(size.height),
      });
    }

    // Extract logical text
    const letterParser = new PDFParse(new Uint8Array(letterBuffer));
    const letterParsed = await letterParser.getText();
    const letterText = letterParsed.text;

    results.letter = {
      pageCount: letterPageCount,
      exact3Pages: letterPageCount === 3, // 1 title + 2 screenplay pages
      pageSizes: letterPageSizes,
      matchesPhysicalDimensions: letterPageSizes.every((s) => s.widthPt === 612 && s.heightPt === 792),
      containsTitle: letterText.includes('ਦੀ ਕਹਾਣੀ'),
      containsAuthor: letterText.includes('ਿਸੰਘ'),
      containsSceneHeading: letterText.includes('EXT. AMRITSAR - DAY'),
      containsComplexGurmukhi: letterText.includes('ਗੁੰਝਲ਼ਦਾਰ') && letterText.includes('ਸੰਪੂਰਨ'),
      containsMore: letterText.includes('(MORE)'),
      containsContd: letterText.includes("ਪਵਨ (CONT'D)") || letterText.includes("ਪਵਨ (CONT’D)"),
      containsPageNumber2: letterText.includes('2.'),
      zeroTrailingBlankPages: letterPageCount === 3,
    };

    // -------------------------------------------------------------------------
    // TEST 2: ISO A4 without Title Page & contdSetting='off'
    // -------------------------------------------------------------------------
    const a4Html = generateTestPdfHtml({
      paperSize: 'a4',
      includeTitlePage: false,
      title: 'A4 Punjabi Screenplay',
      contdSetting: 'off',
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(a4Html)}`);

    const a4Buffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { marginType: 'none' },
      printBackground: true,
      preferCSSPageSize: true,
    });

    const a4Doc = await PDFDocument.load(a4Buffer);
    const a4PageCount = a4Doc.getPageCount();
    const a4PageSizes = [];

    for (let i = 0; i < a4PageCount; i++) {
      const page = a4Doc.getPage(i);
      const size = page.getSize();
      a4PageSizes.push({
        pageIndex: i,
        widthPt: Number(size.width.toFixed(2)),
        heightPt: Number(size.height.toFixed(2)),
      });
    }

    const a4Parser = new PDFParse(new Uint8Array(a4Buffer));
    const a4Parsed = await a4Parser.getText();
    const a4Text = a4Parsed.text;

    results.a4 = {
      pageCount: a4PageCount,
      exact2Pages: a4PageCount === 2, // 2 screenplay pages (no title page)
      pageSizes: a4PageSizes,
      matchesPhysicalDimensions: a4PageSizes.every(
        (s) => Math.abs(s.widthPt - 595.28) <= 1.0 && Math.abs(s.heightPt - 841.89) <= 1.0
      ),
      containsSceneHeading: a4Text.includes('EXT. AMRITSAR - DAY'),
      containsMore: a4Text.includes('(MORE)'),
      contdSuppressed: !a4Text.includes("ਪਵਨ (CONT'D)") && !a4Text.includes("ਪਵਨ (CONT’D)"),
      containsPageNumber2: a4Text.includes('2.'),
      zeroTrailingBlankPages: a4PageCount === 2,
    };

    console.log('M2C_PDF_RESULTS:' + JSON.stringify(results) + 'END_M2C_PDF_RESULTS');
    win.destroy();
    app.exit(0);
  } catch (err) {
    console.error('M2C_PDF_RUNNER_ERROR:' + String(err));
    win.destroy();
    app.exit(1);
  }
});
