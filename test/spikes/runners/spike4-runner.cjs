const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('@cantoo/pdf-lib');

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

  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
  const fontBase64 = fs.readFileSync(fontPath).toString('base64');

  function createScreenplayHTML(paperSize) {
    const isLetter = paperSize === 'letter';
    const pageSizeCSS = isLetter ? '8.5in 11in' : '210mm 297mm';
    const sheetWidth = isLetter ? '8.5in' : '210mm';
    const sheetHeight = isLetter ? '11in' : '297mm';
    const topMargin = '72pt';
    const bottomMargin = '72pt';
    const leftMargin = '108pt'; // 1.5 in gutter
    const rightMargin = '72pt';

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: ${pageSizeCSS};
          margin: 0;
        }
        @font-face {
          font-family: 'Noto Sans Gurmukhi';
          src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-family: 'Noto Sans Gurmukhi', 'Courier Prime', monospace;
          font-size: 12pt;
          line-height: 18pt;
        }
        .page-sheet {
          width: ${sheetWidth};
          height: ${sheetHeight};
          padding: ${topMargin} ${rightMargin} ${bottomMargin} ${leftMargin};
          page-break-after: always;
          break-after: page;
          position: relative;
          overflow: hidden;
        }
        .page-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        .page-number {
          position: absolute;
          top: 36pt;
          right: 72pt;
          font-size: 10pt;
        }
        .scene-heading {
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 18pt;
        }
        .action {
          margin-bottom: 18pt;
          text-align: left;
        }
        .character {
          margin-left: 144pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 18pt;
        }
        .dialogue {
          margin-left: 72pt;
          margin-right: 72pt;
          margin-bottom: 18pt;
        }
      </style>
    </head>
    <body>
      <!-- Page 1 -->
      <div class="page-sheet" id="page-1">
        <div class="scene-heading">1. ਦ੍ਰਿਸ਼ 1. ਅੰਮ੍ਰਿਤਸਰ ਹਵੇਲੀ - ਰਾਤ</div>
        <div class="action">ਹਵੇਲੀ ਦੇ ਵੱਡੇ ਦਰਵਾਜ਼ੇ ਅੱਗੇ ਤੇਜ਼ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ। ਪੁਰਾਣੀ ਲਾਲਟੈਣ ਦੀ ਰੌਸ਼ਨੀ ਕੰਧਾਂ ਉੱਤੇ ਨੱਚ ਰਹੀ ਹੈ। ਸੁਰਜੀਤ ਸਿੰਘ ਬਰਾਂਡੇ ਵਿੱਚ ਖੜ੍ਹਾ ਬਾਹਰ ਹਨੇਰੇ ਵੱਲ ਦੇਖ ਰਿਹਾ ਹੈ।</div>
        <div class="character">ਸੁਰਜੀਤ</div>
        <div class="dialogue">ਕ੍ਰਿੱਪਾ ਕਰਕੇ ਦਰਵਾਜ਼ਾ ਬੰਦ ਕਰ ਦਿਓ। ਤੂਫ਼ਾਨ ਹੋਰ ਤੇਜ਼ ਹੋ ਰਿਹਾ ਹੈ।</div>
        <div class="action">ਗੁਰਮੁਖ ਲਾਲਟੈਣ ਲੈ ਕੇ ਕਮਰੇ ਵਿੱਚ ਦਾਖ਼ਲ ਹੁੰਦਾ ਹੈ। ਉਸਦੇ ਚਿਹਰੇ ਉੱਤੇ ਚਿੰਤਾ ਦੇ ਭਾਵ ਹਨ।</div>
      </div>

      <!-- Page 2 -->
      <div class="page-sheet" id="page-2">
        <div class="page-number">2.</div>
        <div class="scene-heading">2. ਦ੍ਰਿਸ਼ 2. ਅੰਦਰ. ਬੈਠਕ - ਲਗਾਤਾਰ</div>
        <div class="action">ਕਮਰੇ ਵਿੱਚ ਪੁਰਾਣੀਆਂ ਕਿਤਾਬਾਂ ਅਤੇ ਦਸਤਾਵੇਜ਼ ਮੇਜ਼ ਉੱਤੇ ਖਿਲਰੇ ਪਏ ਹਨ। ਗੁਰਮੁਖ ਮੇਜ਼ ਕੋਲ ਆ ਕੇ ਖੜ੍ਹਦਾ ਹੈ।</div>
        <div class="character">ਗੁਰਮੁਖ</div>
        <div class="dialogue">ਸ਼ਹਿਰ ਦੇ ਸਾਰੇ ਰਸਤੇ ਬੰਦ ਹੋ ਚੁੱਕੇ ਨੇ। ਟੈਲੀਫ਼ੋਨ ਦੀਆਂ ਤਾਰਾਂ ਵੀ ਟੁੱਟ ਗਈਆਂ ਹਨ। ਸਾਡਾ ਸੰਪਰਕ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕੱਟ ਚੁੱਕਾ ਹੈ।</div>
        <div class="character">ਸੁਰਜੀਤ</div>
        <div class="dialogue">ਸਾਨੂੰ ਸਵੇਰ ਹੋਣ ਤੱਕ ਇੱਥੇ ਹੀ ਰੁਕਣਾ ਪਵੇਗਾ।</div>
      </div>

      <!-- Page 3 -->
      <div class="page-sheet" id="page-3">
        <div class="page-number">3.</div>
        <div class="scene-heading">3. ਦ੍ਰਿਸ਼ 3. ਬਾਹਰ. ਖੇਤ - ਸਵੇਰ</div>
        <div class="action">ਸੂਰਜ ਦੀ ਪਹਿਲੀ ਕਿਰਨ ਖੇਤਾਂ ਉੱਤੇ ਪੈਂਦੀ ਹੈ। ਮੀਂਹ ਰੁਕ ਚੁੱਕਾ ਹੈ ਪਰ ਹਵਾ ਵਿੱਚ ਹਾਲੇ ਵੀ ਠੰਢ ਹੈ। ਦੂਰੋਂ ਇੱਕ ਟਰੈਕਟਰ ਦੀ ਆਵਾਜ਼ ਸੁਣਾਈ ਦਿੰਦੀ ਹੈ।</div>
        <div class="action">ਪਿੰਡ ਦੇ ਲੋਕ ਹੌਲੀ-ਹੌਲੀ ਆਪਣੇ ਘਰਾਂ ਤੋਂ ਬਾਹਰ ਆ ਰਹੇ ਹਨ।</div>
        <div class="character">ਬਲਦੇਵ</div>
        <div class="dialogue">ਨਹਿਰ ਦਾ ਪਾਣੀ ਪੁਲ ਦੇ ਉੱਪਰੋਂ ਲੰਘ ਰਿਹਾ ਹੈ। ਕੋਈ ਵੀ ਗੱਡੀ ਨਹੀਂ ਲੰਘ ਸਕਦੀ।</div>
      </div>

      <!-- Page 4 -->
      <div class="page-sheet" id="page-4">
        <div class="page-number">4.</div>
        <div class="scene-heading">4. ਦ੍ਰਿਸ਼ 4. ਅੰਦਰ. ਪੰਚਾਇਤ ਘਰ - ਦਿਨ</div>
        <div class="action">ਪੰਚਾਇਤ ਘਰ ਵਿੱਚ ਭਾਰੀ ਇਕੱਠ ਹੈ। ਸਰਪੰਚ ਮੇਜ਼ ਦੇ ਮੁੱਖ ਪਾਸੇ ਬੈਠਾ ਹੈ। ਸਾਰੇ ਲੋਕ ਗੰਭੀਰ ਚਰਚਾ ਵਿੱਚ ਰੁੱਝੇ ਹੋਏ ਹਨ।</div>
        <div class="character">ਸਰਪੰਚ</div>
        <div class="dialogue">ਸਾਨੂੰ ਸਾਰਿਆਂ ਨੂੰ ਮਿਲ ਕੇ ਕੰਮ ਕਰਨਾ ਪਵੇਗਾ। ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਬੱਚਿਆਂ ਅਤੇ ਬਜ਼ੁਰਗਾਂ ਲਈ ਭੋਜਨ ਦਾ ਪ੍ਰਬੰਧ ਕਰਨਾ ਜ਼ਰੂਰੀ ਹੈ।</div>
        <div class="action">ਸਾਰੇ ਲੋਕ ਸਹਿਮਤੀ ਵਿੱਚ ਸਿਰ ਹਿਲਾਉਂਦੇ ਹਨ।</div>
      </div>

      <!-- Page 5 -->
      <div class="page-sheet" id="page-5">
        <div class="page-number">5.</div>
        <div class="scene-heading">5. ਦ੍ਰਿਸ਼ 5. ਬਾਹਰ. ਮੁੱਖ ਸੜਕ - ਸ਼ਾਮ</div>
        <div class="action">ਸ਼ਾਮ ਢਲ ਰਹੀ ਹੈ। ਮਦਦ ਵਾਲੀਆਂ ਗੱਡੀਆਂ ਪਿੰਡ ਵੱਲ ਆਉਂਦੀਆਂ ਦਿਖਾਈ ਦਿੰਦੀਆਂ ਹਨ। ਲੋਕਾਂ ਦੇ ਚਿਹਰਿਆਂ ਉੱਤੇ ਰਾਹਤ ਦੀ ਝਲਕ ਹੈ।</div>
        <div class="character">ਸੁਰਜੀਤ</div>
        <div class="dialogue">ਅੰਤ ਵਿੱਚ ਸਭ ਕੁਝ ਠੀਕ ਹੋ ਗਿਆ। ਇੱਕ ਨਵੀਂ ਸ਼ੁਰੂਆਤ ਸਾਡੇ ਸਾਹਮਣੇ ਹੈ।</div>
        <div class="action">ਕੈਮਰਾ ਹੌਲੀ-ਹੌਲੀ ਪਿੱਛੇ ਹਟਦਾ ਹੈ। ਦ੍ਰਿਸ਼ ਧੁੰਦਲਾ ਹੋ ਜਾਂਦਾ ਹੈ।</div>
      </div>
    </body>
    </html>`;
  }

  try {
    const results = {};

    // 1. TEST US LETTER PDF
    const letterHTML = createScreenplayHTML('letter');
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(letterHTML)}`);
    // Wait for fonts to be ready
    await win.webContents.executeJavaScript('document.fonts.ready');

    const letterPdfBuffer = await win.webContents.printToPDF({
      margins: { marginType: 'none' },
      pageSize: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    });

    const letterDoc = await PDFDocument.load(letterPdfBuffer);
    const letterPages = letterDoc.getPages();
    const letterPageCount = letterPages.length;
    const letterSizes = letterPages.map((p, idx) => {
      const sz = p.getSize();
      return {
        page: idx + 1,
        widthPt: Number(sz.width.toFixed(2)),
        heightPt: Number(sz.height.toFixed(2)),
      };
    });

    results.letter = {
      pageCount: letterPageCount,
      exact5Pages: letterPageCount === 5,
      zeroTrailingBlankPages: letterPageCount === 5,
      pageSizes: letterSizes,
      matchesPhysicalDimensions: letterSizes.every(
        (sz) => Math.abs(sz.widthPt - 612) <= 0.5 && Math.abs(sz.heightPt - 792) <= 0.5
      ),
    };

    // 2. TEST A4 PDF
    const a4HTML = createScreenplayHTML('a4');
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(a4HTML)}`);
    await win.webContents.executeJavaScript('document.fonts.ready');

    const a4PdfBuffer = await win.webContents.printToPDF({
      margins: { marginType: 'none' },
      pageSize: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    const a4Doc = await PDFDocument.load(a4PdfBuffer);
    const a4Pages = a4Doc.getPages();
    const a4PageCount = a4Pages.length;
    const a4Sizes = a4Pages.map((p, idx) => {
      const sz = p.getSize();
      return {
        page: idx + 1,
        widthPt: Number(sz.width.toFixed(2)),
        heightPt: Number(sz.height.toFixed(2)),
      };
    });

    results.a4 = {
      pageCount: a4PageCount,
      exact5Pages: a4PageCount === 5,
      zeroTrailingBlankPages: a4PageCount === 5,
      pageSizes: a4Sizes,
      // A4 physical dimensions in points: 210mm = 595.276pt, 297mm = 841.89pt
      matchesPhysicalDimensions: a4Sizes.every(
        (sz) => Math.abs(sz.widthPt - 595.28) <= 1.0 && Math.abs(sz.heightPt - 841.89) <= 1.0
      ),
    };

    // 3. TEST FOR ACCIDENTAL TRAILING BREAK (Proving root cause of trailing blank pages)
    const brokenHTML = letterHTML.replace(
      '.page-sheet:last-child {\\n          page-break-after: auto;\\n          break-after: auto;\\n        }',
      '/* missing last-child override causes trailing blank page */'
    );
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(brokenHTML)}`);
    await win.webContents.executeJavaScript('document.fonts.ready');
    const brokenPdfBuffer = await win.webContents.printToPDF({
      margins: { marginType: 'none' },
      pageSize: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    });
    const brokenDoc = await PDFDocument.load(brokenPdfBuffer);
    results.trailingBreakRootCause = {
      uncontrolledPageCount: brokenDoc.getPages().length,
      provesTrailingBreakRisk: brokenDoc.getPages().length > 5,
    };

    process.stdout.write('SPIKE4_RESULTS:' + JSON.stringify(results) + 'END_SPIKE4_RESULTS\n');
    app.exit(0);
  } catch (err) {
    process.stderr.write('SPIKE4_ERROR:' + String(err) + '\n');
    app.exit(1);
  }
});
